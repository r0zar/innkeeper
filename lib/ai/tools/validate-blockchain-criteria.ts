import { tool } from 'ai';
import { z } from 'zod';
import { KraxelValidation } from '../../../lib/kraxel-validation';

/**
 * Blockchain Criteria Validation Tool
 * 
 * Validate on-chain criteria for quest building, including token swaps, holdings, and
 * participation in specific actions. This tool helps determine if users meet the conditions
 * required for quest completion.
 * 
 * Use this tool when:
 * - Testing quest criteria against actual on-chain data
 * - Checking if certain addresses meet specific conditions
 * - Previewing validation options for quest design
 */
export const validateBlockchainCriteria = tool({
  description: 'Validate on-chain criteria for quest building, such as token swaps and holdings',
  parameters: z.object({
    action: z.enum([
      'validate-token-swap',       // Check if users have swapped a specific token
      'validate-first-n-buyers',   // Identify first N buyers of a specific token
      'validate-min-value-swap',   // Validate swaps with minimum USD value
      'validate-token-holding',    // Check if users hold a specific token
      'preview-quest-validation',  // Preview multiple validation options
      'check-address',             // Check if a specific address meets criteria
    ]).describe('The type of validation to perform'),

    // Main parameters
    tokenPrincipal: z.string().optional().describe('The token principal identifier (contract.token::name format)'),
    userAddress: z.string().optional().describe('The blockchain user address to validate'),

    // Quest-specific parameters
    minValue: z.number().optional().describe('Minimum USD value threshold for the validation'),
    numUsers: z.number().optional().describe('Number of users to validate (for first-n-buyers)'),
    startTime: z.number().optional().describe('Start time for validation period (Unix timestamp)'),
    endTime: z.number().optional().describe('End time for validation period (Unix timestamp)'),

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
              timeframe: timeframeStr,
              matched: swapResult.matches.length,
              satisfied: swapResult.satisfied
            },
            // Return a subset of matches to avoid overwhelming the response
            sampleMatches: swapResult.matches.slice(0, limit),
            questFormat: {
              type: 'token-swap',
              params: { tokenPrincipal, startTime: defaultStartTime, endTime: defaultEndTime }
            },
            userGuidance: `This validation checks if users have swapped ${tokenPrincipal} during the timeframe. It found ${swapResult.matches.length} matching transactions.`
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
              timeframe: timeframeStr,
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
            })),
            questFormat: {
              type: 'first-n-buyers',
              params: { 
                tokenPrincipal, 
                numUsers, 
                minValue: buyerMinValue,
                startTime: defaultStartTime 
              }
            },
            userGuidance: `This validation identifies the first ${numUsers} unique buyers of ${tokenPrincipal}${buyerMinValue > 0 ? ` who spent at least $${buyerMinValue}` : ''} since ${formatDate(defaultStartTime)}.`
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
              timeframe: timeframeStr,
              matched: minValueResult.matches.length,
              satisfied: minValueResult.satisfied
            },
            // Return a subset of matches to avoid overwhelming the response
            sampleMatches: minValueResult.matches.slice(0, limit).map(tx => ({
              address: tx.user_address,
              tx_id: tx.tx_id,
              block_time: tx.block_time,
              value: tx.swap_details?.reduce((sum, detail) => {
                return sum + (parseFloat(detail.in_amount) || 0);
              }, 0) || 'unknown'
            })),
            questFormat: {
              type: 'min-value-swap',
              params: { 
                tokenPrincipal, 
                minValue,
                startTime: defaultStartTime,
                endTime: defaultEndTime 
              }
            },
            userGuidance: `This validation checks for swaps of ${tokenPrincipal} with minimum value of $${minValue} during the timeframe. It found ${minValueResult.matches.length} qualifying transactions.`
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
              satisfied: holdingResult.satisfied
            },
            transfers: holdingResult.matches.slice(0, limit),
            questFormat: {
              type: 'token-holding',
              params: { tokenPrincipal, userAddress }
            },
            userGuidance: `This validation checks if the address ${userAddress} currently holds ${tokenPrincipal}. Result: ${holdingResult.satisfied ? 'Address holds the token' : 'Address does not hold the token'}.`
          };

        case 'preview-quest-validation':
          if (!tokenPrincipal) {
            return {
              success: false,
              error: 'Token principal is required for quest preview'
            };
          }

          // Run validation simulations in parallel
          const [basicSwapResult, minValueSwapResult, firstNBuyersResult] = await Promise.all([
            // Basic swap
            KraxelValidation.swappedFor(tokenPrincipal, defaultStartTime, defaultEndTime).execute(),
            
            // Min value swap (if applicable)
            minValue ? KraxelValidation.combinators.and(
              KraxelValidation.swappedFor(tokenPrincipal, defaultStartTime, defaultEndTime),
              KraxelValidation.minValueSwap(minValue)
            ).execute() : null,
            
            // First N buyers (if applicable)
            numUsers ? KraxelValidation.firstNBuyers(
              tokenPrincipal, 
              numUsers, 
              minValue || 0, 
              defaultStartTime
            ).execute() : null
          ]);

          // Find the recommended validation strategy
          let recommended: { type: string; message: string; params: any } = { 
            type: 'none', 
            message: '', 
            params: {} 
          };
          
          if (!basicSwapResult.satisfied) {
            recommended = {
              type: 'none',
              message: `No swaps found for ${tokenPrincipal} in the specified timeframe. Consider a different token or timeframe.`,
              params: {}
            };
          } 
          else if (firstNBuyersResult?.satisfied) {
            recommended = {
              type: 'first-n-buyers',
              message: `Recommend "First ${numUsers} buyers" validation as it creates exclusivity.`,
              params: {
                tokenPrincipal,
                numUsers,
                startTime: defaultStartTime,
                ...(minValue ? { minValue } : {})
              }
            };
          }
          else if (minValueSwapResult?.satisfied) {
            recommended = {
              type: 'min-value-swap',
              message: `Recommend "Minimum value swap" validation with $${minValue} threshold.`,
              params: {
                tokenPrincipal,
                minValue,
                startTime: defaultStartTime,
                endTime: defaultEndTime
              }
            };
          }
          else {
            recommended = {
              type: 'token-swap',
              message: `Recommend "Token swap" validation as there are ${basicSwapResult.matches.length} qualifying transactions.`,
              params: {
                tokenPrincipal,
                startTime: defaultStartTime,
                endTime: defaultEndTime
              }
            };
          }

          return {
            success: true,
            action,
            timeframe: timeframeStr,
            validationOptions: {
              basicSwap: {
                criteria: `Swapped for ${tokenPrincipal}`,
                matched: basicSwapResult.matches.length,
                satisfied: basicSwapResult.satisfied
              },
              ...(minValueSwapResult ? {
                minValueSwap: {
                  criteria: `Swapped for ${tokenPrincipal} with min value $${minValue}`,
                  matched: minValueSwapResult.matches.length,
                  satisfied: minValueSwapResult.satisfied
                }
              } : {}),
              ...(firstNBuyersResult ? {
                firstNBuyers: {
                  criteria: `First ${numUsers} buyers of ${tokenPrincipal}`,
                  matched: firstNBuyersResult.matches.length,
                  satisfied: firstNBuyersResult.satisfied,
                  winningAddresses: firstNBuyersResult.matches.slice(0, numUsers || 3).map(tx => tx.user_address)
                }
              } : {})
            },
            recommendation: recommended,
            userGuidance: `Based on the on-chain activity for ${tokenPrincipal}, we recommend the ${recommended.type} validation. This will give you ${recommended.type === 'first-n-buyers' ? 'an exclusive group of early participants' : recommended.type === 'min-value-swap' ? 'participants who are more invested' : 'the most participants'}.`
          };
          
        case 'check-address':
          if (!userAddress || !tokenPrincipal) {
            return {
              success: false,
              error: 'Both userAddress and tokenPrincipal are required for this action'
            };
          }
          
          // Check user against different validation criteria
          const [holdsTokenResult, swappedTokenResult] = await Promise.all([
            KraxelValidation.holdsToken(userAddress, tokenPrincipal).execute(),
            KraxelValidation.swappedFor(tokenPrincipal, defaultStartTime, defaultEndTime)
              .execute()
              .then(result => {
                // Filter results for this specific user address
                const matchesForUser = result.matches.filter(tx => 
                  tx.user_address === userAddress
                );
                return {
                  ...result,
                  satisfied: matchesForUser.length > 0,
                  matches: matchesForUser
                };
              })
          ]);
          
          // Also check if user is among first N buyers if applicable
          let firstNBuyerStatus = null;
          if (numUsers) {
            const firstNBuyersResult = await KraxelValidation.firstNBuyers(
              tokenPrincipal,
              numUsers,
              minValue || 0,
              defaultStartTime
            ).execute();
            
            const userAddresses = firstNBuyersResult.matches.map(tx => tx.user_address);
            const userPosition = userAddresses.indexOf(userAddress) + 1; // +1 for 1-based indexing
            
            firstNBuyerStatus = {
              isFirstNBuyer: userPosition > 0,
              position: userPosition > 0 ? userPosition : null,
              qualifies: userPosition > 0 && userPosition <= numUsers
            };
          }
          
          return {
            success: true,
            action,
            userAddress,
            tokenPrincipal,
            timeframe: timeframeStr,
            validationResults: {
              holdsToken: holdsTokenResult.satisfied,
              swappedToken: swappedTokenResult.satisfied,
              ...(swappedTokenResult.satisfied ? {
                swapCount: swappedTokenResult.matches.length,
                firstSwap: swappedTokenResult.matches[0]?.block_time
              } : {}),
              ...(firstNBuyerStatus ? { 
                firstNBuyer: firstNBuyerStatus 
              } : {})
            },
            summary: `Address ${userAddress} ${holdsTokenResult.satisfied ? 'holds' : 'does not hold'} ${tokenPrincipal} and ${swappedTokenResult.satisfied ? 'has swapped' : 'has not swapped'} this token during the timeframe${firstNBuyerStatus ? (firstNBuyerStatus.qualifies ? ` and qualifies as buyer #${firstNBuyerStatus.position}` : ' but is not among the first N buyers') : ''}.`,
            userGuidance: 'This shows the validation status for a specific address against different quest criteria. You can use these results to decide which validation types would include or exclude this address.'
          };
          
        default:
          return {
            success: false,
            error: `Unsupported action: ${action}`
          };
      }
    } catch (error) {
      console.error(`Error in blockchain validation:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error during blockchain validation',
        action
      };
    }
  }
});