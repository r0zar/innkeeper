import { KraxelAPI } from '../kraxel-api';
import { KraxelValidation, ValidationResult, Transaction } from '../kraxel-validation';
import {
  getActiveQuests,
  createQuestValidation,
  updateQuestValidation,
  createQuestValidationResult,
  getLatestQuestValidation,
} from '../db/queries';
import { Quest } from '../db/schema';

// Configure validation frequency
const VALIDATION_FREQUENCY = {
  DEFAULT: 5 * 60 * 1000, // 5 minutes
  ERROR: 15 * 60 * 1000,  // 15 minutes after error
  SUCCESS: 10 * 60 * 1000, // 10 minutes after success
};

/**
 * Maps a Kraxel ValidationResult to a list of addresses and their validation status
 */
interface ProcessedValidationResult {
  validAddresses: string[];
  addresses: Array<{
    address: string;
    isValid: boolean;
    data: any;
  }>;
}

export class QuestValidator {
  private kraxelAPI: KraxelAPI;

  constructor() {
    this.kraxelAPI = new KraxelAPI();
  }

  /**
   * Validate all active quests
   */
  async validateAllActiveQuests() {
    const activeQuests = await getActiveQuests();
    console.log(`Found ${activeQuests.length} active quests to validate`);

    for (const quest of activeQuests) {
      await this.validateSingleQuest(quest);
    }
  }

  /**
   * Process a validation result into a standardized format
   */
  private processValidationResult(result: ValidationResult): ProcessedValidationResult {
    // Extract valid addresses from matches
    const addresses = result.matches.map(match => ({
      address: match.user_address,
      isValid: true, // All matches are valid
      data: {
        tx_id: match.tx_id,
        block_height: match.block_height,
        block_time: match.block_time,
        swap_details: match.swap_details,
        metadata: result.metadata
      }
    }));

    // Extract just the valid addresses as strings
    const validAddresses = addresses.map(addr => addr.address);

    return {
      validAddresses,
      addresses
    };
  }

  /**
   * Validate a single quest
   */
  async validateSingleQuest(quest: Quest) {
    console.log(`Validating quest: ${quest.title} (${quest.id})`);
    
    // Check if we should validate this quest now
    const lastValidation = await getLatestQuestValidation({ questId: quest.id });
    if (lastValidation && lastValidation.nextValidationAt) {
      const now = new Date();
      if (now < lastValidation.nextValidationAt) {
        console.log(`Skipping validation for quest ${quest.id}, next validation at ${lastValidation.nextValidationAt}`);
        return;
      }
    }

    const startTime = Date.now();
    
    try {
      // Create a new validation record
      const [validation] = await createQuestValidation({
        questId: quest.id,
        validationData: {
          criteria: quest.criteria,
          startTime,
        },
      });

      const validationId = validation.id;
      let validAddresses: string[] = [];
      let isSuccess = false;
      let errorMessage: string | null = null;

      try {
        // Extract criteria from the quest
        const criteria = quest.criteria;
        let validationResult: ValidationResult;
        
        // Validate based on criteria type
        switch (criteria.type) {
          case 'swappedFor': {
            // Use the KraxelValidation module with proper error handling
            const validator = KraxelValidation.swappedFor(
              criteria.params.tokenPrincipal,
              criteria.params.startTime || 0,
              criteria.params.endTime
            );
            
            validationResult = await validator.execute();
            const processed = this.processValidationResult(validationResult);
            validAddresses = processed.validAddresses;
            
            // Save individual results
            for (const address of processed.addresses) {
              await createQuestValidationResult({
                validationId,
                userAddress: address.address,
                isValid: address.isValid,
                resultData: address.data,
                criteriaType: 'swappedFor',
              });
            }
            
            isSuccess = validationResult.satisfied;
            break;
          }
          
          case 'firstNBuyers': {
            const validator = KraxelValidation.firstNBuyers(
              criteria.params.tokenPrincipal,
              criteria.params.numUsers || 10,
              criteria.params.minValueUsd || 0,
              criteria.params.startTime || 0
            );
            
            validationResult = await validator.execute();
            const processed = this.processValidationResult(validationResult);
            validAddresses = processed.validAddresses;
            
            // Save individual results
            for (const address of processed.addresses) {
              await createQuestValidationResult({
                validationId,
                userAddress: address.address,
                isValid: address.isValid,
                resultData: address.data,
                criteriaType: 'firstNBuyers',
              });
            }
            
            isSuccess = validationResult.satisfied;
            break;
          }
          
          case 'minValueSwap': {
            // For minValueSwap, we need to prepare a function to get transactions
            // or use the default implementation which gets recent swaps
            const validator = KraxelValidation.minValueSwap(
              criteria.params.minValueUsd || 0
            );
            
            validationResult = await validator.execute();
            const processed = this.processValidationResult(validationResult);
            validAddresses = processed.validAddresses;
            
            // Save individual results
            for (const address of processed.addresses) {
              await createQuestValidationResult({
                validationId,
                userAddress: address.address,
                isValid: address.isValid,
                resultData: address.data,
                criteriaType: 'minValueSwap',
              });
            }
            
            isSuccess = validationResult.satisfied;
            break;
          }
          
          case 'holdsToken': {
            // The holdsToken validator needs a user address and token principal
            // Since we might want to validate multiple addresses, we'll use a stub address
            // and then check if the criteria has an address list to validate
            const userAddress = criteria.params.userAddress || '';
            const validator = KraxelValidation.holdsToken(
              userAddress,
              criteria.params.tokenPrincipal
            );
            
            validationResult = await validator.execute();
            const processed = this.processValidationResult(validationResult);
            validAddresses = processed.validAddresses;
            
            // Save individual results
            for (const address of processed.addresses) {
              await createQuestValidationResult({
                validationId,
                userAddress: address.address,
                isValid: address.isValid,
                resultData: address.data,
                criteriaType: 'holdsToken',
              });
            }
            
            isSuccess = validationResult.satisfied;
            break;
          }
          
          default:
            throw new Error(`Unsupported criteria type: ${criteria.type}`);
        }
        
        // Calculate next validation time
        const nextValidationAt = new Date(Date.now() + VALIDATION_FREQUENCY.SUCCESS);
        
        // Update validation record
        await updateQuestValidation({
          id: validationId,
          status: isSuccess ? 'success' : 'failed',
          validAddresses,
          processingTime: Date.now() - startTime,
          nextValidationAt,
        });
        
        console.log(`Validation completed for quest ${quest.id}: ${isSuccess ? 'SUCCESS' : 'FAILED'}, found ${validAddresses.length} valid addresses`);
        
      } catch (error) {
        // Calculate next validation time with delay due to error
        const nextValidationAt = new Date(Date.now() + VALIDATION_FREQUENCY.ERROR);
        
        errorMessage = error instanceof Error ? error.message : 'Unknown error during validation';
        
        // Update validation record with error
        await updateQuestValidation({
          id: validationId,
          status: 'failed',
          errorMessage,
          processingTime: Date.now() - startTime,
          nextValidationAt,
        });
        
        console.error(`Error validating quest ${quest.id}:`, errorMessage);
      }
      
    } catch (error) {
      console.error(`Failed to create validation record for quest ${quest.id}:`, error);
    }
  }
}