import { tool } from 'ai';
import { z } from 'zod';
import kraxel from '../../../lib/kraxel-api';

/**
 * Blockchain Activity Tool
 * 
 * Explore and analyze blockchain activity including swaps, transfers, and user transactions.
 * Use this tool when you need to view on-chain activities for tokens or addresses, or
 * want to check actual transaction patterns before designing quest validation rules.
 */
export const getBlockchainActivity = tool({
  description: 'View recent swap activity, user transactions, and token transfers on the blockchain',
  parameters: z.object({
    action: z.enum([
      'get-recent-swaps',      // Get recent swaps for a token
      'get-user-activity',     // Get activity for a specific user
      'get-token-transfers',   // Get token transfer activity
      'search-transactions',   // Search for transactions by various criteria
    ]).describe('The type of blockchain activity to retrieve'),

    // Main parameters
    tokenPrincipal: z.string().optional().describe('The token principal identifier (contract.token::name format)'),
    userAddress: z.string().optional().describe('The blockchain user address to check activity for'),
    
    // Time parameters
    startTime: z.number().optional().describe('Start time for search period (Unix timestamp)'),
    endTime: z.number().optional().describe('End time for search period (Unix timestamp)'),
    
    // Optional parameters
    limit: z.number().optional().describe('Maximum number of results to return (default: 10)')
  }),

  execute: async ({
    action,
    tokenPrincipal,
    userAddress,
    startTime,
    endTime,
    limit = 10
  }) => {
    try {
      // Set default time bounds if not provided
      const now = Math.floor(Date.now() / 1000);
      const defaultStartTime = startTime || (now - 86400 * 7); // Default to 7 days ago
      const defaultEndTime = endTime || now;

      // Format dates for display
      const formatDate = (timestamp: number) => 
        new Date(timestamp * 1000).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric'
        });
      
      const timeframeStr = `${formatDate(defaultStartTime)} to ${formatDate(defaultEndTime)}`;

      switch (action) {
        case 'get-recent-swaps':
          if (!tokenPrincipal) {
            return {
              success: false,
              error: 'Token principal is required for this action'
            };
          }
          
          const recentSwaps = await kraxel.getSwapsByContract(tokenPrincipal, {
            limit,
            start_date: new Date(defaultStartTime * 1000),
            end_date: new Date(defaultEndTime * 1000)
          });
          
          // Count direct buys vs. sells
          const buys = recentSwaps.data.filter(swap => 
            swap.swap_details?.some(detail => detail.out_asset === tokenPrincipal)
          );
          
          const sells = recentSwaps.data.filter(swap => 
            swap.swap_details?.some(detail => detail.in_asset === tokenPrincipal)
          );
          
          return {
            success: true,
            action,
            timeframe: timeframeStr,
            swapCount: recentSwaps.data.length,
            summary: {
              totalSwaps: recentSwaps.data.length,
              buys: buys.length,
              sells: sells.length,
              uniqueUsers: new Set(recentSwaps.data.map(swap => swap.user_address)).size
            },
            swaps: recentSwaps.data.slice(0, limit),
            insights: `During this timeframe, there were ${buys.length} buys and ${sells.length} sells for ${tokenPrincipal}.`,
            nextSteps: 'You can now validate if users participated in these swaps using the validateBlockchainCriteria tool.'
          };

        case 'get-user-activity':
          if (!userAddress) {
            return {
              success: false,
              error: 'User address is required for this action'
            };
          }

          const userSwaps = await kraxel.getSwapsByUser(userAddress, {
            limit,
            start_date: new Date(defaultStartTime * 1000),
            end_date: new Date(defaultEndTime * 1000)
          });
          
          // Also get token transfers if token principal was specified
          let tokenTransfers = null;
          if (tokenPrincipal) {
            const transfers = await kraxel.getTokenTransfers(
              userAddress, 
              tokenPrincipal,
              { limit }
            );
            tokenTransfers = transfers.data;
          }
          
          return {
            success: true,
            action,
            timeframe: timeframeStr,
            userAddress,
            summary: {
              totalSwaps: userSwaps.data.length,
              uniqueTokens: new Set(
                userSwaps.data.flatMap(swap => 
                  swap.swap_details?.flatMap(detail => [detail.in_asset, detail.out_asset]) || []
                )
              ).size
            },
            swaps: userSwaps.data.slice(0, limit),
            ...(tokenTransfers ? { 
              tokenTransfers: {
                count: tokenTransfers.length,
                data: tokenTransfers.slice(0, limit)
              } 
            } : {}),
            insights: `This user has participated in ${userSwaps.data.length} swaps during the timeframe.`,
            nextSteps: 'You can validate if this user meets specific criteria using the validateBlockchainCriteria tool.'
          };
          
        case 'get-token-transfers':
          if (!tokenPrincipal) {
            return {
              success: false,
              error: 'Token principal is required for this action'
            };
          }
          
          // If user address is provided, get transfers for that user
          if (userAddress) {
            const transfers = await kraxel.getTokenTransfers(
              userAddress,
              tokenPrincipal,
              { limit }
            );
            
            return {
              success: true,
              action,
              userAddress,
              tokenPrincipal,
              transfers: transfers.data,
              count: transfers.data.length,
              insights: `Found ${transfers.data.length} transfers of ${tokenPrincipal} for user ${userAddress}.`,
              nextSteps: 'You can now validate token holding using the validateBlockchainCriteria tool.'
            };
          } 
          
          // Otherwise search for transfers of this token (implementation depends on API capabilities)
          // This is a placeholder that would need actual API support
          return {
            success: false,
            error: 'Getting all transfers for a token without a user address is not supported yet. Please specify a userAddress.',
            action
          };
          
        case 'search-transactions':
          // This is a more flexible search depending on provided parameters
          
          if (tokenPrincipal && userAddress) {
            // Search for this user's interactions with this token
            const transfers = await kraxel.getTokenTransfers(
              userAddress,
              tokenPrincipal,
              { limit }
            );
            
            const swaps = await kraxel.getSwapsByContract(
              tokenPrincipal,
              { 
                user_address: userAddress,
                limit
              }
            );
            
            return {
              success: true,
              action,
              timeframe: timeframeStr,
              results: {
                transfers: transfers.data.slice(0, limit),
                swaps: swaps.data.slice(0, limit)
              },
              insights: `Found ${transfers.data.length} transfers and ${swaps.data.length} swaps matching the criteria.`,
              nextSteps: 'You can now use this data to design appropriate validation rules for the quest.'
            };
          } 
          else if (tokenPrincipal) {
            // Get swap activity for this token
            const swaps = await kraxel.getSwapsByContract(
              tokenPrincipal,
              {
                limit,
                start_date: new Date(defaultStartTime * 1000),
                end_date: new Date(defaultEndTime * 1000)
              }
            );
            
            return {
              success: true,
              action,
              timeframe: timeframeStr,
              tokenPrincipal,
              swapCount: swaps.data.length,
              swaps: swaps.data.slice(0, limit),
              insights: `Found ${swaps.data.length} swap transactions for ${tokenPrincipal} in the timeframe.`,
              nextSteps: 'Based on this activity, you can design appropriate quest criteria using validateBlockchainCriteria.'
            };
          }
          else if (userAddress) {
            // Get all activity for this user
            const swaps = await kraxel.getSwapsByUser(
              userAddress,
              {
                limit,
                start_date: new Date(defaultStartTime * 1000),
                end_date: new Date(defaultEndTime * 1000)
              }
            );
            
            return {
              success: true,
              action,
              timeframe: timeframeStr,
              userAddress,
              transactions: swaps.data.slice(0, limit),
              count: swaps.data.length,
              insights: `Found ${swaps.data.length} transactions for user ${userAddress} in the timeframe.`,
              nextSteps: 'You can now check if this user meets particular criteria using validateBlockchainCriteria.'
            };
          }
          
          return {
            success: false,
            error: 'Please provide either tokenPrincipal or userAddress to search transactions',
            action
          };

        default:
          return {
            success: false,
            error: `Unsupported action: ${action}`
          };
      }
    } catch (error) {
      console.error(`Error in blockchain activity tool:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error accessing blockchain data',
        action
      };
    }
  }
});