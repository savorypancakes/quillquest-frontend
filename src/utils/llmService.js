// utils/llmService.js
import { ChatGroq } from "@langchain/groq";
import { configManager } from './configManager';

class LLMService {
  constructor() {
    this.llm = null;
    this.initPromise = null;
  }

  async initialize() {
    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = (async () => {
      try {
        const apiKey = await configManager.getGroqApiKey();
        if (!apiKey) {
          throw new Error('GROQ API key not found in configuration');
        }

        this.llm = new ChatGroq({
          apiKey,
          model: "llama3-70b-8192",
          temperature: 0.5,
          maxTokens: 1024,
          topP: 1,
          baseURL: 'https://api.groq.com/openai/v1',
          defaultHeaders: {
            'Content-Type': 'application/json',
            'Origin': window.location.origin
          }
        });

        return this.llm;
      } catch (error) {
        console.error('Failed to initialize LLM:', error);
        this.initPromise = null;
        throw error;
      }
    })();

    return this.initPromise;
  }

  async getLLM() {
    if (!this.llm) {
      await this.initialize();
    }
    return this.llm;
  }

  async invoke(messages) {
    const llm = await this.getLLM();
    return llm.invoke(messages);
  }
}

export const llmService = new LLMService();