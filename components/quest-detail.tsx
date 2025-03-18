'use client';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Quest } from '@/lib/db/schema';
import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ChevronDown, ChevronUp, Calendar, Activity, Check, X, Trash2 } from 'lucide-react';
import { QuestValidationList } from './quest-validation-list';

interface QuestDetailProps {
  quest: Quest;
}

export function QuestDetail({ quest }: QuestDetailProps) {
  const [showCriteria, setShowCriteria] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [currentQuest, setCurrentQuest] = useState<Quest>(quest);
  const router = useRouter();

  return (
    <div>
      <div className="mb-6">
        <Link href="/quests" className="text-sm flex items-center text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-4 mr-1" /> Back to Quests
        </Link>
      </div>

      <div className="flex flex-col md:flex-row justify-between items-start gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold">{currentQuest.title}</h1>
            <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(currentQuest.status)}`}>
              {currentQuest.status}
            </span>
          </div>
          <p className="text-muted-foreground mt-1">{currentQuest.description}</p>
        </div>

        <div className="flex gap-3">
          <Button variant="outline">Export</Button>
          <Button 
            variant={currentQuest.status === 'active' ? 'destructive' : 'default'}
            onClick={async () => {
              if (isUpdating) return;
              
              try {
                setIsUpdating(true);
                const newStatus = currentQuest.status === 'active' ? 'draft' : 'active';
                
                const response = await fetch('/api/quests', {
                  method: 'PATCH',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    id: currentQuest.id,
                    status: newStatus
                  })
                });
                
                if (response.ok) {
                  setCurrentQuest({
                    ...currentQuest,
                    status: newStatus
                  });
                } else {
                  console.error('Failed to update quest status');
                }
              } catch (error) {
                console.error('Error updating quest:', error);
              } finally {
                setIsUpdating(false);
              }
            }}
            disabled={isUpdating}
          >
            {isUpdating ? 'Updating...' : 
              currentQuest.status === 'active' ? 'Deactivate' : 'Activate'} Quest
          </Button>
          <Button
            variant="destructive"
            size="icon"
            onClick={async () => {
              if (isUpdating) return;
              if (!confirm('Are you sure you want to delete this quest? This action cannot be undone.')) {
                return;
              }
              
              try {
                setIsUpdating(true);
                const response = await fetch(`/api/quests?id=${currentQuest.id}`, {
                  method: 'DELETE'
                });
                
                if (response.ok) {
                  router.push('/quests');
                } else {
                  console.error('Failed to delete quest');
                }
              } catch (error) {
                console.error('Error deleting quest:', error);
              } finally {
                setIsUpdating(false);
              }
            }}
            disabled={isUpdating}
          >
            <Trash2 className="size-4" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card className="p-4">
          <div className="flex items-center mb-2">
            <Activity className="size-5 mr-2 text-muted-foreground" />
            <h3 className="font-medium">Network</h3>
          </div>
          <p className="text-sm">{currentQuest.network}</p>
        </Card>

        <Card className="p-4">
          <div className="flex items-center mb-2">
            <Calendar className="size-5 mr-2 text-muted-foreground" />
            <h3 className="font-medium">Date Range</h3>
          </div>
          <p className="text-sm">
            {currentQuest.startDate ? formatDate(currentQuest.startDate) : 'No start date'} - 
            {currentQuest.endDate ? formatDate(currentQuest.endDate) : 'No end date'}
          </p>
        </Card>

        <Card className="p-4">
          <div className="flex items-center mb-2">
            <Calendar className="size-5 mr-2 text-muted-foreground" />
            <h3 className="font-medium">Created</h3>
          </div>
          <p className="text-sm">{formatDate(currentQuest.createdAt)}</p>
        </Card>
      </div>

      <Tabs defaultValue="details" className="mb-6">
        <TabsList>
          <TabsTrigger value="details">Quest Details</TabsTrigger>
          <TabsTrigger value="validations">Validations</TabsTrigger>
        </TabsList>
        
        <TabsContent value="details" className="mt-4 space-y-6">
          <Card className="p-4">
            <button 
              className="w-full flex justify-between items-center"
              onClick={() => setShowCriteria(!showCriteria)}
            >
              <h3 className="font-medium">Validation Criteria</h3>
              {showCriteria ? <ChevronUp className="size-5" /> : <ChevronDown className="size-5" />}
            </button>
            
            {showCriteria && (
              <div className="mt-4 border-t pt-4">
                <h4 className="font-medium mb-2">Token Address</h4>
                <code className="block bg-muted p-2 rounded text-sm mb-4 break-all">
                  {currentQuest.tokenAddress}
                </code>
                
                <h4 className="font-medium mb-2">Criteria</h4>
                <pre className="bg-muted p-3 rounded text-xs overflow-auto max-h-[400px]">
                  {JSON.stringify(currentQuest.criteria, null, 2)}
                </pre>

                <div className="mt-4 border-t pt-4">
                  <h4 className="font-medium mb-2">Criteria Type</h4>
                  <div className="flex items-center">
                    <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-sm">
                      {currentQuest.criteria.type}
                    </span>
                  </div>
                  
                  <h4 className="font-medium mt-4 mb-2">Parameters</h4>
                  <div className="space-y-2">
                    {Object.entries(currentQuest.criteria.params).map(([key, value]) => (
                      <div key={key} className="flex justify-between items-center bg-muted/50 p-2 rounded">
                        <span className="text-sm font-medium">{key}:</span>
                        <span className="text-sm">{typeof value === 'object' ? JSON.stringify(value) : String(value)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </Card>

          <Card className="p-4">
            <h3 className="font-medium mb-4">Status Updates</h3>
            <div className="border-l-2 border-muted pl-4 space-y-4">
              <div>
                <div className="flex items-center">
                  <span className="bg-green-100 text-green-800 p-1 rounded-full mr-2">
                    <Check className="size-3" />
                  </span>
                  <p className="text-sm font-medium">Quest Created</p>
                  <span className="text-xs text-muted-foreground ml-auto">{formatDate(currentQuest.createdAt)}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">Quest was successfully created with status: draft</p>
              </div>
              
              {currentQuest.status !== 'draft' && (
                <div>
                  <div className="flex items-center">
                    <span className="bg-blue-100 text-blue-800 p-1 rounded-full mr-2">
                      <Activity className="size-3" />
                    </span>
                    <p className="text-sm font-medium">Quest Activated</p>
                    <span className="text-xs text-muted-foreground ml-auto">
                      {currentQuest.startDate ? formatDate(currentQuest.startDate) : formatDate(currentQuest.createdAt)}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Quest was activated and is now live</p>
                </div>
              )}
            </div>
          </Card>
        </TabsContent>
        
        <TabsContent value="validations" className="mt-4">
          <QuestValidationList questId={currentQuest.id} />
        </TabsContent>
      </Tabs>
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
  return d.toLocaleDateString(undefined, { 
    year: 'numeric', 
    month: 'short', 
    day: 'numeric' 
  });
}