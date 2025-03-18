import { loadEnvConfig } from '@next/env';
import { beforeAll } from 'vitest';

console.log(__dirname)

loadEnvConfig(__dirname, true); // true forces reload

// Add any other test setup needed
beforeAll(() => {
    // Verify required env vars are present
    const requiredEnvVars = ['POSTGRES_URL'];

    requiredEnvVars.forEach(envVar => {
        if (!process.env[envVar]) {
            throw new Error(`Missing required environment variable: ${envVar}`);
        }
    });
});
