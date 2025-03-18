'use client';

import { ReactNode, useState } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from './ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Badge } from './ui/badge';
import { cn } from '@/lib/utils';

// Interface for validation criteria
interface ValidationCriteria {
  type: 'swappedFor' | 'firstNBuyers' | 'minValueSwap' | 'holdsToken' | 'and' | 'or' | 'not';
  params: Record<string, any>;
}

// Interface for validation results
interface ValidationResult {
  id: string;
  questId: string;
  timestamp: string;
  success: boolean;
  message?: string;
  details?: any;
}

// Interface for a quest
interface QuestProps {
  id: string;
  title: string;
  description: string;
  network: string;
  tokenAddress: string;
  criteria: ValidationCriteria;
  status: 'draft' | 'active' | 'completed' | 'failed';
  createdAt: string;
  lastValidated?: string;
  validationResults?: ValidationResult[];
  onStatusChange?: (status: string) => void;
}

// Helper function to format criteria for display
const formatCriteria = (criteria: ValidationCriteria): ReactNode => {
  const { type, params } = criteria;
  
  switch (type) {
    case 'swappedFor':
      return (
        <div className="flex flex-col gap-1">
          <Badge variant="outline" className="w-fit">swappedFor</Badge>
          <div className="text-sm">
            <span className="font-medium">Token:</span> {params.tokenToSwap}
          </div>
          <div className="text-sm">
            <span className="font-medium">Target:</span> {params.targetToken}
          </div>
          {params.minAmount && (
            <div className="text-sm">
              <span className="font-medium">Min Amount:</span> {params.minAmount}
            </div>
          )}
        </div>
      );
      
    case 'holdsToken':
      return (
        <div className="flex flex-col gap-1">
          <Badge variant="outline" className="w-fit">holdsToken</Badge>
          <div className="text-sm">
            <span className="font-medium">Token:</span> {params.token}
          </div>
          {params.minAmount && (
            <div className="text-sm">
              <span className="font-medium">Min Amount:</span> {params.minAmount}
            </div>
          )}
        </div>
      );
      
    case 'firstNBuyers':
      return (
        <div className="flex flex-col gap-1">
          <Badge variant="outline" className="w-fit">firstNBuyers</Badge>
          <div className="text-sm">
            <span className="font-medium">Token:</span> {params.token}
          </div>
          <div className="text-sm">
            <span className="font-medium">Limit:</span> {params.n} buyers
          </div>
        </div>
      );
      
    case 'minValueSwap':
      return (
        <div className="flex flex-col gap-1">
          <Badge variant="outline" className="w-fit">minValueSwap</Badge>
          <div className="text-sm">
            <span className="font-medium">Token:</span> {params.token}
          </div>
          <div className="text-sm">
            <span className="font-medium">Min Value:</span> {params.minValue}
          </div>
        </div>
      );
      
    case 'and':
      return (
        <div className="flex flex-col gap-2 border-l-2 pl-3 border-blue-300">
          <Badge variant="outline" className="w-fit">AND</Badge>
          {params.conditions?.map((condition: ValidationCriteria, index: number) => (
            <div key={index} className="ml-2">
              {formatCriteria(condition)}
            </div>
          ))}
        </div>
      );
      
    case 'or':
      return (
        <div className="flex flex-col gap-2 border-l-2 pl-3 border-amber-300">
          <Badge variant="outline" className="w-fit">OR</Badge>
          {params.conditions?.map((condition: ValidationCriteria, index: number) => (
            <div key={index} className="ml-2">
              {formatCriteria(condition)}
            </div>
          ))}
        </div>
      );
      
    case 'not':
      return (
        <div className="flex flex-col gap-2 border-l-2 pl-3 border-red-300">
          <Badge variant="outline" className="w-fit">NOT</Badge>
          <div className="ml-2">
            {formatCriteria(params.condition)}
          </div>
        </div>
      );
      
    default:
      return <pre className="text-xs">{JSON.stringify(criteria, null, 2)}</pre>;
  }
};

// Status badge component
const StatusBadge = ({ status }: { status: string }) => {
  let variant: 
    | 'default'
    | 'secondary'
    | 'destructive'
    | 'outline'
    | null
    | undefined = 'default';
    
  switch (status) {
    case 'draft':
      variant = 'secondary';
      break;
    case 'active':
      variant = 'default';
      break;
    case 'completed':
      variant = 'outline';
      break;
    case 'failed':
      variant = 'destructive';
      break;
  }
  
  return (
    <Badge variant={variant} className="capitalize">
      {status}
    </Badge>
  );
};

// Format date for display
const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date);
};

export function Quest({
  id,
  title,
  description,
  network,
  tokenAddress,
  criteria,
  status,
  createdAt,
  lastValidated,
  validationResults = [],
  onStatusChange
}: QuestProps) {
  const [activeTab, setActiveTab] = useState<string>('details');
  
  // Status change handler
  const handleStatusChange = (newStatus: string) => {
    if (onStatusChange) {
      onStatusChange(newStatus);
    }
  };
  
  // Sort validation results by timestamp (newest first)
  const sortedResults = [...validationResults].sort((a, b) => 
    new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );
  
  return (
    <Card className="w-full max-w-[650px]">
      <CardHeader className="pb-2">
        <div className="flex justify-between">
          <div>
            <CardTitle className="text-xl">{title}</CardTitle>
            <CardDescription className="mt-1 text-sm text-muted-foreground">
              Created {formatDate(createdAt)}
            </CardDescription>
          </div>
          <StatusBadge status={status} />
        </div>
      </CardHeader>
      
      <Tabs defaultValue="details" value={activeTab} onValueChange={setActiveTab}>
        <div className="px-6">
          <TabsList className="grid grid-cols-2">
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="validations" className="relative">
              Validations
              {validationResults.length > 0 && (
                <span className="absolute -top-1 -right-1 size-5 flex items-center justify-center text-xs bg-primary text-primary-foreground rounded-full">
                  {validationResults.length}
                </span>
              )}
            </TabsTrigger>
          </TabsList>
        </div>
        
        <TabsContent value="details" className="m-0 pt-2">
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">Description</p>
              <p className="text-sm mt-1">{description}</p>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Network</p>
                <p className="text-sm font-medium mt-1">{network}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Token</p>
                <p className="text-sm font-mono mt-1 truncate" title={tokenAddress}>
                  {tokenAddress.slice(0, 6)}...{tokenAddress.slice(-4)}
                </p>
              </div>
            </div>
            
            <div>
              <p className="text-sm text-muted-foreground">Validation Criteria</p>
              <div className="mt-2 border rounded-md p-3 bg-muted/30">
                {formatCriteria(criteria)}
              </div>
            </div>
            
            {lastValidated && (
              <div>
                <p className="text-sm text-muted-foreground">Last Validated</p>
                <p className="text-sm mt-1">{formatDate(lastValidated)}</p>
              </div>
            )}
          </CardContent>
        </TabsContent>
        
        <TabsContent value="validations" className="m-0 pt-2">
          <CardContent>
            {sortedResults.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-6 text-center">
                <p className="text-muted-foreground">No validation results yet</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Validations run automatically every 4 hours
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {sortedResults.map((result) => (
                  <div 
                    key={result.id}
                    className={cn(
                      "border rounded-md p-3",
                      result.success 
                        ? "border-green-200 bg-green-50 dark:bg-green-950/30 dark:border-green-900" 
                        : "border-red-200 bg-red-50 dark:bg-red-950/30 dark:border-red-900"
                    )}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <Badge 
                          variant={result.success ? "outline" : "destructive"}
                          className="mb-2"
                        >
                          {result.success ? "Success" : "Failed"}
                        </Badge>
                        <p className="text-sm">
                          {result.message || (result.success ? "Validation successful" : "Validation failed")}
                        </p>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(result.timestamp)}
                      </p>
                    </div>
                    
                    {result.details && (
                      <div className="mt-2 pt-2 border-t border-border/50">
                        <p className="text-xs text-muted-foreground mb-1">Details:</p>
                        <pre className="text-xs overflow-auto max-h-32 p-2 bg-background rounded">
                          {JSON.stringify(result.details, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </TabsContent>
      </Tabs>
      
      <CardFooter className="flex justify-between border-t p-4 mt-2">
        <div className="flex gap-2">
          {status === 'draft' && (
            <Button 
              variant="default" 
              size="sm"
              onClick={() => handleStatusChange('active')}
            >
              Activate
            </Button>
          )}
          
          {status === 'active' && (
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => handleStatusChange('draft')}
            >
              Return to Draft
            </Button>
          )}
          
          {(status === 'completed' || status === 'failed') && (
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => handleStatusChange('active')}
            >
              Reactivate
            </Button>
          )}
        </div>
        
        <Button 
          variant="ghost" 
          size="sm"
          onClick={() => setActiveTab(activeTab === 'details' ? 'validations' : 'details')}
        >
          View {activeTab === 'details' ? 'Validations' : 'Details'}
        </Button>
      </CardFooter>
    </Card>
  );
}