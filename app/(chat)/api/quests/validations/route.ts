import { auth } from '@/app/(auth)/auth';
import { NextRequest } from 'next/server';
import { 
  getQuestById, 
  getQuestValidationsByQuestId, 
  getQuestValidationResults 
} from '@/lib/db/queries';

/**
 * API endpoint to get validation results for a specific quest
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session || !session.user || !session.user.id) {
      return new Response('Unauthorized', { status: 401 });
    }

    // Get quest ID from query params
    const { searchParams } = new URL(request.url);
    const questId = searchParams.get('questId');
    const validationId = searchParams.get('validationId');
    
    if (!questId) {
      return new Response('Missing required parameter: questId', { status: 400 });
    }

    // First, verify that the user has access to this quest
    const quest = await getQuestById({ id: questId });
    if (!quest) {
      return new Response('Quest not found', { status: 404 });
    }

    if (quest.userId !== session.user.id) {
      return new Response('Unauthorized to access this quest', { status: 403 });
    }

    // If validationId is provided, get details for that specific validation
    if (validationId) {
      const results = await getQuestValidationResults({ validationId });
      return Response.json(results);
    }

    // Otherwise, get all validations for this quest
    const validations = await getQuestValidationsByQuestId({ questId });
    return Response.json(validations);
  } catch (error) {
    console.error('Error fetching quest validations:', error);
    return new Response('An error occurred while fetching quest validations', { status: 500 });
  }
}