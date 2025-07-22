/**
 * API Adapter - Elasticsearch API integration
 */

export class ApiAdapter {
  constructor(config = {}) {
    this.config = {
      baseUrl: '',
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 30000,
      ...config
    };
  }

  /**
   * Execute an Elasticsearch query
   * @param {Object} query - ES query object
   * @param {Object} options - Additional options
   * @returns {Promise<Object>} Query response
   */
  async executeQuery(query, options = {}) {
    const endpoint = options.endpoint || '/_search';
    const url = `${this.config.baseUrl}${query.index}${endpoint}`;

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          ...this.config.headers,
          ...options.headers
        },
        body: JSON.stringify(query.body),
        signal: AbortSignal.timeout(options.timeout || this.config.timeout)
      });

      if (!response.ok) {
        throw new Error(`API Error: ${response.status} ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Query execution failed:', error);
      throw error;
    }
  }

  /**
   * Execute multiple queries in batch
   * @param {Object[]} queries - Array of queries
   * @returns {Promise<Object[]>} Array of responses
   */
  async executeBatch(queries) {
    return Promise.all(
      queries.map(query => this.executeQuery(query))
    );
  }

  /**
   * Get index mapping
   * @param {string} index - Index name
   * @returns {Promise<Object>} Index mapping
   */
  async getMapping(index) {
    const url = `${this.config.baseUrl}${index}/_mapping`;

    const response = await fetch(url, {
      method: 'GET',
      headers: this.config.headers
    });

    if (!response.ok) {
      throw new Error(`Failed to get mapping: ${response.status}`);
    }

    return await response.json();
  }

  /**
   * Get field capabilities
   * @param {string} index - Index pattern
   * @param {string[]} fields - Field names
   * @returns {Promise<Object>} Field capabilities
   */
  async getFieldCaps(index, fields = ['*']) {
    const url = `${this.config.baseUrl}${index}/_field_caps`;

    const response = await fetch(url, {
      method: 'GET',
      headers: this.config.headers,
      body: JSON.stringify({ fields })
    });

    if (!response.ok) {
      throw new Error(`Failed to get field caps: ${response.status}`);
    }

    return await response.json();
  }

  /**
   * Test connection to Elasticsearch
   * @returns {Promise<boolean>} Connection status
   */
  async testConnection() {
    try {
      const response = await fetch(`${this.config.baseUrl}/_cluster/health`, {
        method: 'GET',
        headers: this.config.headers,
        signal: AbortSignal.timeout(5000)
      });

      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * Configure authentication
   * @param {Object} auth - Authentication config
   */
  setAuth(auth) {
    if (auth.type === 'basic') {
      this.config.headers.Authorization =
        `Basic ${btoa(`${auth.username}:${auth.password}`)}`;
    } else if (auth.type === 'bearer') {
      this.config.headers.Authorization = `Bearer ${auth.token}`;
    } else if (auth.type === 'apiKey') {
      this.config.headers.Authorization = `ApiKey ${auth.apiKey}`;
    }
  }
}
