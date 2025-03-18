import { describe, it, expect, afterAll, vi } from 'vitest';

// Mock the server-only module before importing modules that use it
vi.mock('server-only', () => ({}));

// Now import your modules that depend on server-only
import { createQuest, getQuestById, deleteQuestById, getUser } from '../lib/db/queries';

// Sample quest data
const sampleQuest = {
  title: `Test Quest ${Date.now()}`,
  description: 'A test quest created for testing purposes',
  network: 'stacks',
  tokenAddress: '0x742d35Cc6634C0532925a3b844Bc454e4438f44e',
  criteria: {
    type: 'swappedFor',
    params: {
      tokenPrincipal: '0x742d35Cc6634C0532925a3b844Bc454e4438f44e',
      minValue: 10
    }
  },
  userId: 'a73c1bee-e428-4847-b536-325190902d7e', // my user id
  status: 'draft' as any,
  startDate: new Date(),
  endDate: new Date(Date.now() + 86400000) // 1 day from now
};

describe('Quest Database Operations', () => {
  let testQuestId: string | undefined;

  // Cleanup after all tests
  afterAll(async () => {
    if (testQuestId) {
      await deleteQuestById({ id: testQuestId });
    }
  });

  it('should create a quest successfully', async () => {

    // Act
    const result = await createQuest(sampleQuest);

    // Save the ID for cleanup
    testQuestId = result[0].id;
  });

  it('should retrieve a quest by ID', async () => {
    // Skip if we don't have a test quest ID
    if (!testQuestId) {
      return;
    }

    // Act
    const quest = await getQuestById({ id: testQuestId });

    // Assert
    expect(quest).toBeDefined();
    expect(quest?.id).toEqual(testQuestId);
    expect(quest?.title).toContain('Test Quest');
    expect(quest?.network).toEqual('stacks');
    expect(quest?.tokenAddress).toEqual('0x742d35Cc6634C0532925a3b844Bc454e4438f44e');
    expect(quest?.criteria).toMatchObject({
      type: 'swappedFor',
      params: {
        tokenPrincipal: '0x742d35Cc6634C0532925a3b844Bc454e4438f44e',
        minValue: 10
      }
    });
  });
});