'use client';

import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Quest } from '@/lib/db/schema';
import { StatusBadge } from './quest-status-badge';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

interface QuestsListProps {
  userId: string;
}

// Helper to get criteria summary from a criteria object
const getCriteriaSummary = (criteria: any): string => {
  if (!criteria || !criteria.type) return 'Custom validation criteria';

  const { type, params } = criteria;

  switch (type) {
    case 'swappedFor':
      return `Swap ${params.tokenToSwap} for ${params.targetToken}`;

    case 'holdsToken':
      return `Hold ${params.token}${params.minAmount ? ` (min: ${params.minAmount})` : ''}`;

    case 'firstNBuyers':
      return `Be among first ${params.n} buyers of ${params.token}`;

    case 'minValueSwap':
      return `Swap min value of ${params.minValue} for ${params.token}`;

    case 'and':
      return 'Multiple combined criteria (AND)';

    case 'or':
      return 'Alternative criteria (OR)';

    case 'not':
      return 'Negated criteria (NOT)';

    default:
      return 'Custom validation criteria';
  }
};

// Network badge component
const NetworkBadge = ({ network }: { network: string }) => {
  let color = "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300";

  switch (network.toLowerCase()) {
    case 'stacks':
    case 'stx':
      color = "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300";
      break;
    case 'bitcoin':
    case 'btc':
      color = "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300";
      break;
    case 'ethereum':
    case 'eth':
      color = "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300";
      break;
  }

  return (
    <span style={{ width: 'fit-content' }} className={cn("text-xs px-2 py-1 rounded-full font-medium", color)}>
      {network}
    </span>
  );
};

export function QuestsList({ userId }: QuestsListProps) {
  const [quests, setQuests] = useState<Quest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<string>('all');

  useEffect(() => {
    async function fetchQuests() {
      try {
        setLoading(true);
        const response = await fetch('/api/quests');

        if (!response.ok) {
          throw new Error('Failed to fetch quests');
        }

        const data = await response.json();
        setQuests(data);
      } catch (err) {
        console.error('Error fetching quests:', err);
        setError('Failed to load quests. Please try again later.');
      } finally {
        setLoading(false);
      }
    }

    fetchQuests();
  }, []);

  // Count quests by status for filter badges
  const counts = quests.reduce((acc, quest) => {
    acc.all = (acc.all || 0) + 1;
    acc[quest.status] = (acc[quest.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Filter quests based on active filter
  const filteredQuests = quests.filter(quest =>
    activeFilter === 'all' || quest.status === activeFilter
  );

  if (loading) {
    return (
      <div className="flex justify-center items-center h-40">
        <div className="animate-spin rounded-full size-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 border border-red-300 bg-red-50 text-red-700 rounded-md dark:bg-red-950/50 dark:border-red-800 dark:text-red-400">
        {error}
      </div>
    );
  }

  // QuestsFilter component
  const QuestsFilter = () => (
    <div className="flex flex-wrap gap-2 mb-4">
      <Button
        variant={activeFilter === 'all' ? "default" : "outline"}
        size="sm"
        onClick={() => setActiveFilter('all')}
      >
        All ({counts.all || 0})
      </Button>
      <Button
        variant={activeFilter === 'active' ? "default" : "outline"}
        size="sm"
        onClick={() => setActiveFilter('active')}
      >
        Active ({counts.active || 0})
      </Button>
      <Button
        variant={activeFilter === 'draft' ? "default" : "outline"}
        size="sm"
        onClick={() => setActiveFilter('draft')}
      >
        Draft ({counts.draft || 0})
      </Button>
      <Button
        variant={activeFilter === 'completed' ? "default" : "outline"}
        size="sm"
        onClick={() => setActiveFilter('completed')}
      >
        Completed ({counts.completed || 0})
      </Button>
      <Button
        variant={activeFilter === 'failed' ? "default" : "outline"}
        size="sm"
        onClick={() => setActiveFilter('failed')}
      >
        Failed ({counts.failed || 0})
      </Button>
    </div>
  );

  if (quests.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="flex items-center justify-center rounded-full w-12 h-12 bg-muted mx-auto mb-4">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-muted-foreground"
          >
            <path d="M18 6 7 17l-5-5" />
            <path d="m22 10-7.5 7.5L13 16" />
          </svg>
        </div>
        <h3 className="text-lg font-medium mb-2">No quests found</h3>
        <p className="text-muted-foreground mb-6">You haven't created any quests yet.</p>
        <Button asChild>
          <Link href="/chat">Create Your First Quest</Link>
        </Button>
      </div>
    );
  }

  const formatDate = (date: Date | string): string => {
    const d = typeof date === 'string' ? new Date(date) : date;
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }).format(d);
  };

  return (
    <div className="w-full">
      <QuestsFilter />

      <AnimatePresence>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredQuests.map((quest) => (
            <motion.div
              key={quest.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              layout
            >
              <Card className="p-4 hover:shadow-md transition-all h-full flex flex-col">
                <div className="flex justify-between items-start mb-2">
                  <div className="flex flex-col gap-1">
                    <h3 className="font-semibold text-lg">{quest.title}</h3>
                    <NetworkBadge network={quest.network} />
                  </div>
                  <StatusBadge status={quest.status} />
                </div>

                <p className="text-muted-foreground text-sm line-clamp-2 mb-3">
                  {quest.description}
                </p>

                {quest.criteria && (
                  <div className="text-xs text-muted-foreground mt-1 mb-2">
                    <span className="font-medium">Criteria: </span>
                    {getCriteriaSummary(quest.criteria)}
                  </div>
                )}

                <div className="text-xs text-muted-foreground mt-auto">
                  <div className="flex justify-between mb-1">
                    <span>Created:</span>
                    <span className="font-medium">{formatDate(quest.createdAt)}</span>
                  </div>
                  {quest.startDate && (
                    <div className="flex justify-between">
                      <span>Start Date:</span>
                      <span className="font-medium">{formatDate(quest.startDate)}</span>
                    </div>
                  )}
                  {quest.endDate && (
                    <div className="flex justify-between">
                      <span>End Date:</span>
                      <span className="font-medium">{formatDate(quest.endDate)}</span>
                    </div>
                  )}
                </div>

                <Button variant="outline" className="w-full mt-4" asChild>
                  <Link href={`/quests/${quest.id}`}>View Details</Link>
                </Button>
              </Card>
            </motion.div>
          ))}
        </div>
      </AnimatePresence>
    </div>
  );
}