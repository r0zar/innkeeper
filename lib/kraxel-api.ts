/**
 * Kraxel API Client
 * 
 * A comprehensive wrapper for the Kraxel blockchain data API
 * used to access transaction, token, swap, and price data from the blockchain.
 * 
 * @author Claude
 */

// Core types for the Kraxel API
export type Transaction = {
  tx_id: string;
  user_address: string;
  block_height: number;
  block_time: string;
  swap_details?: SwapDetail[];
  [key: string]: any;
}

export type SwapDetail = {
  in_asset: string;
  in_amount: string;
  out_asset: string;
  out_amount: string;
  swap_index: number;
  contract_address: string;
  [key: string]: any;
}

export type TokenInfo = {
  contract_principal: string;
  name: string;
  symbol: string;
  decimals: number;
  total_supply?: string;
  [key: string]: any;
}

export type PriceInfo = {
  contract_principal: string;
  price_usd: number;
  price_btc?: number;
  timestamp: string;
  [key: string]: any;
}

export type KraxelResponse<T> = {
  status: string;
  data: T;
  meta?: Record<string, any> | null;
}

// Common parameter types
export type PaginationParams = {
  limit?: number;
  offset?: number;
}

export type DateRangeParams = {
  start_date?: string | Date;
  end_date?: string | Date;
}

// API configuration
type KraxelConfig = {
  apiUrl: string;
  apiKey?: string;
  maxRetries: number;
  defaultTimeout: number;
}

// Singleton instance with default configuration
const DEFAULT_CONFIG: KraxelConfig = {
  apiUrl: process.env.KRAXEL_API_URL || 'http://165.232.68.81:8000',
  apiKey: process.env.KRAXEL_API_KEY || '',
  maxRetries: 3,
  defaultTimeout: 10000, // 10 seconds
};

/**
 * KraxelAPI class - provides a clean interface to the Kraxel blockchain data API
 */
class KraxelAPI {
  private config: KraxelConfig;

  constructor(config: Partial<KraxelConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Makes a request to the Kraxel API with retry logic
   */
  private async request<T>(
    endpoint: string,
    method: 'GET' | 'POST' = 'GET',
    params?: Record<string, any>
  ): Promise<KraxelResponse<T>> {
    let attempts = 0;
    let url = `${this.config.apiUrl}${endpoint}`;

    // Format dates if they exist
    if (params) {
      if (params.start_date instanceof Date) {
        params.start_date = params.start_date.toISOString();
      }
      if (params.end_date instanceof Date) {
        params.end_date = params.end_date.toISOString();
      }
    }

    // Add query parameters for GET requests
    if (params && method === 'GET') {
      const queryParams = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          queryParams.append(key, String(value));
        }
      });
      const queryString = queryParams.toString();
      if (queryString) {
        url += `?${queryString}`;
      }
    }

    // Setup controller for timeout handling
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.config.defaultTimeout);

    try {
      while (attempts < this.config.maxRetries) {
        try {
          const response = await fetch(url, {
            method,
            headers: {
              'X-Api-Key': this.config.apiKey || '',
              'Content-Type': 'application/json',
            },
            signal: controller.signal,
            ...(method === 'POST' && params ? { body: JSON.stringify(params) } : {})
          });

          if (!response.ok) {
            throw new Error(`API request failed: ${response.status} ${response.statusText}`);
          }

          const data = await response.json();
          return data as KraxelResponse<T>;
        } catch (error) {
          attempts++;
          if (attempts >= this.config.maxRetries) {
            throw error;
          }
          // Simple exponential backoff
          await new Promise(resolve => setTimeout(resolve, 2 ** attempts * 100));
        }
      }
      throw new Error('Maximum retries reached');
    } finally {
      clearTimeout(timeoutId);
    }
  }

  // ==== API METHODS ====

  // SYSTEM ENDPOINTS

  /**
   * Get API root information
   */
  async getApiRoot() {
    return this.request<any>('/');
  }

  /**
   * Check API health status
   */
  async getApiHealth() {
    return this.request<any>('/health');
  }

  /**
   * Get cache statistics
   */
  async getCacheStats() {
    return this.request<any>('/stats/cache');
  }

  /**
   * Clear API cache
   */
  async clearCache() {
    return this.request<any>('/stats/cache/clear', 'POST');
  }

  // TRANSACTION ENDPOINTS

  /**
   * Get details of a specific transaction by its ID
   */
  async getTransaction(txId: string, includeEvents: boolean = true) {
    return this.request<Transaction>(
      `/transactions/${txId}`,
      'GET',
      { include_events: includeEvents }
    );
  }

  /**
   * List transactions with optional filtering
   */
  async listTransactions(params?: PaginationParams & { block_height?: number }) {
    return this.request<Transaction[]>(
      '/transactions',
      'GET',
      params
    );
  }

  /**
   * Get transactions from a specific block
   */
  async getTransactionsByBlock(blockHeight: number, params?: PaginationParams) {
    return this.request<Transaction[]>(
      `/transactions/block/${blockHeight}`,
      'GET',
      params
    );
  }

  /**
   * Get all transactions for a specific blockchain address
   */
  async getTransactionsByAddress(address: string, params?: PaginationParams) {
    return this.request<Transaction[]>(
      `/transactions/address/${address}`,
      'GET',
      params
    );
  }

  /**
   * Get token transfers for a specific address and token
   */
  async getTokenTransfers(
    address: string,
    contractPrincipal: string,
    params?: PaginationParams & { event_type?: string; debug?: boolean }
  ) {
    return this.request<any[]>(
      `/transactions/token-transfers/${address}/${contractPrincipal}`,
      'GET',
      params
    );
  }

  /**
   * Get all token transfers for an address across all tokens
   */
  async getAllTokenTransfers(
    address: string,
    params?: PaginationParams & { event_type?: string; debug?: boolean }
  ) {
    return this.request<any[]>(
      `/transactions/token-transfers/all/${address}`,
      'GET',
      params
    );
  }

  // TOKEN ENDPOINTS

  /**
   * List all tokens with pagination
   */
  async listTokens(params?: PaginationParams) {
    return this.request<TokenInfo[]>(
      '/tokens',
      'GET',
      params
    );
  }

  /**
   * Get details for a specific token by its principal identifier
   */
  async getToken(contractPrincipal: string) {
    return this.request<TokenInfo>(
      `/tokens/${contractPrincipal}`
    );
  }

  // SWAP ENDPOINTS

  /**
   * Get recent swap transactions
   */
  async getRecentSwaps(params?: PaginationParams & DateRangeParams & { debug?: boolean }) {
    return this.request<Transaction[]>(
      '/swaps',
      'GET',
      params
    );
  }

  /**
   * Get swap transactions for a specific token contract
   */
  async getSwapsByContract(
    contractPrincipal: string,
    params?: PaginationParams & DateRangeParams & { user_address?: string; debug?: boolean }
  ) {
    return this.request<Transaction[]>(
      `/swaps/contract/${contractPrincipal}`,
      'GET',
      params
    );
  }

  /**
   * Get swap transactions for a specific user
   */
  async getSwapsByUser(
    userAddress: string,
    params?: PaginationParams & DateRangeParams & { debug?: boolean }
  ) {
    return this.request<Transaction[]>(
      `/swaps/user/${userAddress}`,
      'GET',
      params
    );
  }

  /**
   * Filter swap transactions based on token pairs and amounts
   */
  async filterSwaps(params?: {
    token_x?: string;
    token_y?: string;
    min_amount?: number;
    max_amount?: number;
  } & PaginationParams & DateRangeParams & { debug?: boolean }) {
    return this.request<Transaction[]>(
      '/swaps/filter',
      'GET',
      params
    );
  }

  /**
   * Get statistical information about swap transactions
   */
  async getSwapStats(params?: {
    period?: 'day' | 'week' | 'month';
    token?: string;
  } & DateRangeParams & { debug?: boolean }) {
    return this.request<any>(
      '/swaps/stats',
      'GET',
      params
    );
  }

  /**
   * Get swap transactions with flexible filtering by address and/or contract
   */
  async getSwapsByAddressAndContract(params?: {
    user_address?: string;
    contract_principal?: string;
  } & PaginationParams & DateRangeParams & { debug?: boolean }) {
    return this.request<Transaction[]>(
      '/swaps/address-contract',
      'GET',
      params
    );
  }

  // PRICE ENDPOINTS

  /**
   * Get price information for tokens
   */
  async getPrices(params?: {
    contract_principal?: string;
  } & PaginationParams & { debug?: boolean }) {
    return this.request<PriceInfo[]>(
      '/prices',
      'GET',
      params
    );
  }

  /**
   * Get the latest price information for all tokens
   */
  async getLatestPrices(params?: { debug?: boolean }) {
    return this.request<Record<string, number>>(
      '/prices/latest',
      'GET',
      params
    );
  }

  /**
   * Get price history for a specific token
   */
  async getPriceHistory(
    contractPrincipal: string,
    params?: PaginationParams & { debug?: boolean }
  ) {
    return this.request<PriceInfo[]>(
      `/prices/${contractPrincipal}`,
      'GET',
      params
    );
  }
}

// Create the default instance
const kraxel = new KraxelAPI();

export { KraxelAPI };
export default kraxel;