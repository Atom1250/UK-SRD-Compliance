const DEFAULT_MODEL = process.env.OPENAI_MODEL ?? "gpt-4o-mini";

export const COMPLIANCE_SYSTEM_PROMPT = `You are an FCA Consumer Duty compliance co-pilot.
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
        description:
          "Natural language response to the client's free-form query."
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

let cachedClient;
let OpenAIConstructor;
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
    throw Object.assign(new Error("The openai package is not installed"), {
      status: 500
    });
  }
}

async function getClient() {
  if (cachedClient) {
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

async function fallbackComplianceStub({ messages = [] } = {}, { status } = {}) {
  const lastUserMessage = [...messages]
    .reverse()
    .find((message) => message?.role === "user");
  const rawContent = coerceMessageText(lastUserMessage?.content);
  const trimmed = rawContent.trim().replace(/\s+/g, " ");
  const summary = truncateText(trimmed);

  const noteSuffix = status ? ` (status ${status})` : "";
  const complianceNotes = [
    `Fallback compliance stub used after an OpenAI authorization failure${noteSuffix}.`
  ];

  const educationalRequests = summary
    ? [`Free-form question logged for adviser review: ${summary}`]
    : [];

  const compliance = {
    educational_requests: educationalRequests,
    notes: complianceNotes
  };

  const reply = summary
    ? `I couldn't reach the compliance assistant due to an authorization error, but I've logged your question about "${summary}" for an adviser review.`
    : "I couldn't reach the compliance assistant due to an authorization error, but I've logged this question for an adviser review.";

  return { reply, compliance };
}

function parseStrictFlag(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase();
}

const TRUTHY_STRICT_VALUES = new Set(["1", "true", "yes", "on"]);

export function shouldFallbackToStubOnUnauthorized(error, env = process.env) {
  const status = getErrorStatusCode(error);
  if (status !== 401) {
    return false;
  }

  const strict = parseStrictFlag(env?.OPENAI_STRICT);
  const strictEnabled = TRUTHY_STRICT_VALUES.has(strict);
  return !strictEnabled;
}

async function defaultResponder({ messages, model = DEFAULT_MODEL }) {
  const client = await getClient();
  const completion = await client.chat.completions.create({
    model,
    messages,
    response_format: { type: "json_schema", json_schema: complianceSchema },
    temperature: 0.2
  });

  const content = parseContent(completion.choices?.[0]);
  if (!content) {
    throw new Error("OpenAI returned an empty response");
  }

  try {
    return JSON.parse(content);
  } catch (error) {
    throw new Error("OpenAI returned invalid JSON payload");
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

