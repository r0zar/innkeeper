import { tool } from 'ai';
import { z } from 'zod';
import kraxel from '../../../lib/kraxel-api';
import { KraxelValidation } from '../../../lib/kraxel-validation';

/**
 * Blockchain Data Tool
 * 
 * This tool provides AI access to blockchain data via the Kraxel API,
 * allowing users to create on-chain quests with specific validation rules.
 * 
 * Features:
 * - Retrieve token, transaction, and swap information
 * - Create validations for token swaps, value thresholds, and buyer status
 * - Preview validation outcomes before creating quests
 * - Support for user-specific token validations
 */
export const getBlockchainData = tool({
  description: 'Retrieve and validate blockchain data for token quests',
  parameters: z.object({
    action: z.enum([
      // Data retrieval actions
      'get-token-info',
      'get-token-price',
      'get-recent-swaps',
      'get-user-activity',

      // Quest validation actions
      'validate-token-swap',
      'validate-first-n-buyers',
      'validate-min-value-swap',
      'validate-token-holding',
      'preview-quest-validation',

      // Date utility actions
      'get-current-time',
      'convert-date',
      'get-timeframe',
    ]).describe('The type of blockchain action to perform'),

    // Main parameters
    tokenPrincipal: z.string().optional().describe('The token principal identifier (contract.token)'),
    userAddress: z.string().optional().describe('The blockchain user address to validate'),

    // Quest-specific parameters
    minValue: z.number().optional().describe('Minimum USD value threshold for the validation'),
    numUsers: z.number().optional().describe('Number of users to validate (for first-n-buyers)'),
    startTime: z.number().optional().describe('Start time for validation period (Unix timestamp)'),
    endTime: z.number().optional().describe('End time for validation period (Unix timestamp)'),

    // Date conversion parameters
    date: z.string().optional().describe('Date string in ISO or YYYY-MM-DD format for conversion'),
    timestamp: z.number().optional().describe('Unix timestamp for conversion'),
    days: z.number().optional().describe('Number of days to use in timeframe calculations'),

    // Optional parameters
    limit: z.number().optional().describe('Maximum number of results to return (default: 10)')
  }),

  execute: async ({
    action,
    tokenPrincipal,
    userAddress,
    minValue,
    numUsers,
    startTime,
    endTime,
    date,
    timestamp,
    days,
    limit = 10
  }) => {
    try {
      // Set default time bounds if not provided
      const now = Math.floor(Date.now() / 1000);
      const defaultStartTime = startTime || (now - 86400 * 7); // Default to 7 days ago
      const defaultEndTime = endTime || now;

      console.log({ now, defaultStartTime })

      // Format dates for display
      const formatDate = (timestamp: number) =>
        new Date(timestamp * 1000).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric'
        });

      // Execute the appropriate action based on the request
      switch (action) {
        // DATA RETRIEVAL ACTIONS
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
            data: tokenData.data
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
            data: priceData.data,
            latestPrice: latestPrices.data[tokenPrincipal] || null
          };

        case 'get-recent-swaps':
          if (!tokenPrincipal) {
            return {
              success: false,
              error: 'Token principal is required for this action'
            };
          }

          const recentSwaps = await kraxel.getRecentSwaps({
            limit,
            start_date: new Date(defaultStartTime * 1000),
            end_date: new Date(defaultEndTime * 1000)
          });

          return {
            success: true,
            action,
            timeframe: `${formatDate(defaultStartTime)} to ${formatDate(defaultEndTime)}`,
            count: recentSwaps.data.length,
            data: recentSwaps.data.slice(0, limit)
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
            timeframe: `${formatDate(defaultStartTime)} to ${formatDate(defaultEndTime)}`,
            swapCount: userSwaps.data.length,
            swaps: userSwaps.data.slice(0, limit),
            ...(tokenTransfers ? {
              tokenTransfers: {
                count: tokenTransfers.length,
                data: tokenTransfers.slice(0, limit)
              }
            } : {})
          };

        // QUEST VALIDATION ACTIONS
        case 'validate-token-swap':
          if (!tokenPrincipal) {
            return {
              success: false,
              error: 'Token principal is required for this action'
            };
          }

          // Create a validation for any swap of the specified token
          const swapValidator = KraxelValidation.swappedFor(tokenPrincipal, defaultStartTime, defaultEndTime);
          const swapResult = await swapValidator.execute();

          return {
            success: true,
            action,
            validation: {
              criteria: `Swapped for ${tokenPrincipal}`,
              timeframe: `${formatDate(defaultStartTime)} to ${formatDate(defaultEndTime)}`,
              matched: swapResult.matches.length,
              satisfied: swapResult.satisfied,
              metadata: swapResult.metadata
            },
            // Return a subset of matches to avoid overwhelming the response
            sampleMatches: swapResult.matches.slice(0, limit)
          };

        case 'validate-first-n-buyers':
          if (!tokenPrincipal || !numUsers) {
            return {
              success: false,
              error: 'Token principal and numUsers are required for this action'
            };
          }

          // Set minimum value to 0 if not specified
          const buyerMinValue = minValue || 0;

          // Create validation for first N buyers
          const firstNBuyersValidator = KraxelValidation.firstNBuyers(
            tokenPrincipal,
            numUsers,
            buyerMinValue,
            defaultStartTime
          );

          const buyersResult = await firstNBuyersValidator.execute();

          return {
            success: true,
            action,
            validation: {
              criteria: `First ${numUsers} buyers of ${tokenPrincipal}${buyerMinValue > 0 ? ` with min value $${buyerMinValue}` : ''}`,
              timeframe: `${formatDate(defaultStartTime)} to ${formatDate(defaultEndTime)}`,
              matched: buyersResult.matches.length,
              satisfied: buyersResult.satisfied,
              winningAddresses: buyersResult.metadata?.buyerAddresses || buyersResult.matches.map(tx => tx.user_address)
            },
            // Include matches with transaction details
            sampleMatches: buyersResult.matches.slice(0, limit).map(tx => ({
              address: tx.user_address,
              tx_id: tx.tx_id,
              block_time: tx.block_time,
              block_height: tx.block_height
            }))
          };

        case 'validate-min-value-swap':
          if (!tokenPrincipal || !minValue) {
            return {
              success: false,
              error: 'Token principal and minValue are required for this action'
            };
          }

          // Create combined validator for token swap with minimum value
          const minValueValidator = KraxelValidation.combinators.and(
            KraxelValidation.swappedFor(tokenPrincipal, defaultStartTime, defaultEndTime),
            KraxelValidation.minValueSwap(minValue)
          );

          const minValueResult = await minValueValidator.execute();

          return {
            success: true,
            action,
            validation: {
              criteria: `Swapped for ${tokenPrincipal} with minimum value $${minValue}`,
              timeframe: `${formatDate(defaultStartTime)} to ${formatDate(defaultEndTime)}`,
              matched: minValueResult.matches.length,
              satisfied: minValueResult.satisfied,
              metadata: minValueResult.metadata
            },
            // Return a subset of matches to avoid overwhelming the response
            sampleMatches: minValueResult.matches.slice(0, limit).map(tx => ({
              address: tx.user_address,
              tx_id: tx.tx_id,
              block_time: tx.block_time,
              block_height: tx.block_height,
              ...tx.swap_details && tx.swap_details[0] ? {
                in_asset: tx.swap_details[0].in_asset,
                in_amount: tx.swap_details[0].in_amount,
                out_asset: tx.swap_details[0].out_asset,
                out_amount: tx.swap_details[0].out_amount
              } : {}
            }))
          };

        case 'validate-token-holding':
          if (!tokenPrincipal || !userAddress) {
            return {
              success: false,
              error: 'Token principal and userAddress are required for this action'
            };
          }

          // Create token holding validator
          const holdingValidator = KraxelValidation.holdsToken(userAddress, tokenPrincipal);
          const holdingResult = await holdingValidator.execute();

          return {
            success: true,
            action,
            validation: {
              criteria: `User ${userAddress} holds ${tokenPrincipal}`,
              timeframe: 'Current',
              matched: holdingResult.matches.length,
              satisfied: holdingResult.satisfied,
              metadata: holdingResult.metadata
            },
            transfers: holdingResult.matches.slice(0, limit)
          };

        case 'preview-quest-validation':
          if (!tokenPrincipal) {
            return {
              success: false,
              error: 'Token principal is required for quest preview'
            };
          }

          // Parallel execution of different validation types for preview
          const [swapAnyResult, minValResult, firstBuyersResult] = await Promise.all([
            // Basic swap validation
            KraxelValidation.swappedFor(tokenPrincipal, defaultStartTime, defaultEndTime).execute(),

            // Min value validation (if minValue provided)
            minValue
              ? KraxelValidation.combinators.and(
                KraxelValidation.swappedFor(tokenPrincipal, defaultStartTime, defaultEndTime),
                KraxelValidation.minValueSwap(minValue)
              ).execute()
              : null,

            // First N buyers validation (if numUsers provided)
            numUsers
              ? KraxelValidation.firstNBuyers(
                tokenPrincipal,
                numUsers,
                minValue || 0,
                defaultStartTime
              ).execute()
              : null
          ]);

          return {
            success: true,
            action,
            previewResults: {
              anySwap: {
                criteria: `Swapped for ${tokenPrincipal}`,
                matched: swapAnyResult.matches.length,
                satisfied: swapAnyResult.satisfied
              },
              ...(minValResult ? {
                minValueSwap: {
                  criteria: `Swapped for ${tokenPrincipal} with min value $${minValue}`,
                  matched: minValResult.matches.length,
                  satisfied: minValResult.satisfied
                }
              } : {}),
              ...(firstBuyersResult ? {
                firstNBuyers: {
                  criteria: `First ${numUsers} buyers of ${tokenPrincipal}${minValue ? ` with min value $${minValue}` : ''}`,
                  matched: firstBuyersResult.matches.length,
                  satisfied: firstBuyersResult.satisfied,
                  addresses: firstBuyersResult.matches.slice(0, 5).map(tx => tx.user_address)
                }
              } : {})
            },
            timeframe: `${formatDate(defaultStartTime)} to ${formatDate(defaultEndTime)}`,
            recommendedValidation: determineRecommendedValidation(
              swapAnyResult,
              minValResult,
              firstBuyersResult,
              tokenPrincipal,
              minValue,
              numUsers
            )
          };

        // DATE UTILITY ACTIONS
        case 'get-current-time':
          // Get current blockchain time in multiple formats
          const currentTimestamp = Math.floor(Date.now() / 1000);
          const currentDate = new Date();

          return {
            success: true,
            action,
            timestamp: currentTimestamp,
            iso: currentDate.toISOString(),
            formatted: formatDate(currentTimestamp),
            ymd: currentDate.toISOString().split('T')[0],
            humanReadable: currentDate.toLocaleString('en-US', {
              weekday: 'short',
              year: 'numeric',
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })
          };

        case 'convert-date':
          // Convert between date formats
          if (!date && !timestamp) {
            return {
              success: false,
              error: 'Either date string or timestamp must be provided'
            };
          }

          let convertedDate: Date;
          let convertedTimestamp: number;

          if (timestamp) {
            // Convert from timestamp to date formats
            convertedDate = new Date(timestamp * 1000);
            convertedTimestamp = timestamp;
          } else if (date) {
            // Convert from date string to timestamp and other formats
            try {
              // Handle various date formats
              if (date.match(/^\d{4}-\d{2}-\d{2}$/)) {
                // YYYY-MM-DD format
                convertedDate = new Date(`${date}T00:00:00Z`);
              } else {
                // Try parsing as ISO or other standard format
                convertedDate = new Date(date);
              }

              if (isNaN(convertedDate.getTime())) {
                throw new Error('Invalid date format');
              }

              convertedTimestamp = Math.floor(convertedDate.getTime() / 1000);
            } catch (error) {
              return {
                success: false,
                error: 'Invalid date format. Please use ISO or YYYY-MM-DD format.'
              };
            }
          } else {
            // This should never happen due to the initial check
            return {
              success: false,
              error: 'Either date string or timestamp must be provided'
            };
          }

          return {
            success: true,
            action,
            results: {
              timestamp: convertedTimestamp,
              iso: convertedDate.toISOString(),
              ymd: convertedDate.toISOString().split('T')[0],
              formatted: formatDate(convertedTimestamp),
              humanReadable: convertedDate.toLocaleString('en-US', {
                weekday: 'short',
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })
            }
          };

        case 'get-timeframe':
          // Generate a useful timeframe for quest validation
          const numDays = days || 7; // Default to 7 days if not specified
          const endTs = Math.floor(Date.now() / 1000);
          const startTs = endTs - (numDays * 86400); // numDays in seconds

          const startDateObj = new Date(startTs * 1000);
          const endDateObj = new Date(endTs * 1000);

          return {
            success: true,
            action,
            timeframe: {
              startTimestamp: startTs,
              endTimestamp: endTs,
              startDate: startDateObj.toISOString(),
              endDate: endDateObj.toISOString(),
              startFormatted: formatDate(startTs),
              endFormatted: formatDate(endTs),
              description: `Last ${numDays} days (${formatDate(startTs)} to ${formatDate(endTs)})`,
              daysInSeconds: numDays * 86400
            }
          };

        default:
          return {
            success: false,
            error: `Unsupported action: ${action}`
          };
      }
    } catch (error) {
      console.error(`Error in blockchain data tool:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error accessing blockchain data',
        action
      };
    }
  }
});

/**
 * Helper function to determine the recommended validation type
 * based on the preview results
 */
function determineRecommendedValidation(
  swapResult: any,
  minValueResult: any | null,
  firstNBuyersResult: any | null,
  tokenPrincipal: string,
  minValue?: number,
  numUsers?: number
) {
  // If token swap validation fails, we can't proceed with more complex validations
  if (!swapResult.satisfied) {
    return {
      type: 'none',
      message: `No swaps found for ${tokenPrincipal} in the selected timeframe.`
    };
  }

  // First N buyers validation is most selective if it has results
  if (firstNBuyersResult?.satisfied) {
    return {
      type: 'first-n-buyers',
      message: `Recommend using "First ${numUsers} buyers" validation as it's working and creates exclusivity.`,
      params: {
        tokenPrincipal,
        numUsers,
        ...(minValue ? { minValue } : {})
      }
    };
  }

  // Min value validation is next best if it has results
  if (minValueResult?.satisfied) {
    return {
      type: 'min-value-swap',
      message: `Recommend using "Minimum value swap" validation with $${minValue} threshold.`,
      params: {
        tokenPrincipal,
        minValue
      }
    };
  }

  // Simple swap validation as fallback
  return {
    type: 'token-swap',
    message: `Recommend using basic "Token swap" validation as there are ${swapResult.matches.length} qualifying swaps.`,
    params: {
      tokenPrincipal
    }
  };
}