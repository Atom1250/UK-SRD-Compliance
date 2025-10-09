const DEFAULT_MODEL = process.env.OPENAI_MODEL ?? "gpt-4o-mini";

const COMPLIANCE_SYSTEM_PROMPT = `You are an FCA Consumer Duty compliance co-pilot.
- Answer as the assistant for a UK sustainability preference pathway meeting.
- Be transparent about guardrails and note when adviser review is required.
- Keep the client on topic with SDR, ESG, and suitability requirements.
- Always return valid JSON matching the provided schema.`;

const complianceSchema = {
  name: "compliance_response",
  schema: {
    type: "object",
    additionalProperties: false,
    required: ["reply"],
    properties: {
      reply: {
        type: "string",
        description: "Natural language response to the client's free-form query."
      },
      compliance: {
        type: "object",
        additionalProperties: false,
        properties: {
          educational_requests: {
            type: "array",
            items: { type: "string" }
          },
          extra_questions: {
            type: "array",
            items: { type: "string" }
          },
          notes: {
            type: "array",
            items: { type: "string" }
          }
        }
      }
    }
  }
};

const TRUTHY_FLAGS = new Set(["1", "true", "yes", "on"]);

let cachedClient;
let OpenAIConstructor;
let clientFactory;
let customResponder;

async function loadOpenAIClass() {
  if (OpenAIConstructor) {
    return OpenAIConstructor;
  }

  try {
    const mod = await import("openai");
    OpenAIConstructor = mod?.default ?? mod.OpenAI ?? mod;
    return OpenAIConstructor;
  } catch (error) {
    const isModuleNotFound =
      error?.code === "ERR_MODULE_NOT_FOUND" ||
      /Cannot find module 'openai'/i.test(error?.message || "");

    if (!isModuleNotFound) {
      throw error;
    }

    const err = new Error(
      "The openai package is not installed. Run `npm install` from the project root to add it to node_modules."
    );
    err.status = 500;
    err.code = "OPENAI_NOT_INSTALLED";
    throw err;
  }
}

export function setOpenAIClientFactory(factory) {
  clientFactory = typeof factory === "function" ? factory : undefined;
  cachedClient = undefined;
}

export function resetOpenAIClientCache() {
  cachedClient = undefined;
}

async function getClient() {
  if (cachedClient) {
    return cachedClient;
  }

  if (clientFactory) {
    cachedClient = await clientFactory();
    if (!cachedClient) {
      throw new Error("Mock OpenAI client factory did not return a client instance");
    }
    return cachedClient;
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw Object.assign(new Error("OPENAI_API_KEY is not configured"), {
      status: 500
    });
  }

  const OpenAIClass = await loadOpenAIClass();
  cachedClient = new OpenAIClass({ apiKey });
  return cachedClient;
}

function parseContent(choice) {
  const content = choice?.message?.content;
  if (typeof content === "string") {
    return content;
  }
  if (Array.isArray(content)) {
    return content
      .map((part) => (typeof part?.text === "string" ? part.text : ""))
      .join("");
  }
  return "";
}

function coerceMessageText(value) {
  if (typeof value === "string") {
    return value;
  }
  if (Array.isArray(value)) {
    return value
      .map((part) => {
        if (typeof part === "string") {
          return part;
        }
        if (typeof part?.text === "string") {
          return part.text;
        }
        return "";
      })
      .join("");
  }
  if (value && typeof value === "object" && typeof value.text === "string") {
    return value.text;
  }
  return "";
}

function getErrorStatusCode(error) {
  if (!error) {
    return undefined;
  }

  const candidates = [
    error.status,
    error.statusCode,
    error.code,
    error?.response?.status,
    error?.response?.statusCode,
    error?.cause?.status,
    error?.cause?.statusCode
  ];

  return candidates.map(Number).find((value) => Number.isInteger(value));
}

function truncateText(text, length = 200) {
  if (!text) {
    return "";
  }

  if (text.length <= length) {
    return text;
  }

  return `${text.slice(0, Math.max(0, length - 1))}…`;
}

const stubGuidanceLibrary = [
  {
    test: /pathway/i,
    build: () =>
      "here's what we can confirm right now: your current sustainability pathway remains as recorded. Any updates will be reviewed with you before changes are made."
  },
  {
    test: /(cost|fee)/i,
    build: () =>
      "we've noted your question about charges. We'll confirm fee calculations against the disclosure pack and respond once the live assistant is available."
  },
  {
    test: /(risk|atr|capacity)/i,
    build: () =>
      "the documented risk profile and capacity for loss stay unchanged. We'll revisit suitability if you flag new information when the adviser follows up."
  },
  {
    test: /(esg|sustainab|impact|sdg)/i,
    build: () =>
      "the ESG preferences you've captured so far remain valid. We'll provide any extra disclosures about fund coverage during the adviser review."
  }
];

function selectStubGuidance(summary) {
  if (!summary) {
    return "I've recorded this for adviser review and will provide a detailed answer once the live assistant is back online.";
  }

  const entry = stubGuidanceLibrary.find((item) => item.test.test(summary));

  if (entry) {
    return entry.build(summary);
  }

  return `I've logged your question about "${summary}" and the adviser team will respond with a full answer shortly.`;
}

function buildComplianceStub(
  { messages = [] } = {},
  { note, replyPrefix, status, guidanceBuilder } = {}
) {
  const lastUserMessage = [...messages]
    .reverse()
    .find((message) => message?.role === "user");
  const rawContent = coerceMessageText(lastUserMessage?.content);
  const trimmed = rawContent.trim().replace(/\s+/g, " ");
  const summary = truncateText(trimmed);

  const noteSuffix = status ? ` (status ${status})` : "";
  const complianceNotes = note ? [`${note}${noteSuffix}`] : [];

  const educationalRequests = summary
    ? [`Free-form question logged for adviser review: ${summary}`]
    : [];

  const compliance = {
    educational_requests: educationalRequests,
    notes: complianceNotes
  };

  const guidance =
    typeof guidanceBuilder === "function"
      ? guidanceBuilder({ summary, raw: trimmed })
      : selectStubGuidance(summary);

  const normalisedPrefix = replyPrefix ? `${replyPrefix.trim()} ` : "";
  const reply = `${normalisedPrefix}${guidance}`.trim();

  return { reply, compliance };
}

async function fallbackComplianceStub({ messages = [] } = {}, { status } = {}) {
  return buildComplianceStub(
    { messages },
    {
      status,
      note: "Fallback compliance stub used after an OpenAI authorization failure",
      replyPrefix:
        "I couldn't reach the compliance assistant due to an authorization error, but"
    }
  );
}

function parseStrictFlag(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase();
}

function isStubEnabled(env = process.env) {
  const strict = parseStrictFlag(env?.OPENAI_STUB);
  return TRUTHY_FLAGS.has(strict);
}

export function shouldFallbackToStubOnUnauthorized(error, env = process.env) {
  const status = getErrorStatusCode(error);
  if (status !== 401) {
    return false;
  }

  const strict = parseStrictFlag(env?.OPENAI_STRICT);
  const strictEnabled = TRUTHY_FLAGS.has(strict);
  return !strictEnabled;
}

async function defaultResponder({ messages, model = DEFAULT_MODEL } = {}) {
  if (isStubEnabled()) {
    return buildComplianceStub(
      { messages },
      {
        note: "Compliance stub responder used because OPENAI_STUB is enabled",
        replyPrefix:
          "The compliance assistant stub is active while the OpenAI integration is disabled, so",
        guidanceBuilder: ({ summary }) =>
          `${selectStubGuidance(summary)} If you want live answers, set an OPENAI_API_KEY and restart the server.`
      }
    );
  }

  try {
    const client = await getClient();
    const completion = await client.chat.completions.create({
      model,
      messages,
      response_format: { type: "json_schema", json_schema: complianceSchema },
      temperature: 0.2
    });

    const content = parseContent(completion?.choices?.[0]);
    if (!content) {
      throw new Error("OpenAI returned an empty response");
    }

    return JSON.parse(content);
  } catch (error) {
    if (error?.code === "OPENAI_NOT_INSTALLED") {
      return buildComplianceStub(
        { messages },
        {
          note: "Compliance stub responder used because the OpenAI SDK is not installed",
          replyPrefix:
            "The compliance assistant is running in offline mode because the OpenAI SDK isn't available. Run `npm install` and restart the server to enable live answers. In the meantime,",
          guidanceBuilder: ({ summary }) => selectStubGuidance(summary)
        }
      );
    }

    if (shouldFallbackToStubOnUnauthorized(error)) {
      const status = getErrorStatusCode(error);
      return fallbackComplianceStub({ messages }, { status });
    }

    if (getErrorStatusCode(error) === 401) {
      const err = new Error(
        "OpenAI rejected the compliance request. Check OPENAI_API_KEY or enable the stub via OPENAI_STUB=true."
      );
      err.status = 502;
      throw err;
    }

    if (error instanceof SyntaxError) {
      throw new Error("OpenAI returned invalid JSON payload");
    }

    throw error;
  }
}

export function setComplianceResponder(fn) {
  customResponder = typeof fn === "function" ? fn : undefined;
}

export async function callComplianceResponder(payload) {
  const handler = customResponder ?? defaultResponder;
  try {
    return await handler(payload);
  } catch (error) {
    if (shouldFallbackToStubOnUnauthorized(error)) {
      const status = getErrorStatusCode(error);
      return fallbackComplianceStub(payload, { status });
    }
    throw error;
  }
}

const openAiClient = {
  COMPLIANCE_SYSTEM_PROMPT,
  shouldFallbackToStubOnUnauthorized,
  setComplianceResponder,
  callComplianceResponder
};

export default openAiClient;
