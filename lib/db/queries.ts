import 'server-only';

import { genSaltSync, hashSync } from 'bcrypt-ts';
import { and, asc, desc, eq, gt, gte, inArray } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

import {
  user,
  chat,
  type User,
  document,
  type Suggestion,
  suggestion,
  message,
  vote,
  type DBMessage,
  quest,
  type Quest,
  questValidation,
  type QuestValidation,
  questValidationResult,
  type QuestValidationResult,
} from './schema';
import { ArtifactKind } from '@/components/artifact';

// Optionally, if not using email/pass login, you can
// use the Drizzle adapter for Auth.js / NextAuth
// https://authjs.dev/reference/adapter/drizzle

// biome-ignore lint: Forbidden non-null assertion.
const client = postgres(process.env.POSTGRES_URL!);
const db = drizzle(client);

export async function getUser(email: string): Promise<Array<User>> {
  try {
    return await db.select().from(user).where(eq(user.email, email));
  } catch (error) {
    console.error('Failed to get user from database');
    throw error;
  }
}

export async function createUser(email: string, password: string) {
  const salt = genSaltSync(10);
  const hash = hashSync(password, salt);

  try {
    return await db.insert(user).values({ email, password: hash });
  } catch (error) {
    console.error('Failed to create user in database');
    throw error;
  }
}

export async function saveChat({
  id,
  userId,
  title,
}: {
  id: string;
  userId: string;
  title: string;
}) {
  try {
    return await db.insert(chat).values({
      id,
      createdAt: new Date(),
      userId,
      title,
    });
  } catch (error) {
    console.error('Failed to save chat in database');
    throw error;
  }
}

export async function deleteChatById({ id }: { id: string }) {
  try {
    await db.delete(vote).where(eq(vote.chatId, id));
    await db.delete(message).where(eq(message.chatId, id));

    return await db.delete(chat).where(eq(chat.id, id));
  } catch (error) {
    console.error('Failed to delete chat by id from database');
    throw error;
  }
}

export async function getChatsByUserId({ id }: { id: string }) {
  try {
    return await db
      .select()
      .from(chat)
      .where(eq(chat.userId, id))
      .orderBy(desc(chat.createdAt));
  } catch (error) {
    console.error('Failed to get chats by user from database');
    throw error;
  }
}

export async function getChatById({ id }: { id: string }) {
  try {
    const [selectedChat] = await db.select().from(chat).where(eq(chat.id, id));
    return selectedChat;
  } catch (error) {
    console.error('Failed to get chat by id from database');
    throw error;
  }
}

export async function saveMessages({
  messages,
}: {
  messages: Array<DBMessage>;
}) {
  try {
    return await db.insert(message).values(messages);
  } catch (error) {
    console.error('Failed to save messages in database', error);
    throw error;
  }
}

export async function getMessagesByChatId({ id }: { id: string }) {
  try {
    return await db
      .select()
      .from(message)
      .where(eq(message.chatId, id))
      .orderBy(asc(message.createdAt));
  } catch (error) {
    console.error('Failed to get messages by chat id from database', error);
    throw error;
  }
}

export async function voteMessage({
  chatId,
  messageId,
  type,
}: {
  chatId: string;
  messageId: string;
  type: 'up' | 'down';
}) {
  try {
    const [existingVote] = await db
      .select()
      .from(vote)
      .where(and(eq(vote.messageId, messageId)));

    if (existingVote) {
      return await db
        .update(vote)
        .set({ isUpvoted: type === 'up' })
        .where(and(eq(vote.messageId, messageId), eq(vote.chatId, chatId)));
    }
    return await db.insert(vote).values({
      chatId,
      messageId,
      isUpvoted: type === 'up',
    });
  } catch (error) {
    console.error('Failed to upvote message in database', error);
    throw error;
  }
}

export async function getVotesByChatId({ id }: { id: string }) {
  try {
    return await db.select().from(vote).where(eq(vote.chatId, id));
  } catch (error) {
    console.error('Failed to get votes by chat id from database', error);
    throw error;
  }
}

export async function saveDocument({
  id,
  title,
  kind,
  content,
  userId,
}: {
  id: string;
  title: string;
  kind: ArtifactKind;
  content: string;
  userId: string;
}) {
  try {
    return await db.insert(document).values({
      id,
      title,
      kind,
      content,
      userId,
      createdAt: new Date(),
    });
  } catch (error) {
    console.error('Failed to save document in database');
    throw error;
  }
}

export async function getDocumentsById({ id }: { id: string }) {
  try {
    const documents = await db
      .select()
      .from(document)
      .where(eq(document.id, id))
      .orderBy(asc(document.createdAt));

    return documents;
  } catch (error) {
    console.error('Failed to get document by id from database');
    throw error;
  }
}

export async function getDocumentById({ id }: { id: string }) {
  try {
    const [selectedDocument] = await db
      .select()
      .from(document)
      .where(eq(document.id, id))
      .orderBy(desc(document.createdAt));

    return selectedDocument;
  } catch (error) {
    console.error('Failed to get document by id from database');
    throw error;
  }
}

export async function deleteDocumentsByIdAfterTimestamp({
  id,
  timestamp,
}: {
  id: string;
  timestamp: Date;
}) {
  try {
    await db
      .delete(suggestion)
      .where(
        and(
          eq(suggestion.documentId, id),
          gt(suggestion.documentCreatedAt, timestamp),
        ),
      );

    return await db
      .delete(document)
      .where(and(eq(document.id, id), gt(document.createdAt, timestamp)));
  } catch (error) {
    console.error(
      'Failed to delete documents by id after timestamp from database',
    );
    throw error;
  }
}

export async function saveSuggestions({
  suggestions,
}: {
  suggestions: Array<Suggestion>;
}) {
  try {
    return await db.insert(suggestion).values(suggestions);
  } catch (error) {
    console.error('Failed to save suggestions in database');
    throw error;
  }
}

export async function getSuggestionsByDocumentId({
  documentId,
}: {
  documentId: string;
}) {
  try {
    return await db
      .select()
      .from(suggestion)
      .where(and(eq(suggestion.documentId, documentId)));
  } catch (error) {
    console.error(
      'Failed to get suggestions by document version from database',
    );
    throw error;
  }
}

export async function getMessageById({ id }: { id: string }) {
  try {
    return await db.select().from(message).where(eq(message.id, id));
  } catch (error) {
    console.error('Failed to get message by id from database');
    throw error;
  }
}

export async function deleteMessagesByChatIdAfterTimestamp({
  chatId,
  timestamp,
}: {
  chatId: string;
  timestamp: Date;
}) {
  try {
    const messagesToDelete = await db
      .select({ id: message.id })
      .from(message)
      .where(
        and(eq(message.chatId, chatId), gte(message.createdAt, timestamp)),
      );

    const messageIds = messagesToDelete.map((message) => message.id);

    if (messageIds.length > 0) {
      await db
        .delete(vote)
        .where(
          and(eq(vote.chatId, chatId), inArray(vote.messageId, messageIds)),
        );

      return await db
        .delete(message)
        .where(
          and(eq(message.chatId, chatId), inArray(message.id, messageIds)),
        );
    }
  } catch (error) {
    console.error(
      'Failed to delete messages by id after timestamp from database',
    );
    throw error;
  }
}

export async function updateChatVisiblityById({
  chatId,
  visibility,
}: {
  chatId: string;
  visibility: 'private' | 'public';
}) {
  try {
    return await db.update(chat).set({ visibility }).where(eq(chat.id, chatId));
  } catch (error) {
    console.error('Failed to update chat visibility in database');
    throw error;
  }
}

// Quest related database operations

export async function createQuest({
  title,
  description,
  criteria,
  network,
  tokenAddress,
  userId,
  startDate,
  endDate,
  status = 'draft',
}: Omit<Quest, 'id' | 'createdAt'> & { id?: string }) {
  try {
    return await db.insert(quest).values({
      id: undefined, // Will use defaultRandom() from schema
      title,
      description,
      criteria,
      network,
      tokenAddress,
      startDate,
      endDate,
      status,
      userId,
      createdAt: new Date(),
    }).returning();
  } catch (error) {
    console.error('Failed to create quest in database');
    throw error;
  }
}

export async function getQuestById({ id }: { id: string }) {
  try {
    const [questData] = await db.select().from(quest).where(eq(quest.id, id));
    return questData;
  } catch (error) {
    console.error('Failed to get quest by id from database');
    throw error;
  }
}

export async function getQuestsByUserId({ userId }: { userId: string }) {
  try {
    return await db
      .select()
      .from(quest)
      .where(eq(quest.userId, userId))
      .orderBy(desc(quest.createdAt));
  } catch (error) {
    console.error('Failed to get quests by user id from database');
    throw error;
  }
}

export async function updateQuestById({
  id,
  title,
  description,
  criteria,
  network,
  tokenAddress,
  startDate,
  endDate,
  status,
}: Partial<Quest> & { id: string }) {
  try {
    const updates: Partial<Quest> = {};

    if (title !== undefined) updates.title = title;
    if (description !== undefined) updates.description = description;
    if (criteria !== undefined) updates.criteria = criteria;
    if (network !== undefined) updates.network = network;
    if (tokenAddress !== undefined) updates.tokenAddress = tokenAddress;
    if (startDate !== undefined) updates.startDate = startDate;
    if (endDate !== undefined) updates.endDate = endDate;
    if (status !== undefined) updates.status = status;

    return await db.update(quest).set(updates).where(eq(quest.id, id)).returning();
  } catch (error) {
    console.error('Failed to update quest in database');
    throw error;
  }
}

export async function deleteQuestById({ id }: { id: string }) {
  try {
    // First delete all validation results for this quest
    const validations = await db
      .select({ id: questValidation.id })
      .from(questValidation)
      .where(eq(questValidation.questId, id));
    
    for (const validation of validations) {
      await db
        .delete(questValidationResult)
        .where(eq(questValidationResult.validationId, validation.id));
    }
    
    // Delete all validations for this quest
    await db.delete(questValidation).where(eq(questValidation.questId, id));
    
    // Finally delete the quest
    return await db.delete(quest).where(eq(quest.id, id)).returning();
  } catch (error) {
    console.error('Failed to delete quest by id from database');
    throw error;
  }
}

// Quest Validation Functions

export async function getActiveQuests() {
  try {
    return await db
      .select()
      .from(quest)
      .where(eq(quest.status, 'active'));
  } catch (error) {
    console.error('Failed to get active quests from database');
    throw error;
  }
}

export async function createQuestValidation({
  questId,
  validationData,
  status = 'pending',
  nextValidationAt,
}: {
  questId: string;
  validationData: any;
  status?: 'pending' | 'success' | 'failed' | 'partial';
  nextValidationAt?: Date;
}) {
  try {
    return await db.insert(questValidation).values({
      questId,
      validationData,
      status,
      validatedAt: new Date(),
      nextValidationAt,
      processingTime: 0, // Will be updated after processing
    }).returning();
  } catch (error) {
    console.error('Failed to create quest validation in database');
    throw error;
  }
}

export async function updateQuestValidation({
  id,
  status,
  errorMessage,
  validAddresses,
  processingTime,
  nextValidationAt,
}: {
  id: string;
  status?: 'pending' | 'success' | 'failed' | 'partial';
  errorMessage?: string;
  validAddresses?: string[];
  processingTime?: number;
  nextValidationAt?: Date;
}) {
  try {
    const updates: Partial<QuestValidation> = {};
    
    if (status !== undefined) updates.status = status;
    if (errorMessage !== undefined) updates.errorMessage = errorMessage;
    if (validAddresses !== undefined) updates.validAddresses = validAddresses;
    if (processingTime !== undefined) updates.processingTime = processingTime;
    if (nextValidationAt !== undefined) updates.nextValidationAt = nextValidationAt;
    
    return await db.update(questValidation).set(updates).where(eq(questValidation.id, id)).returning();
  } catch (error) {
    console.error('Failed to update quest validation in database');
    throw error;
  }
}

export async function getQuestValidationsByQuestId({ questId }: { questId: string }) {
  try {
    return await db
      .select()
      .from(questValidation)
      .where(eq(questValidation.questId, questId))
      .orderBy(desc(questValidation.validatedAt));
  } catch (error) {
    console.error('Failed to get quest validations by quest id from database');
    throw error;
  }
}

export async function createQuestValidationResult({
  validationId,
  userAddress,
  isValid,
  resultData,
  criteriaType,
}: {
  validationId: string;
  userAddress: string;
  isValid: boolean;
  resultData: any;
  criteriaType: string;
}) {
  try {
    return await db.insert(questValidationResult).values({
      validationId,
      userAddress,
      isValid,
      resultData,
      validatedAt: new Date(),
      criteriaType,
    }).returning();
  } catch (error) {
    console.error('Failed to create quest validation result in database');
    throw error;
  }
}

export async function getQuestValidationResults({
  validationId,
}: {
  validationId: string;
}) {
  try {
    return await db
      .select()
      .from(questValidationResult)
      .where(eq(questValidationResult.validationId, validationId));
  } catch (error) {
    console.error('Failed to get quest validation results from database');
    throw error;
  }
}

export async function getLatestQuestValidation({ questId }: { questId: string }) {
  try {
    const [validation] = await db
      .select()
      .from(questValidation)
      .where(eq(questValidation.questId, questId))
      .orderBy(desc(questValidation.validatedAt))
      .limit(1);
    
    return validation;
  } catch (error) {
    console.error('Failed to get latest quest validation from database');
    throw error;
  }
}
