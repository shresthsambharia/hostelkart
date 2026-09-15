import { GoogleGenerativeAI } from '@google/generative-ai';

let genAI = null;

const initClient = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (apiKey && apiKey.trim() !== '') {
    if (!genAI) {
      try {
        genAI = new GoogleGenerativeAI(apiKey.trim());
        console.log('[AI Service] Google Gemini SDK initialized successfully.');
      } catch (error) {
        console.error('[AI Service Error] Failed to initialize Google Gemini client:', error);
      }
    }
    return genAI;
  }
  return null;
};

// Initial attempt on import
initClient();

/**
 * Service to interact with the Google Gemini API.
 */
export const aiService = {
  /**
   * Return the raw GoogleGenerativeAI instance.
   */
  getGenAI: () => initClient(),

  /**
   * Check if Gemini API key configuration is active.
   */
  isConfigured: () => {
    return !!initClient();
  },

  /**
   * Helper to verify configuration and throw descriptive error.
   */
  checkConfiguration: () => {
    if (!aiService.isConfigured() || !aiService.getGenAI()) {
      throw new Error('Google Gemini API Key is not configured. Please set the GEMINI_API_KEY environment variable.');
    }
  },

  /**
   * Generates a standard text response using Gemini model.
   * @param {string} prompt - User request or query context.
   * @param {string} systemInstruction - Instructions defining the assistant's behavior/role.
   * @param {string} [modelName] - Gemini model ID.
   */
  generateResponse: async (prompt, systemInstruction = '', modelName = 'gemini-3.5-flash-lite') => {
    aiService.checkConfiguration();
    const client = aiService.getGenAI();

    const modelParams = { model: modelName };
    if (systemInstruction) {
      modelParams.systemInstruction = systemInstruction;
    }

    const model = client.getGenerativeModel(modelParams);
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const rawText = response.text();
    return rawText;
  },

  /**
   * Prepares a chat session supporting future chat memory.
   * @param {Array} history - Array of previous chat messages.
   * @param {string} systemInstruction - Base system prompt rules.
   * @param {string} [modelName] - Model identifier.
   */
  startChatSession: (history = [], systemInstruction = '', modelName = 'gemini-3.5-flash-lite') => {
    aiService.checkConfiguration();
    const client = aiService.getGenAI();

    const modelParams = { model: modelName };
    if (systemInstruction) {
      modelParams.systemInstruction = systemInstruction;
    }

    const model = client.getGenerativeModel(modelParams);
    const chatConfig = {};
    if (history && history.length > 0) {
      chatConfig.history = history;
    }
    return model.startChat(chatConfig);
  },

  /**
   * Streams responses from the model chunk by chunk.
   * @param {string} prompt - Prompt to generate content for.
   * @param {Function} onChunk - Callback triggered on each received text chunk.
   * @param {string} systemInstruction - System instructions constraint.
   * @param {string} [modelName] - Model identifier.
   */
  generateStreamResponse: async (prompt, onChunk, systemInstruction = '', modelName = 'gemini-3.5-flash-lite') => {
    aiService.checkConfiguration();
    const client = aiService.getGenAI();

    const modelParams = { model: modelName };
    if (systemInstruction) {
      modelParams.systemInstruction = systemInstruction;
    }

    const model = client.getGenerativeModel(modelParams);
    const result = await model.generateContentStream(prompt);

    for await (const chunk of result.stream) {
      const text = chunk.text();
      if (onChunk && typeof onChunk === 'function') {
        onChunk(text);
      }
    }
  },

  /**
   * Instantiates a model configured with custom tools.
   * @param {Array} tools - Function declarations list.
   * @param {string} systemInstruction - Instructions for constraint.
   * @param {string} [modelName] - Model identifier.
   */
  getGenerativeModelWithTools: (tools = [], systemInstruction = '', modelName = 'gemini-3.5-flash-lite') => {
    aiService.checkConfiguration();
    const client = aiService.getGenAI();

    const modelParams = {
      model: modelName,
      tools: [{ functionDeclarations: tools }]
    };
    if (systemInstruction) {
      modelParams.systemInstruction = systemInstruction;
    }

    return client.getGenerativeModel(modelParams);
  },

  /**
   * Generates a structured JSON response.
   * @param {string} prompt - User request or query context.
   * @param {string} systemInstruction - Instructions defining the assistant's behavior/role.
   * @param {string} [modelName] - Gemini model ID.
   */
  generateJsonResponse: async (prompt, systemInstruction = '', modelName = 'gemini-3.5-flash-lite') => {
    aiService.checkConfiguration();
    const client = aiService.getGenAI();

    const modelParams = {
      model: modelName,
      generationConfig: {
        responseMimeType: 'application/json'
      }
    };
    if (systemInstruction) {
      modelParams.systemInstruction = systemInstruction;
    }

    const model = client.getGenerativeModel(modelParams);
    const result = await model.generateContent(prompt);
    const response = await result.response;
    let rawText = response.text().trim();

    // Safely strip markdown wrapping if present
    if (rawText.startsWith('```json')) {
      rawText = rawText.slice(7);
    } else if (rawText.startsWith('```')) {
      rawText = rawText.slice(3);
    }
    if (rawText.endsWith('```')) {
      rawText = rawText.slice(0, -3);
    }
    rawText = rawText.trim();

    return JSON.parse(rawText);
  }
};
