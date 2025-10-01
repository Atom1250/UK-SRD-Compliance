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

const STUB_FLAG_VALUES = new Set(["1", "true", "yes", "stub", "mock", "fake"]);

const shouldUseBuiltInStub = () => {
  if (responder) {
    return false;
  }

  const stubFlag = (process.env.OPENAI_STUB ?? process.env.OPENAI_MODE ?? "")
    .toString()
    .trim()
    .toLowerCase();
  if (stubFlag && STUB_FLAG_VALUES.has(stubFlag)) {
    return true;
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    const environment = (process.env.NODE_ENV ?? "").toLowerCase();
    return environment !== "production";
  }

  return /^(stub|test|fake|placeholder)$/i.test(apiKey.trim());
};

const extractLastUserMessage = (messages = []) => {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const entry = messages[index];
    if (entry && entry.role === "user" && typeof entry.content === "string") {
      return entry.content;
    }
  }
  return null;
};

const builtInStubResponder = async ({ messages } = {}) => {
  const prompt = extractLastUserMessage(Array.isArray(messages) ? messages : []);
  const replyParts = [
    "I’m running in local test mode so I can’t reach the compliance assistant right now.",
    prompt ? `You asked: "${prompt}".` : null,
    "Provide a valid OPENAI_API_KEY (or unset OPENAI_STUB) to enable live answers."
  ].filter(Boolean);

  return {
    reply: replyParts.join(" "),
    compliance: {
      notes: [
        "OpenAI compliance responder stub executed (no external API call)."
      ]
    }
  };
};

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

const defaultResponder = async ({ messages, model = DEFAULT_MODEL }) => {
  const client = await getClient();
  try {
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

    return JSON.parse(content);
  } catch (error) {
    if (error?.status === 401 || error?.statusCode === 401) {
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
};

export const setComplianceResponder = (fn) => {
  responder = typeof fn === "function" ? fn : null;
};

export const callComplianceResponder = async (payload) => {
  const handler = responder
    ? responder
    : shouldUseBuiltInStub()
      ? builtInStubResponder
      : defaultResponder;
  return handler(payload);
};

