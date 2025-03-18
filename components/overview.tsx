import { motion } from 'framer-motion';
import Link from 'next/link';

import { MessageIcon, VercelIcon } from './icons';

export const Overview = () => {
  return (
    <motion.div
      key="overview"
      className="max-w-3xl mx-auto md:mt-20"
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.98 }}
      transition={{ delay: 0.5 }}
    >
      <div className="rounded-xl p-6 flex flex-col gap-8 leading-relaxed text-center max-w-xl">
        <div className="flex flex-row justify-center gap-4 items-center">
          <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M13 3L16.293 6.293C16.6835 6.68353 16.6835 7.31647 16.293 7.70701L13 11" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            <path d="M5 7.5H15" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            <path d="M11 13L7.70701 16.293C7.31647 16.6835 6.68353 16.6835 6.29299 16.293L3 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            <path d="M19 16.5H9" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            <path d="M21 21H3" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>
        </div>
        <div className="text-xl font-semibold mb-2">
          Blockchain Quest Builder
        </div>
        <div>
          Create quests that validate on-chain actions like token swaps and holdings.
        </div>
        <div className="text-sm text-muted-foreground mb-4">
          Just ask: "Create a quest for the first 10 buyers of Welsh token"
        </div>
        
        <div>
          <Link
            href="/quests"
            className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-md shadow-sm hover:bg-primary/90 transition-colors"
          >
            View My Quests
          </Link>
        </div>
      </div>
    </motion.div>
  );
};
