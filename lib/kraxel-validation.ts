/**
 * Kraxel Validation
 * 
 * A flexible validation system for blockchain data that enables
 * on-chain quest validation using the Kraxel API.
 */

import kraxel, { Transaction, KraxelResponse } from './kraxel-api';

// Export Transaction type for use in other files
export type { Transaction };

// Core validation types
export interface ValidationResult {
  satisfied: boolean;
  matches: Transaction[];
  metadata?: Record<string, any>;
}

export interface ValidationQuery {
  execute(): Promise<ValidationResult>;
  and(query: ValidationQuery): ValidationQuery;
  or(query: ValidationQuery): ValidationQuery;
  not(): ValidationQuery;
}

// Types for token validation
type TokenPrincipal = string;

/**
 * Creates a base validator from a validation function
 */
function createBaseValidator(validatorFn: () => Promise<ValidationResult>): ValidationQuery {
  const validator: ValidationQuery = {
    execute: validatorFn,
    and: (query) => combinators.and(validator, query),
    or: (query) => combinators.or(validator, query),
    not: () => combinators.not(validator)
  };

  return validator;
}

/**
 * Validator combinator functions
 */
export const combinators = {
  /**
   * AND combinator - requires both validators to be satisfied
   */
  and: (left: ValidationQuery, right: ValidationQuery): ValidationQuery => {
    return createBaseValidator(async () => {
      const [leftResult, rightResult] = await Promise.all([
        left.execute(),
        right.execute()
      ]);

      // For AND, only include matches that satisfy both conditions
      const combinedMatches = leftResult.matches.filter(leftMatch =>
        rightResult.matches.some(rightMatch =>
          (leftMatch.tx_id && rightMatch.tx_id && leftMatch.tx_id === rightMatch.tx_id) ||
          (leftMatch.user_address && rightMatch.user_address && leftMatch.user_address === rightMatch.user_address)
        )
      );

      return {
        satisfied: leftResult.satisfied && rightResult.satisfied && combinedMatches.length > 0,
        matches: combinedMatches,
        metadata: {
          leftCount: leftResult.matches.length,
          rightCount: rightResult.matches.length,
          combinedCount: combinedMatches.length
        }
      };
    });
  },

  /**
   * OR combinator - satisfied if either validator is satisfied
   */
  or: (left: ValidationQuery, right: ValidationQuery): ValidationQuery => {
    return createBaseValidator(async () => {
      const [leftResult, rightResult] = await Promise.all([
        left.execute(),
        right.execute()
      ]);

      // For OR, include matches from either condition, removing duplicates
      const seenTxIds = new Set<string>();
      const combinedMatches: Transaction[] = [];

      const addUniqueMatches = (matches: Transaction[]) => {
        for (const match of matches) {
          if (match.tx_id && !seenTxIds.has(match.tx_id)) {
            seenTxIds.add(match.tx_id);
            combinedMatches.push(match);
          }
        }
      };

      addUniqueMatches(leftResult.matches);
      addUniqueMatches(rightResult.matches);

      return {
        satisfied: leftResult.satisfied || rightResult.satisfied,
        matches: combinedMatches,
        metadata: {
          leftCount: leftResult.matches.length,
          rightCount: rightResult.matches.length,
          combinedCount: combinedMatches.length
        }
      };
    });
  },

  /**
   * NOT combinator - negates the validation result
   */
  not: (validator: ValidationQuery): ValidationQuery => {
    return createBaseValidator(async () => {
      const result = await validator.execute();
      return {
        satisfied: !result.satisfied,
        matches: [], // NOT validation doesn't have matches
        metadata: {
          original: result.metadata,
          originallyMatched: result.matches.length > 0
        }
      };
    });
  }
};

/**
 * Normalizes token principal format to handle variations
 * such as different contract identifiers for the same token
 */
function normalizeTokenPrincipal(principal: string): string[] {
  // Basic normalization to handle common formats
  const normalized = principal.trim();

  // Start with the original principal
  const variations = [normalized];

  // Add variations for Welsh token and other common alternatives
  if (normalized.toLowerCase().includes('welsh')) {
    variations.push(
      'SP3NE50GEXFG9SZGTT51P40X2CKYSZ5CC4ZTZ7A2G.welshcorgicoin-token'
    );
  }

  return variations;
}

/**
 * Swap validation functions
 */

/**
 * Validates if users have swapped for a specific token
 * 
 * @param tokenPrincipal The token principal to check swaps for
 * @param startTime Optional unix timestamp to limit to swaps after this time
 * @param endTime Optional unix timestamp to limit to swaps before this time
 */
export function swappedFor(
  tokenPrincipal: TokenPrincipal,
  startTime: number = 0,
  endTime?: number
): ValidationQuery {
  return createBaseValidator(async () => {
    try {
      // Use the current time if endTime not provided
      const now = Math.floor(Date.now() / 1000);
      const effectiveEndTime = endTime || now;

      // Convert timestamps to ISO strings for the API
      const startDate = new Date(startTime * 1000).toISOString();
      const endDate = new Date(effectiveEndTime * 1000).toISOString();

      // Get all possible variations of the token principal
      const tokenVariations = normalizeTokenPrincipal(tokenPrincipal);

      // Try each token variation until we find matches
      let swaps: KraxelResponse<Transaction[]> | null = null;
      let matchingSwaps: Transaction[] = [];

      for (const tokenVariant of tokenVariations) {
        // Get swap transactions for this token variant
        swaps = await kraxel.getSwapsByContract(tokenVariant, {
          limit: 100,
          start_date: startDate,
          end_date: endDate
        });

        // Filter swaps involving the specified token
        if (swaps.data && swaps.data.length > 0) {
          matchingSwaps = swaps.data.filter(swap =>
            swap.swap_details?.some((detail, index, array) =>
              index === array.length - 1 && detail.out_asset.split('::')[0] === tokenVariant
            )
          );

          if (matchingSwaps.length > 0) {
            break; // Found matches, no need to try other variants
          }
        }
      }

      return {
        satisfied: matchingSwaps.length > 0,
        matches: matchingSwaps,
        metadata: {
          tokenPrincipal,
          startTime,
          endTime: effectiveEndTime,
          tokenVariations,
          totalFound: matchingSwaps.length
        }
      };
    } catch (error) {
      console.error('Error in swappedFor validator:', error);
      return { satisfied: false, matches: [] };
    }
  });
}

/**
 * Validates if swaps meet a minimum USD value threshold
 * 
 * @param minValueUsd Minimum USD value required
 * @param getTransactions Optional function to provide transactions to validate
 */
export function minValueSwap(
  minValueUsd: number,
  getTransactions: () => Promise<Transaction[]> = async () => {
    // Default implementation gets recent swaps
    const swaps = await kraxel.getRecentSwaps({ limit: 100 });
    return swaps.data || [];
  }
): ValidationQuery {
  return createBaseValidator(async () => {
    try {
      // Get transactions to validate
      const transactions = await getTransactions();

      // Get latest prices to calculate value
      const prices = await kraxel.getLatestPrices();
      const priceData = prices.data || {};

      // Filter transactions by minimum value
      const matchingSwaps = transactions.filter(swap => {
        // Calculate the USD value of the swap
        let swapValue = 0;

        swap.swap_details?.forEach(detail => {
          // Use token price if available, otherwise default to 0
          const inAssetPrice = priceData[detail.in_asset] || 0;
          const outAssetPrice = priceData[detail.out_asset] || 0;

          // Calculate value based on both in and out assets
          const inValue = parseFloat(detail.in_amount) * inAssetPrice;
          const outValue = parseFloat(detail.out_amount) * outAssetPrice;

          // Use the higher value (typically input and output should be close in value)
          swapValue += Math.max(inValue, outValue);
        });

        return swapValue >= minValueUsd;
      });

      return {
        satisfied: matchingSwaps.length > 0,
        matches: matchingSwaps,
        metadata: {
          minValueUsd,
          totalFound: matchingSwaps.length
        }
      };
    } catch (error) {
      console.error('Error in minValueSwap validator:', error);
      return { satisfied: false, matches: [] };
    }
  });
}

/**
 * Validates if users are among the first N buyers of a token
 * 
 * @param tokenPrincipal The token principal to check
 * @param n Number of first buyers to consider
 * @param minValueUsd Optional minimum value in USD
 * @param startTime Optional unix timestamp to start from
 */
export function firstNBuyers(
  tokenPrincipal: TokenPrincipal,
  n: number,
  minValueUsd: number = 0,
  startTime: number = 0
): ValidationQuery {
  return createBaseValidator(async () => {
    try {
      // First, get all token swaps
      const swapResult = await swappedFor(tokenPrincipal, startTime).execute();

      if (!swapResult.satisfied) {
        return {
          satisfied: false,
          matches: [],
          metadata: {
            reason: "No swaps found for token",
            token: tokenPrincipal
          }
        };
      }

      let filteredSwaps = swapResult.matches;

      // Apply minimum value filter if specified
      if (minValueUsd > 0) {
        const valueResult = await minValueSwap(
          minValueUsd,
          async () => swapResult.matches
        ).execute();

        if (!valueResult.satisfied) {
          return {
            satisfied: false,
            matches: [],
            metadata: {
              reason: "No swaps above minimum value",
              minValueUsd
            }
          };
        }

        filteredSwaps = valueResult.matches;
      }

      // Sort by block height/time to get chronological order
      filteredSwaps.sort((a, b) => {
        // First by block height
        if (a.block_height !== b.block_height) {
          return a.block_height - b.block_height;
        }
        // Then by block time if heights are the same
        return new Date(a.block_time).getTime() - new Date(b.block_time).getTime();
      });

      // Get unique addresses (first occurrence = first buyer)
      const uniqueAddresses = new Set<string>();
      const firstNBuyers: Transaction[] = [];

      for (const swap of filteredSwaps) {
        if (swap.user_address && !uniqueAddresses.has(swap.user_address)) {
          uniqueAddresses.add(swap.user_address);
          firstNBuyers.push(swap);

          if (firstNBuyers.length >= n) {
            break;
          }
        }
      }

      return {
        satisfied: firstNBuyers.length >= n,
        matches: firstNBuyers,
        metadata: {
          requestedN: n,
          actualCount: firstNBuyers.length,
          tokenPrincipal,
          minValueUsd,
          buyerAddresses: Array.from(uniqueAddresses)
        }
      };
    } catch (error) {
      console.error('Error in firstNBuyers validator:', error);
      return { satisfied: false, matches: [] };
    }
  });
}

/**
 * Validates if an address holds a specific token
 * 
 * @param userAddress Address to check
 * @param tokenPrincipal Token principal to validate holding of
 */
export function holdsToken(
  userAddress: string,
  tokenPrincipal: TokenPrincipal
): ValidationQuery {
  return createBaseValidator(async () => {
    try {
      // Get token variations to try
      const tokenVariations = normalizeTokenPrincipal(tokenPrincipal);

      // Try each variation until we get results
      for (const tokenVariant of tokenVariations) {
        const transfers = await kraxel.getTokenTransfers(
          userAddress,
          tokenVariant,
          { limit: 100 }
        );

        if (transfers.data && transfers.data.length > 0) {
          // Simple check that user has received the token
          // This is a simplification - real token balance would need more logic
          return {
            satisfied: true,
            matches: transfers.data.map(t => t as unknown as Transaction),
            metadata: {
              userAddress,
              token: tokenVariant,
              transferCount: transfers.data.length
            }
          };
        }
      }

      return {
        satisfied: false,
        matches: [],
        metadata: {
          userAddress,
          tokenPrincipal,
          reason: "No transfers found"
        }
      };
    } catch (error) {
      console.error('Error in holdsToken validator:', error);
      return { satisfied: false, matches: [] };
    }
  });
}

// Create the KraxelValidation object with all validation functions
const kraxelValidation = {
  // Core validation functions
  swappedFor,
  minValueSwap,
  firstNBuyers,
  holdsToken,

  // Combinators for complex validation rules
  combinators
};

// Export the validation functions
export { kraxelValidation as KraxelValidation };