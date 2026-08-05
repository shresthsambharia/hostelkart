import { GoogleGenerativeAI } from '@google/generative-ai';

let genAI = null;
let isConfigured = false;

const apiKey = process.env.GEMINI_API_KEY;

if (apiKey && apiKey.trim() !== '') {
  try {
    genAI = new GoogleGenerativeAI(apiKey.trim());
    isConfigured = true;
    console.log('[AI Service] Google Gemini SDK initialized successfully.');
  } catch (error) {
    console.error('[AI Service Error] Failed to initialize Google Gemini client:', error);
  }
} else {
  console.warn('[AI Service Warning] GEMINI_API_KEY is not defined. AI features will run in mock/inactive mode.');
}

/**
 * Service to interact with the Google Gemini API.
 */
export const aiService = {
  /**
   * Check if Gemini API key configuration is active.
   */
  isConfigured: () => isConfigured,

  /**
   * Helper to verify configuration and throw descriptive error.
   */
  checkConfiguration: () => {
    if (!isConfigured || !genAI) {
      throw new Error('Google Gemini API Key is not configured. Please set the GEMINI_API_KEY environment variable.');
    }
  },

  /**
   * Generates a standard text response using Gemini model.
   * @param {string} prompt - User request or query context.
   * @param {string} systemInstruction - Instructions defining the assistant's behavior/role.
   * @param {string} [modelName] - Gemini model ID (default: 'gemini-1.5-flash').
   */
  generateResponse: async (prompt, systemInstruction = '', modelName = 'gemini-3.6-flash') => {
    aiService.checkConfiguration();
    
    const config = {};
    if (systemInstruction) {
      config.systemInstruction = systemInstruction;
    }

    const model = genAI.getGenerativeModel({ model: modelName }, config);
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const rawText = response.text();
    console.log("=== RAW GEMINI TEXT RESPONSE ===\n", rawText, "\n=================================");
    return rawText;
  },

  /**
   * Prepares a chat session supporting future chat memory.
   * @param {Array} history - Array of previous chat messages.
   * @param {string} systemInstruction - Base system prompt rules.
   * @param {string} [modelName] - Model identifier.
   */
  startChatSession: (history = [], systemInstruction = '', modelName = 'gemini-3.6-flash') => {
    aiService.checkConfiguration();

    const config = {};
    if (systemInstruction) {
      config.systemInstruction = systemInstruction;
    }
    if (history && history.length > 0) {
      config.history = history;
    }

    const model = genAI.getGenerativeModel({ model: modelName });
    return model.startChat(config);
  },

  /**
   * Streams responses from the model chunk by chunk.
   * @param {string} prompt - Prompt to generate content for.
   * @param {Function} onChunk - Callback triggered on each received text chunk.
   * @param {string} systemInstruction - System instructions constraint.
   * @param {string} [modelName] - Model identifier.
   */
  generateStreamResponse: async (prompt, onChunk, systemInstruction = '', modelName = 'gemini-3.6-flash') => {
    aiService.checkConfiguration();

    const config = {};
    if (systemInstruction) {
      config.systemInstruction = systemInstruction;
    }

    const model = genAI.getGenerativeModel({ model: modelName }, config);
    const result = await model.generateContentStream(prompt);

    for await (const chunk of result.stream) {
      const text = chunk.text();
      if (onChunk && typeof onChunk === 'function') {
        onChunk(text);
      }
    }
  },

  /**
   * Instantiates a model configured with custom tools (future function calling support).
   * @param {Array} tools - Function declarations list.
   * @param {string} systemInstruction - Instructions for constraint.
   * @param {string} [modelName] - Model identifier.
   */
  getGenerativeModelWithTools: (tools = [], systemInstruction = '', modelName = 'gemini-3.6-flash') => {
    aiService.checkConfiguration();

    const config = {
      tools: [{ functionDeclarations: tools }]
    };
    if (systemInstruction) {
      config.systemInstruction = systemInstruction;
    }

    return genAI.getGenerativeModel({ model: modelName }, config);
  },

  /**
   * Generates a structured JSON response.
   * @param {string} prompt - User request or query context.
   * @param {string} systemInstruction - Instructions defining the assistant's behavior/role.
   * @param {string} [modelName] - Gemini model ID (default: 'gemini-1.5-flash').
   */
  generateJsonResponse: async (prompt, systemInstruction = '', modelName = 'gemini-3.6-flash') => {
    aiService.checkConfiguration();

    const config = {
      generationConfig: {
        responseMimeType: 'application/json'
      }
    };
    if (systemInstruction) {
      config.systemInstruction = systemInstruction;
    }

    const model = genAI.getGenerativeModel({ model: modelName }, config);
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const rawText = response.text();
    console.log("=== RAW GEMINI JSON RESPONSE ===\n", rawText, "\n=================================");
    return JSON.parse(rawText);
  }
};
