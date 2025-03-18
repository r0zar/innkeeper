import { DataStreamWriter, tool } from 'ai';
import { Session } from 'next-auth';
import { z } from 'zod';
import { createQuest as createQuestDB } from '@/lib/db/queries';

interface CreateQuestProps {
  session: Session;
  dataStream: DataStreamWriter;
}

// Define the criteria schema
const criteriaSchema = z.object({
  type: z.enum([
    'swappedFor',
    'firstNBuyers',
    'minValueSwap',
    'holdsToken',
    'and',
    'or',
    'not'
  ]),
  params: z.record(z.any()),
});

export const createQuest = ({ session, dataStream }: CreateQuestProps) => tool({
  description: 'Create a blockchain quest with validation criteria',
  parameters: z.object({
    title: z.string().min(3).max(100),
    description: z.string().min(10),
    network: z.string(),
    tokenAddress: z.string(),
    criteria: criteriaSchema,
    startDate: z.string().optional(),
    endDate: z.string().optional(),
  }),
  execute: async ({ title, description, network, tokenAddress, criteria, startDate, endDate }) => {
    if (!session.user?.id) {
      throw new Error('User not authenticated');
    }

    try {
      // Signal the start of quest creation
      dataStream.writeData({
        type: 'quest-creation-start',
        content: title,
      });

      // Parse dates if they exist
      const startDateObj = startDate ? new Date(startDate) : null;
      const endDateObj = endDate ? new Date(endDate) : null;

      // Create the quest in the database
      const result = await createQuestDB({
        title,
        description,
        network,
        tokenAddress,
        criteria,
        startDate: startDateObj,
        endDate: endDateObj,
        userId: session.user.id,
        status: 'draft', // Default to draft status
      });

      console.log(result)

      // Signal quest created successfully
      dataStream.writeData({
        type: 'quest-creation-complete',
        content: JSON.stringify({
          questId: result[0]?.id,
          title,
        }),
      });

      return {
        success: true,
        message: `Quest "${title}" created successfully`,
        questId: result[0]?.id,
      };
    } catch (error) {
      console.error('Error creating quest:', error);

      dataStream.writeData({
        type: 'quest-creation-error',
        content: error instanceof Error ? error.message : 'Unknown error occurred',
      });

      throw new Error(
        `Failed to create quest: ${error instanceof Error ? error.message : 'Unknown error occurred'}`
      );
    }
  },
});