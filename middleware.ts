import NextAuth from 'next-auth';

import { authConfig } from '@/app/(auth)/auth.config';

export default NextAuth(authConfig).auth;

export const config = {
  matcher: [
    '/',
    '/:id',
    '/login',
    '/register',

    // Exclude the cron job endpoint from authentication
    // '/api/cron(.*)',
    // '/api/(.*)',
  ],
};
