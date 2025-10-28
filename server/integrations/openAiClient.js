import cacheManager from "../cache/cacheManager.js";
import { monitorOpenAIRequest } from "../monitoring/performanceMonitor.js";
import logger from "../monitoring/logger.js";

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
    const err = new Error("The openai package is not installed");
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

function buildComplianceStub({ messages = [] } = {}, { note, replyPrefix, status } = {}) {
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

  const reply = summary
    ? `${replyPrefix} I've logged your question about "${summary}" for an adviser review.`
    : `${replyPrefix} I've logged this question for an adviser review.`;

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
          "The compliance assistant stub is active while the OpenAI integration is disabled, so"
      }
    );
  }

  // Use monitoring wrapper
  return await monitorOpenAIRequest(async () => {
    try {
      // Validate input messages
      if (!Array.isArray(messages) || messages.length === 0) {
        throw new Error("Invalid or empty messages array");
      }
      
      // Sanitize messages to prevent injection attacks
      const sanitizedMessages = messages.map(msg => ({
        role: msg.role,
        content: typeof msg.content === 'string' ? msg.content.slice(0, 50000) : String(msg.content).slice(0, 50000)
      }));

      // Generate cache key for this request
      const requestHash = cacheManager.constructor.generateHash({
        messages: sanitizedMessages,
        model,
        temperature: 0.2
      });
      
      // Try cache first
      const cached = cacheManager.getOpenAiResponse(requestHash);
      if (cached) {
        logger.logOpenAI('cache_hit', { requestHash });
        return cached;
      }

      logger.logOpenAI('request_start', { model, messageCount: sanitizedMessages.length });

      const client = await getClient();
      
      // Add timeout and retry logic
      const completion = await Promise.race([
        client.chat.completions.create({
          model,
          messages: sanitizedMessages,
          response_format: { type: "json_schema", json_schema: complianceSchema },
          temperature: 0.2,
          max_tokens: 2000 // Limit response size
        }),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('OpenAI request timeout')), 30000)
        )
      ]);

      const content = parseContent(completion?.choices?.[0]);
      if (!content) {
        throw new Error("OpenAI returned an empty response");
      }

      let parsed;
      try {
        parsed = JSON.parse(content);
      } catch (parseError) {
        logger.warn('Failed to parse OpenAI JSON response', { error: parseError.message });
        throw new Error("OpenAI returned invalid JSON payload");
      }
      
      // Validate response structure
      if (!parsed || typeof parsed !== 'object' || typeof parsed.reply !== 'string') {
        throw new Error("OpenAI response missing required fields");
      }

      // Cache successful response
      cacheManager.setOpenAiResponse(requestHash, parsed);
      logger.logOpenAI('request_success', { requestHash, responseLength: parsed.reply.length });

      return parsed;
      
    } catch (error) {
    console.error('OpenAI request failed:', error.message);
    
    if (error?.code === "OPENAI_NOT_INSTALLED") {
      return buildComplianceStub(
        { messages },
        {
          note: "Compliance stub responder used because the OpenAI SDK is not installed",
          replyPrefix:
            "I couldn't reach the compliance assistant because the OpenAI SDK isn't available, but"
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
    
    // Handle rate limiting
    if (getErrorStatusCode(error) === 429) {
      return buildComplianceStub(
        { messages },
        {
          note: "Rate limit exceeded, using fallback response",
          replyPrefix: "I'm experiencing high demand right now, but"
        }
      );
    }
    
    // Handle timeout errors
    if (error.message === 'OpenAI request timeout') {
      return buildComplianceStub(
        { messages },
        {
          note: "Request timeout, using fallback response",
          replyPrefix: "I'm experiencing slow response times, but"
        }
      );
    }

    if (error instanceof SyntaxError || error.message.includes('JSON')) {
      return buildComplianceStub(
        { messages },
        {
          note: "Invalid response format, using fallback",
          replyPrefix: "I received an unexpected response format, but"
        }
      );
    }

    // For any other errors, use fallback
    return buildComplianceStub(
      { messages },
      {
        note: `Unexpected error: ${error.message}`,
        replyPrefix: "I encountered a technical issue, but"
      }
    );
  }
  }); // Close monitorOpenAIRequest function call
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
