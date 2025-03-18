import { tool } from 'ai';
import { z } from 'zod';

/**
 * Blockchain Date Utilities
 * 
 * Helper tool for working with blockchain dates and timeframes.
 * Provides date conversion, timeframe generation, and formatting
 * capabilities to simplify working with blockchain timestamps.
 */
export const getBlockchainDates = tool({
  description: 'Convert and generate blockchain dates and timeframes for quest validation',
  parameters: z.object({
    action: z.enum([
      'get-current-time',       // Get current blockchain time
      'convert-date',           // Convert between date formats
      'get-timeframe',          // Generate a timeframe for validation
      'format-timestamp',       // Format a timestamp for display
    ]).describe('The type of date operation to perform'),

    // Date conversion parameters
    date: z.string().optional().describe('Date string in ISO or YYYY-MM-DD format for conversion'),
    timestamp: z.number().optional().describe('Unix timestamp for conversion or formatting'),
    
    // Timeframe parameters
    days: z.number().optional().describe('Number of days for timeframe (default: 7)'),
    hours: z.number().optional().describe('Number of hours for timeframe'),
    minutes: z.number().optional().describe('Number of minutes for timeframe'),
    
    // Formatting options
    format: z.enum(['iso', 'ymd', 'readable', 'compact']).optional().describe('Format for timestamp display'),
  }),

  execute: async ({
    action,
    date,
    timestamp,
    days = 7,
    hours,
    minutes,
    format = 'readable'
  }) => {
    try {
      // Get current time
      const now = Math.floor(Date.now() / 1000);
      
      // Helpers for date formatting
      const formatTimestamp = (ts: number, fmt: string = format) => {
        const dateObj = new Date(ts * 1000);
        
        switch (fmt) {
          case 'iso':
            return dateObj.toISOString();
          case 'ymd':
            return dateObj.toISOString().split('T')[0];
          case 'compact':
            return `${dateObj.getMonth() + 1}/${dateObj.getDate()}/${dateObj.getFullYear()}`;
          case 'readable':
          default:
            return dateObj.toLocaleDateString('en-US', {
              weekday: 'short',
              year: 'numeric',
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            });
        }
      };
      
      switch (action) {
        case 'get-current-time':
          const currentDate = new Date();
          
          return {
            success: true,
            action,
            current: {
              timestamp: now,
              iso: currentDate.toISOString(),
              ymd: currentDate.toISOString().split('T')[0],
              readable: formatTimestamp(now, 'readable')
            },
            timeframes: {
              last24Hours: {
                start: now - (24 * 60 * 60),
                end: now,
                readable: `Last 24 hours (${formatTimestamp(now - (24 * 60 * 60), 'compact')} to ${formatTimestamp(now, 'compact')})`
              },
              last7Days: {
                start: now - (7 * 24 * 60 * 60),
                end: now,
                readable: `Last 7 days (${formatTimestamp(now - (7 * 24 * 60 * 60), 'compact')} to ${formatTimestamp(now, 'compact')})`
              },
              last30Days: {
                start: now - (30 * 24 * 60 * 60),
                end: now,
                readable: `Last 30 days (${formatTimestamp(now - (30 * 24 * 60 * 60), 'compact')} to ${formatTimestamp(now, 'compact')})`
              }
            },
            usage: 'Use these timestamps for validation timeframes in other blockchain tools.'
          };
          
        case 'convert-date':
          // Check if we have input to convert
          if (!date && !timestamp) {
            return {
              success: false,
              error: 'Either date string or timestamp must be provided'
            };
          }
          
          let convertedDate: Date;
          let convertedTimestamp: number;
          
          if (timestamp !== undefined) {
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
            // Should never reach here due to the initial check
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
              readable: formatTimestamp(convertedTimestamp, 'readable')
            },
            usage: 'Use this timestamp in blockchain validation tools to set precise timeframes.'
          };
        
        case 'get-timeframe':
          // Calculate the total seconds for the timeframe
          const totalSeconds = (days * 86400) + 
            (hours ? hours * 3600 : 0) + 
            (minutes ? minutes * 60 : 0);
          
          if (totalSeconds <= 0) {
            return {
              success: false,
              error: 'Please provide a positive duration for the timeframe'
            };
          }
          
          const endTs = now;
          const startTs = endTs - totalSeconds;
          
          const startDateObj = new Date(startTs * 1000);
          const endDateObj = new Date(endTs * 1000);
          
          // Create a human-readable description
          let description = '';
          if (days > 0) {
            description += `${days} day${days !== 1 ? 's' : ''}`;
          }
          if (hours) {
            description += description ? ', ' : '';
            description += `${hours} hour${hours !== 1 ? 's' : ''}`;
          }
          if (minutes) {
            description += description ? ', ' : '';
            description += `${minutes} minute${minutes !== 1 ? 's' : ''}`;
          }
          
          return {
            success: true,
            action,
            timeframe: {
              startTimestamp: startTs,
              endTimestamp: endTs,
              startDate: startDateObj.toISOString(),
              endDate: endDateObj.toISOString(),
              start: formatTimestamp(startTs),
              end: formatTimestamp(endTs),
              description: `Last ${description} (${formatTimestamp(startTs, 'compact')} to ${formatTimestamp(endTs, 'compact')})`,
              durationInSeconds: totalSeconds
            },
            usage: 'Use these timestamps in validation tools to set the timeframe for quest criteria.',
            examples: [
              {
                tool: 'validateBlockchainCriteria',
                action: 'validate-token-swap',
                params: {
                  tokenPrincipal: 'SP2C2YFP12AJZB4MABJBAJ55XECVS7E4PMMZ89YZR.welshcorgicoin-token',
                  startTime: startTs,
                  endTime: endTs
                }
              }
            ]
          };
          
        case 'format-timestamp':
          if (timestamp === undefined) {
            return {
              success: false,
              error: 'Timestamp is required for this action'
            };
          }
          
          return {
            success: true,
            action,
            formats: {
              iso: formatTimestamp(timestamp, 'iso'),
              ymd: formatTimestamp(timestamp, 'ymd'),
              readable: formatTimestamp(timestamp, 'readable'),
              compact: formatTimestamp(timestamp, 'compact')
            },
            timeAgo: getTimeAgo(timestamp, now),
            usage: 'Use these formatted dates in user communications or for display purposes.'
          };
          
        default:
          return {
            success: false,
            error: `Unsupported action: ${action}`
          };
      }
    } catch (error) {
      console.error(`Error in blockchain dates tool:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error processing blockchain dates',
        action
      };
    }
  }
});

/**
 * Helper function to get a human-readable "time ago" string
 */
function getTimeAgo(timestamp: number, now: number): string {
  const diff = now - timestamp;
  
  if (diff < 0) {
    return 'in the future';
  }
  
  if (diff < 60) {
    return `${diff} second${diff !== 1 ? 's' : ''} ago`;
  }
  
  if (diff < 3600) {
    const minutes = Math.floor(diff / 60);
    return `${minutes} minute${minutes !== 1 ? 's' : ''} ago`;
  }
  
  if (diff < 86400) {
    const hours = Math.floor(diff / 3600);
    return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
  }
  
  if (diff < 2592000) { // 30 days
    const days = Math.floor(diff / 86400);
    return `${days} day${days !== 1 ? 's' : ''} ago`;
  }
  
  if (diff < 31536000) { // 365 days
    const months = Math.floor(diff / 2592000);
    return `${months} month${months !== 1 ? 's' : ''} ago`;
  }
  
  const years = Math.floor(diff / 31536000);
  return `${years} year${years !== 1 ? 's' : ''} ago`;
}