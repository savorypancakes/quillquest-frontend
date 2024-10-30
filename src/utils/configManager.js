// frontend/src/utils/configManager.js
import api from '../services/api';

class ConfigManager {
  constructor() {
    this.config = null;
    this.loadingPromise = null;
  }

  async getConfig() {
    // Return cached config if available
    if (this.config) {
      return this.config;
    }

    // Return existing promise if already loading
    if (this.loadingPromise) {
      return this.loadingPromise;
    }

    // Fetch config from backend
    this.loadingPromise = api.get('/config')
      .then(response => {
        this.config = response.data;
        this.loadingPromise = null;
        return this.config;
      })
      .catch(error => {
        console.error('Failed to load config:', error);
        this.loadingPromise = null;
        throw error;
      });

    return this.loadingPromise;
  }

  async getGroqApiKey() {
    const config = await this.getConfig();
    return config.GROQ_API_KEY;
  }
}

export const configManager = new ConfigManager();