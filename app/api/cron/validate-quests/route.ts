import { NextResponse } from 'next/server';
import { QuestValidator } from '@/lib/quest/validator';

/**
 * Vercel Cron job to validate all active quests
 * Triggered according to cron schedule defined in vercel.json
 * 
 * @returns 200 OK if validation completed successfully
 */
export async function GET() {
  try {
    console.log('Starting quest validation cron job');

    // Create validator and run validation
    const validator = new QuestValidator();
    await validator.validateAllActiveQuests();

    console.log('Quest validation completed successfully');

    // Return success
    return NextResponse.json(
      { success: true, message: 'Quest validation completed successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error in quest validation cron job:', error);

    // Return error
    return NextResponse.json(
      {
        success: false,
        message: 'Quest validation failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * Vercel Cron configuration
 * This is not part of the Next.js API but used by Vercel to configure the cron job
 * 
 * Run every 5 minutes
 */
export const config = {
  maxDuration: 300, // 5 minutes in seconds
};