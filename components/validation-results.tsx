'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { cn } from '@/lib/utils';

interface Transaction {
  tx_id?: string;
  user_address?: string;
  block_height?: number;
  block_time?: string;
  swap_details?: {
    in_asset: string;
    in_amount: string;
    out_asset: string;
    out_amount: string;
  }[];
  [key: string]: any;
}

interface ValidationResult {
  satisfied: boolean;
  matches: Transaction[];
  metadata?: Record<string, any>;
}

interface ValidationResultsProps {
  result: ValidationResult;
  title?: string;
  description?: string;
}

// Helper function to format token amounts
const formatTokenAmount = (amount: string): string => {
  const num = parseFloat(amount);
  if (isNaN(num)) return amount;

  // Format with appropriate precision based on size
  if (num < 0.0001) return num.toExponential(4);
  if (num < 1) return num.toFixed(6);
  if (num < 1000) return num.toFixed(2);

  return num.toLocaleString('en-US', { maximumFractionDigits: 2 });
};

// Helper to format date/time
const formatDateTime = (dateString: string): string => {
  if (!dateString) return '';

  try {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    }).format(date);
  } catch (e) {
    return dateString;
  }
};

// Helper to truncate addresses/hashes
const truncateAddress = (address: string, first = 6, last = 4): string => {
  if (!address) return '';
  if (address.length <= first + last) return address;
  return `${address.substring(0, first)}...${address.substring(address.length - last)}`;
};

// Metadata display component
const MetadataDisplay = ({ metadata }: { metadata: Record<string, any> }) => {
  const [expanded, setExpanded] = useState(false);

  // Filter out complex objects for simple display
  const simpleMetadata = Object.entries(metadata).filter(([_, value]) => {
    const type = typeof value;
    return type === 'string' || type === 'number' || type === 'boolean';
  });

  // If we have arrays, show a count instead of the full array
  const arrayMetadata = Object.entries(metadata).filter(([_, value]) => {
    return Array.isArray(value);
  }).map(([key, value]) => {
    return [key, `Array [${(value as any[]).length} items]`];
  });

  const combinedMetadata = [...simpleMetadata, ...arrayMetadata];

  if (Object.keys(metadata).length === 0) {
    return null;
  }

  return (
    <div className="mt-4 space-y-2">
      <div className="flex justify-between items-center">
        <h4 className="text-sm font-medium">Metadata</h4>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setExpanded(!expanded)}
        >
          {expanded ? 'Collapse' : 'Expand'}
        </Button>
      </div>

      {expanded && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
          {combinedMetadata.map(([key, value]) => (
            <div key={key} className="flex justify-between p-2 bg-muted/40 rounded">
              <span className="font-medium">{key}:</span>
              <span className="truncate max-w-[200px]">{String(value)}</span>
            </div>
          ))}

          {combinedMetadata.length === 0 && (
            <div className="text-xs text-muted-foreground">
              No simple metadata available
            </div>
          )}
        </div>
      )}

      {expanded && Object.keys(metadata).length > combinedMetadata.length && (
        <div className="text-xs text-muted-foreground mt-1">
          Some complex metadata is not shown
        </div>
      )}

      {!expanded && (
        <div className="text-xs text-muted-foreground">
          Click Expand to view {Object.keys(metadata).length} metadata fields
        </div>
      )}
    </div>
  );
};

// Transaction table for displaying matches
const TransactionTable = ({ transactions }: { transactions: Transaction[] }) => {
  const [page, setPage] = useState(0);
  const pageSize = 5;
  const totalPages = Math.ceil(transactions.length / pageSize);

  const paginatedTransactions = transactions.slice(
    page * pageSize,
    (page + 1) * pageSize
  );

  if (transactions.length === 0) {
    return (
      <div className="text-center py-6 text-muted-foreground">
        No transactions found
      </div>
    );
  }

  return (
    <div className="mt-2">
      <div className="overflow-x-auto">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr className="border-b">
              <th className="text-left py-2 font-medium">TX Hash</th>
              <th className="text-left py-2 font-medium">User</th>
              <th className="text-left py-2 font-medium">Time</th>
              <th className="text-left py-2 font-medium">Details</th>
            </tr>
          </thead>
          <tbody>
            {paginatedTransactions.map((tx, index) => (
              <tr
                key={tx.tx_id || index}
                className={cn(
                  "border-b",
                  index % 2 === 0 ? "bg-background" : "bg-muted/20"
                )}
              >
                <td className="py-2">
                  {tx.tx_id ? (
                    <a
                      href={`https://explorer.stacks.co/txid/${tx.tx_id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 dark:text-blue-400 hover:underline font-mono text-xs"
                      title={tx.tx_id}
                    >
                      {truncateAddress(tx.tx_id)}
                    </a>
                  ) : (
                    <span className="text-muted-foreground">N/A</span>
                  )}
                </td>
                <td className="py-2">
                  {tx.user_address ? (
                    <a
                      href={`https://explorer.stacks.co/address/${tx.user_address}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 dark:text-blue-400 hover:underline font-mono text-xs"
                      title={tx.user_address}
                    >
                      {truncateAddress(tx.user_address)}
                    </a>
                  ) : (
                    <span className="text-muted-foreground">N/A</span>
                  )}
                </td>
                <td className="py-2">
                  {tx.block_time ? (
                    <span title={formatDateTime(tx.block_time)}>
                      {formatDateTime(tx.block_time)}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">N/A</span>
                  )}
                </td>
                <td className="py-2">
                  {tx.swap_details && tx.swap_details.length > 0 ? (
                    <div className="flex flex-col gap-1">
                      {tx.swap_details.map((swap, i) => {
                        // Extract readable token names
                        const inAssetName = swap.in_asset.includes('::') 
                          ? swap.in_asset.split('::')[1]?.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
                          : swap.in_asset.includes('.') 
                            ? swap.in_asset.split('.')[1]?.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
                            : truncateAddress(swap.in_asset, 4, 4);
                            
                        const outAssetName = swap.out_asset.includes('::') 
                          ? swap.out_asset.split('::')[1]?.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
                          : swap.out_asset.includes('.') 
                            ? swap.out_asset.split('.')[1]?.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
                            : truncateAddress(swap.out_asset, 4, 4);
                        
                        return (
                          <div key={i} className="flex items-center gap-1 text-[10px]">
                            <span className="font-medium">{formatTokenAmount(swap.in_amount)}</span>
                            <span 
                              className="text-muted-foreground" 
                              title={swap.in_asset}
                            >
                              {inAssetName || truncateAddress(swap.in_asset, 4, 4)}
                            </span>
                            <span className="mx-1">→</span>
                            <span className="font-medium">{formatTokenAmount(swap.out_amount)}</span>
                            <span 
                              className="text-muted-foreground"
                              title={swap.out_asset}
                            >
                              {outAssetName || truncateAddress(swap.out_asset, 4, 4)}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <span className="text-muted-foreground">
                      {tx.block_height ? `Block #${tx.block_height}` : 'No details'}
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex justify-between items-center mt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage(Math.max(0, page - 1))}
            disabled={page === 0}
          >
            Previous
          </Button>

          <span className="text-xs">
            Page {page + 1} of {totalPages}
          </span>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
            disabled={page === totalPages - 1}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
};

export function ValidationResults({
  result,
  title = "Validation Results",
  description = "Details of blockchain validation"
}: ValidationResultsProps) {
  return (
    <Card className="w-full">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <div className="max-w-[85%]">
            {title && title.length > 40 && title.includes('SP') ? (
              <>
                <CardTitle className="text-base">
                  {title.split(' ').map((word, index, array) => {
                    // Check if this word looks like a contract principal
                    if (word.length > 20 && (word.startsWith('SP') || word.includes('.'))) {
                      const truncated = `${word.substring(0, 8)}...${word.substring(word.length - 6)}`;
                      return (
                        <span key={index} className="font-mono" title={word}>
                          {index > 0 ? ' ' : ''}
                          {truncated}
                          {index < array.length - 1 ? ' ' : ''}
                        </span>
                      );
                    }
                    return (
                      <span key={index}>
                        {index > 0 ? ' ' : ''}
                        {word}
                        {index < array.length - 1 ? ' ' : ''}
                      </span>
                    );
                  })}
                </CardTitle>
                <div className="text-xs text-muted-foreground mt-1 font-mono hover:text-clip cursor-help" title={title}>
                  Full validation: {title}
                </div>
              </>
            ) : (
              <CardTitle className="text-base">{title}</CardTitle>
            )}
            <CardDescription>{description}</CardDescription>
          </div>
          
          <Badge 
            variant={result.satisfied ? "success" : "destructive"}
            className="capitalize"
          >
            {result.satisfied ? "Satisfied" : "Failed"}
          </Badge>
        </div>
      </CardHeader>

      <CardContent>
        <Tabs defaultValue="summary">
          <TabsList className="grid grid-cols-3 mb-4">
            <TabsTrigger value="summary">Summary</TabsTrigger>
            <TabsTrigger value="transactions">
              Transactions ({result.matches.length})
            </TabsTrigger>
            <TabsTrigger value="metadata">Metadata</TabsTrigger>
          </TabsList>

          <TabsContent value="summary" className="space-y-4">
            <div>
              <h3 className="text-sm font-medium mb-2">Result Status</h3>
              <div className={cn(
                "p-3 rounded-md text-sm",
                result.satisfied
                  ? "bg-green-50 border border-green-200 text-green-700 dark:bg-green-950/40 dark:border-green-900 dark:text-green-400"
                  : "bg-red-50 border border-red-200 text-red-700 dark:bg-red-950/40 dark:border-red-900 dark:text-red-400"
              )}>
                {result.satisfied
                  ? `Validation passed with ${result.matches.length} matching transactions`
                  : "Validation failed - criteria not met"
                }
              </div>
            </div>

            <div>
              <h3 className="text-sm font-medium mb-2">Key Information</h3>
              <div className="grid grid-cols-2 gap-2">
                <div className="p-2 bg-muted/30 rounded text-xs">
                  <span className="block text-muted-foreground mb-1">Transactions Found</span>
                  <span className="font-medium">{result.matches.length}</span>
                </div>

                {result.metadata?.tokenPrincipal && (
                  <div className="p-2 bg-muted/30 rounded text-xs">
                    <span className="block text-muted-foreground mb-1">Token</span>
                    <span className="font-medium font-mono truncate block" title={result.metadata.tokenPrincipal}>
                      {truncateAddress(result.metadata.tokenPrincipal, 10, 5)}
                    </span>
                  </div>
                )}

                {result.metadata?.startTime && (
                  <div className="p-2 bg-muted/30 rounded text-xs">
                    <span className="block text-muted-foreground mb-1">Start Time</span>
                    <span className="font-medium">
                      {formatDateTime(new Date(result.metadata.startTime * 1000).toISOString())}
                    </span>
                  </div>
                )}

                {result.metadata?.endTime && (
                  <div className="p-2 bg-muted/30 rounded text-xs">
                    <span className="block text-muted-foreground mb-1">End Time</span>
                    <span className="font-medium">
                      {formatDateTime(new Date(result.metadata.endTime * 1000).toISOString())}
                    </span>
                  </div>
                )}

                {result.metadata?.minValueUsd !== undefined && (
                  <div className="p-2 bg-muted/30 rounded text-xs">
                    <span className="block text-muted-foreground mb-1">Min Value (USD)</span>
                    <span className="font-medium">${result.metadata.minValueUsd.toFixed(2)}</span>
                  </div>
                )}

                {result.metadata?.requestedN !== undefined && (
                  <div className="p-2 bg-muted/30 rounded text-xs">
                    <span className="block text-muted-foreground mb-1">Requested N Buyers</span>
                    <span className="font-medium">{result.metadata.requestedN}</span>
                  </div>
                )}

                {result.metadata?.actualCount !== undefined && (
                  <div className="p-2 bg-muted/30 rounded text-xs">
                    <span className="block text-muted-foreground mb-1">Actual Count</span>
                    <span className="font-medium">{result.metadata.actualCount}</span>
                  </div>
                )}
              </div>
            </div>

            {result.matches.length > 0 && (
              <div>
                <h3 className="text-sm font-medium mb-2">Recent Transactions</h3>
                <TransactionTable transactions={result.matches.slice(0, 3)} />

                {result.matches.length > 3 && (
                  <div className="text-center mt-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs"
                      onClick={() => document.querySelector('[data-value="transactions"]')?.click()}
                    >
                      View all {result.matches.length} transactions
                    </Button>
                  </div>
                )}
              </div>
            )}
          </TabsContent>

          <TabsContent value="transactions">
            <TransactionTable transactions={result.matches} />
          </TabsContent>

          <TabsContent value="metadata">
            {result.metadata ? (
              <div className="space-y-4">
                <div className="border rounded-md p-4 bg-muted/20">
                  <pre className="text-xs overflow-auto max-h-96">
                    {JSON.stringify(result.metadata, null, 2)}
                  </pre>
                </div>

                <div className="text-xs text-muted-foreground">
                  Metadata contains additional information about the validation process and results.
                </div>
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                No metadata available for this validation
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}