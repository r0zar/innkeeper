import { tool } from 'ai';
import { z } from 'zod';

/**
 * Token search tool that uses the Hiro API to search for tokens by name
 */
export const searchTokens = tool({
  description: 'Search for blockchain tokens by name, symbol, or contract address',
  parameters: z.object({
    query: z.string().describe('The search query - can be a token name, symbol, or partial match'),
    limit: z.number().min(1).max(100).default(20).optional()
      .describe('Maximum number of results to return (default: 20, max: 100)'),
    offset: z.number().min(0).default(0).optional()
      .describe('Pagination offset (default: 0)'),
  }),
  execute: async ({ query, limit = 20, offset = 0 }) => {
    try {
      // Format the URL with query parameters
      const url = new URL('https://api.hiro.so/metadata/v1/ft');
      url.searchParams.append('name', query);
      url.searchParams.append('limit', limit.toString());
      url.searchParams.append('offset', offset.toString());
      
      // Make the request to the Hiro API
      const response = await fetch(url.toString(), {
        headers: {
          'Accept': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error(`API request failed: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      
      // Format the results for better readability - keeping all original fields
      const results = data.results.map((token: any) => ({
        name: token.name,
        symbol: token.symbol,
        decimals: token.decimals,
        total_supply: token.total_supply,
        contract_principal: token.contract_principal || token.sender_address,
        token_uri: token.token_uri,
        description: token.description || '',
        image_uri: token.image_uri || '',
        tx_id: token.tx_id,
      }));
      
      // Return formatted results with pagination info
      return {
        results,
        total: data.total,
        limit,
        offset,
        has_more: (offset + results.length) < data.total,
        query_term: query,
      };
    } catch (error) {
      console.error('Error searching for tokens:', error);
      return {
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        query_term: query,
      };
    }
  },
});