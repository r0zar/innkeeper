'use client';

import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Quest } from '@/lib/db/schema';

interface QuestsListProps {
  userId: string;
}

export function QuestsList({ userId }: QuestsListProps) {
  const [quests, setQuests] = useState<Quest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  if (loading) {
    return (
      <div className="flex justify-center items-center h-40">
        <div className="animate-spin rounded-full size-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 border border-red-300 bg-red-50 text-red-700 rounded-md">
        {error}
      </div>
    );
  }

  if (quests.length === 0) {
    return (
      <div className="text-center py-12">
        <h3 className="text-lg font-medium mb-2">No quests found</h3>
        <p className="text-muted-foreground mb-6">You haven't created any quests yet.</p>
        <Button asChild>
          <Link href="/chat">Create Your First Quest</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {quests.map((quest) => (
        <Card key={quest.id} className="p-4 hover:shadow-md transition-shadow">
          <div className="flex flex-col h-full">
            <div className="flex justify-between items-start mb-2">
              <h3 className="font-semibold text-lg">{quest.title}</h3>
              <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(quest.status)}`}>
                {quest.status}
              </span>
            </div>
            
            <p className="text-muted-foreground text-sm line-clamp-2 mb-3">
              {quest.description}
            </p>
            
            <div className="text-xs text-muted-foreground mt-auto">
              <div className="flex justify-between mb-1">
                <span>Network:</span>
                <span className="font-medium">{quest.network}</span>
              </div>
              <div className="flex justify-between">
                <span>Created:</span>
                <span className="font-medium">{formatDate(quest.createdAt)}</span>
              </div>
            </div>
            
            <Button variant="outline" className="w-full mt-4" asChild>
              <Link href={`/quests/${quest.id}`}>View Details</Link>
            </Button>
          </div>
        </Card>
      ))}
    </div>
  );
}

function getStatusColor(status: string): string {
  switch (status) {
    case 'draft':
      return 'bg-gray-100 text-gray-800';
    case 'active':
      return 'bg-green-100 text-green-800';
    case 'completed':
      return 'bg-blue-100 text-blue-800';
    case 'archived':
      return 'bg-amber-100 text-amber-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
}

function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString();
}