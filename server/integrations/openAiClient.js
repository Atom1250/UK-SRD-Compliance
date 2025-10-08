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

let cachedClient = null;
let OpenAIClass = null;
let responder = null;

const loadOpenAI = async () => {
  if (OpenAIClass) {
    return OpenAIClass;
  }

  try {
    const mod = await import("openai");
    OpenAIClass = mod?.default ?? mod.OpenAI ?? mod;
    return OpenAIClass;
  } catch (error) {
    throw Object.assign(new Error("The openai package is not installed"), {
      status: 500
    });
  }
};

const getClient = async () => {
  if (cachedClient) {
    return cachedClient;
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw Object.assign(new Error("OPENAI_API_KEY is not configured"), {
      status: 500
    });
  }

  const OpenAIConstructor = await loadOpenAI();
  cachedClient = new OpenAIConstructor({ apiKey });
  return cachedClient;
};

const parseContent = (choice) => {
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
};

const coerceMessageText = (value) => {
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
};

const getErrorStatusCode = (error) => {
  if (!error) return undefined;
  const possible = [
    error.status,
    error.statusCode,
    error.code,
    error?.response?.status,
    error?.response?.statusCode,
    error?.cause?.status,
    error?.cause?.statusCode
  ];
  return possible.map(Number).find((value) => Number.isInteger(value)) ?? undefined;
};

const truncateText = (text, length = 200) => {
  if (!text) return "";
  if (text.length <= length) {
    return text;
  }
  return `${text.slice(0, Math.max(0, length - 1))}…`;
};

const fallbackComplianceStub = async ({ messages = [] }, { status } = {}) => {
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
};

const parseStrictFlag = (value) => {
  return String(value ?? "")
    .trim()
    .toLowerCase();
};

const truthyStrictValues = new Set(["1", "true", "yes", "on"]);

function shouldFallbackToStubOnUnauthorized(error, env = process.env) {
  const status = getErrorStatusCode(error);
  if (status !== 401) {
    return false;
  }

  const strict = parseStrictFlag(env.OPENAI_STRICT);
  const strictEnabled = truthyStrictValues.has(strict);
  return !strictEnabled;
}

export { shouldFallbackToStubOnUnauthorized };

const defaultResponder = async ({ messages, model = DEFAULT_MODEL }) => {
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
};

export const setComplianceResponder = (fn) => {
  responder = typeof fn === "function" ? fn : null;
};

export const callComplianceResponder = async (payload) => {
  const handler = responder ?? defaultResponder;

  try {
    return await handler(payload);
  } catch (error) {
    if (shouldFallbackToStubOnUnauthorized(error)) {
      const status = getErrorStatusCode(error);
      return fallbackComplianceStub(payload, { status });
    }
    throw error;
  }
};

