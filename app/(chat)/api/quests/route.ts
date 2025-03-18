import { auth } from '@/app/(auth)/auth';
import { getQuestsByUserId, getQuestById, updateQuestById, deleteQuestById } from '@/lib/db/queries';
import { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session || !session.user || !session.user.id) {
      return new Response('Unauthorized', { status: 401 });
    }

    // Check if specific quest ID is requested
    const { searchParams } = new URL(request.url);
    const questId = searchParams.get('id');

    if (questId) {
      // Get specific quest by ID
      const quest = await getQuestById({ id: questId });
      
      // Verify ownership
      if (quest && quest.userId !== session.user.id) {
        return new Response('Unauthorized to access this quest', { status: 403 });
      }
      
      if (!quest) {
        return new Response('Quest not found', { status: 404 });
      }
      
      return Response.json(quest);
    } else {
      // Get all quests for user
      const quests = await getQuestsByUserId({ userId: session.user.id });
      return Response.json(quests);
    }
  } catch (error) {
    console.error('Error fetching quests:', error);
    return new Response('An error occurred while fetching quests', { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await auth();

    if (!session || !session.user || !session.user.id) {
      return new Response('Unauthorized', { status: 401 });
    }

    const { id, status, title, description } = await request.json();
    
    if (!id) {
      return new Response('Quest ID is required', { status: 400 });
    }

    // Get quest to verify ownership
    const quest = await getQuestById({ id });
    
    if (!quest) {
      return new Response('Quest not found', { status: 404 });
    }

    // Verify ownership
    if (quest.userId !== session.user.id) {
      return new Response('Unauthorized to update this quest', { status: 403 });
    }

    // Update quest
    const updates: any = {};
    if (status !== undefined) updates.status = status;
    if (title !== undefined) updates.title = title;
    if (description !== undefined) updates.description = description;

    await updateQuestById({
      id,
      ...updates
    });

    return new Response('Quest updated successfully', { status: 200 });
  } catch (error) {
    console.error('Error updating quest:', error);
    return new Response('An error occurred while updating the quest', { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await auth();

    if (!session || !session.user || !session.user.id) {
      return new Response('Unauthorized', { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return new Response('Quest ID is required', { status: 400 });
    }

    // Get quest to verify ownership
    const quest = await getQuestById({ id });
    
    if (!quest) {
      return new Response('Quest not found', { status: 404 });
    }

    // Verify ownership
    if (quest.userId !== session.user.id) {
      return new Response('Unauthorized to delete this quest', { status: 403 });
    }

    // Delete quest
    await deleteQuestById({ id });

    return new Response('Quest deleted successfully', { status: 200 });
  } catch (error) {
    console.error('Error deleting quest:', error);
    return new Response('An error occurred while deleting the quest', { status: 500 });
  }
}