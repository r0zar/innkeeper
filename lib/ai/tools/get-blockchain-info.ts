import { tool } from 'ai';
import { z } from 'zod';
import kraxel from '../../../lib/kraxel-api';

/**
 * Blockchain Information Tool
 * 
 * Retrieve information about tokens, contracts, and pricing on the blockchain.
 * Use this tool when exploring tokens, researching prices, or gathering initial data 
 * for quest building.
 */
export const getBlockchainInfo = tool({
  description: 'Retrieve token information, pricing, and contract details from the blockchain',
  parameters: z.object({
    action: z.enum([
      'get-token-info',    // Get detailed info about a specific token
      'get-token-price',   // Get current & historical price for a token
      'get-latest-prices', // Get latest prices for multiple tokens
      'list-tokens',       // List available tokens (with pagination)
    ]).describe('The type of blockchain information to retrieve'),

    // Token parameters
    tokenPrincipal: z.string().optional().describe('The token principal identifier (contract.token::name format)'),
    
    // Optional parameters
    limit: z.number().optional().describe('Maximum number of results to return (default: 10)')
  }),

  execute: async ({
    action,
    tokenPrincipal,
    limit = 10
  }) => {
    try {
      // Format dates for display
      const formatDate = (timestamp: number) => 
        new Date(timestamp * 1000).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric'
        });

      switch (action) {
        case 'get-token-info':
          if (!tokenPrincipal) {
            return {
              success: false,
              error: 'Token principal is required for this action'
            };
          }

          const tokenData = await kraxel.getToken(tokenPrincipal);
          return {
            success: true,
            action,
            data: tokenData.data,
            usage: 'This token information can be used to design quests around specific contract addresses and token characteristics.'
          };

        case 'get-token-price':
          if (!tokenPrincipal) {
            return {
              success: false,
              error: 'Token principal is required for this action'
            };
          }

          const priceData = await kraxel.getPriceHistory(tokenPrincipal, { limit });
          const latestPrices = await kraxel.getLatestPrices();
          
          return {
            success: true,
            action,
            currentPrice: latestPrices.data[tokenPrincipal] || null,
            priceHistory: priceData.data,
            usage: 'Use this price data to set appropriate value thresholds for quest criteria.'
          };
        
        case 'get-latest-prices':
          const prices = await kraxel.getLatestPrices();
          
          // If tokenPrincipal is provided, focus on that token and related ones
          if (tokenPrincipal) {
            const focusTokenPrice = prices.data[tokenPrincipal];
            
            return {
              success: true,
              action,
              focusToken: {
                principal: tokenPrincipal,
                price: focusTokenPrice
              },
              allPrices: prices.data,
              usage: 'These prices can be used to calculate appropriate minimum values for swap validations.'
            };
          }
          
          // Otherwise return all prices
          return {
            success: true,
            action,
            prices: prices.data,
            topTokens: Object.entries(prices.data)
              .sort((a, b) => b[1] - a[1])
              .slice(0, limit)
              .map(([token, price]) => ({ token, price })),
            usage: 'Use these token prices to identify popular tokens or set minimum value thresholds.'
          };
          
        case 'list-tokens':
          const tokens = await kraxel.listTokens({ limit });
          
          return {
            success: true,
            action,
            tokens: tokens.data,
            count: tokens.data.length,
            usage: 'These tokens can be used as the basis for quest criteria. Use the token principals when creating validations.'
          };

        default:
          return {
            success: false,
            error: `Unsupported action: ${action}`
          };
      }
    } catch (error) {
      console.error(`Error in blockchain info tool:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error accessing blockchain data',
        action
      };
    }
  }
});