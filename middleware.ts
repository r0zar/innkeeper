import NextAuth from 'next-auth';

import { authConfig } from '@/app/(auth)/auth.config';

export default NextAuth(authConfig).auth;

export const config = {
  matcher: [
    '/',
    '/:id',
    '/login',
    '/register',
    '/api/(!cron)(.*)', // Apply to all API routes except those starting with /api/cron
  ],
};
