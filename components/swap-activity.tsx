'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { cn } from '@/lib/utils';
import { ArrowDownUp, Clock, ExternalLink, User } from 'lucide-react';

interface SwapDetail {
  in_asset: string;
  in_amount: string;
  out_asset: string;
  out_amount: string;
}

interface Transaction {
  tx_id?: string;
  user_address?: string;
  block_height?: number;
  block_time?: string;
  swap_details?: SwapDetail[];
  [key: string]: any;
}

interface Transfer {
  tx_id: string;
  sender: string;
  recipient: string;
  amount: string;
  token: string;
  timestamp: string;
  [key: string]: any;
}

interface SwapActivityProps {
  swaps?: Transaction[];
  transfers?: Transfer[];
  timeframe?: string;
  userAddress?: string;
  tokenName?: string;
}

// Helper to format token amounts
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
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  } catch (e) {
    return dateString;
  }
};

// Helper to truncate addresses/hashes
const truncateAddress = (address: string | undefined, first = 6, last = 4): string => {
  if (!address) return '';
  if (address.length <= first + last + 3) return address;
  return `${address.substring(0, first)}...${address.substring(address.length - last)}`;
};

// Helper to get explorer URL 
const getExplorerUrl = (txId: string | undefined): string => {
  if (!txId) return '#';
  return `https://explorer.stacks.co/txid/${txId}`;
};

const getAddressUrl = (address: string | undefined): string => {
  if (!address) return '#';
  return `https://explorer.stacks.co/address/${address}`;
};

// Helper to extract token name/symbol from a principal
const extractTokenName = (principal: string): string => {
  if (!principal) return principal;
  
  // Try to extract token name from principal
  const parts = principal.split('::');
  if (parts.length > 1) {
    // Format the token name more nicely
    return parts[1].split('-').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  }
  
  // Handle contract.token format without ::
  const contractParts = principal.split('.');
  if (contractParts.length > 1 && !contractParts[1].includes('-ft')) {
    // This is likely a contract.token format
    return contractParts[1].split('-').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  }
  
  // If no name part, just return the truncated principal
  return truncateAddress(principal);
};

export function SwapActivity({ 
  swaps = [], 
  transfers = [],
  timeframe = "Recent Activity",
  userAddress,
  tokenName
}: SwapActivityProps) {
  // State for pagination
  const [swapPage, setSwapPage] = useState(0);
  const [transferPage, setTransferPage] = useState(0);
  const pageSize = 5;
  
  // Calculate pages
  const totalSwapPages = Math.ceil(swaps.length / pageSize);
  const totalTransferPages = Math.ceil(transfers.length / pageSize);
  
  // Paginated data
  const paginatedSwaps = swaps.slice(
    swapPage * pageSize, 
    (swapPage + 1) * pageSize
  );
  
  const paginatedTransfers = transfers.slice(
    transferPage * pageSize, 
    (transferPage + 1) * pageSize
  );
  
  const title = tokenName 
    ? `${tokenName} Activity` 
    : userAddress 
      ? `User Activity` 
      : "Blockchain Activity";
      
  const description = userAddress 
    ? `For address ${truncateAddress(userAddress)}` 
    : timeframe;

  return (
    <Card className="w-full">
      <CardHeader className="pb-2">
        <CardTitle className="flex justify-between items-center">
          <span>{title}</span>
          <Badge variant="outline" className="font-normal">
            {description}
          </Badge>
        </CardTitle>
      </CardHeader>
      
      <CardContent>
        <Tabs defaultValue={swaps.length > 0 ? "swaps" : "transfers"}>
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="swaps" disabled={swaps.length === 0}>
              Swaps ({swaps.length})
            </TabsTrigger>
            <TabsTrigger value="transfers" disabled={transfers.length === 0}>
              Transfers ({transfers.length})
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="swaps">
            {swaps.length > 0 ? (
              <div className="space-y-4">
                {/* Swaps list */}
                <div className="space-y-3">
                  {paginatedSwaps.map((swap, idx) => (
                    <div 
                      key={swap.tx_id || idx} 
                      className="border rounded-lg p-3 hover:bg-muted/30 transition-colors"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center gap-2">
                          <ArrowDownUp className="size-4 text-muted-foreground" />
                          <a 
                            href={getExplorerUrl(swap.tx_id)} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-blue-600 dark:text-blue-400 hover:underline font-mono text-xs"
                          >
                            {truncateAddress(swap.tx_id)}
                            <ExternalLink className="inline ml-1 size-3" />
                          </a>
                        </div>
                        
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock className="size-3" />
                          <span>
                            {formatDateTime(swap.block_time)}
                          </span>
                        </div>
                      </div>
                      
                      {/* User address if available */}
                      {swap.user_address && (
                        <div className="flex items-center gap-1 text-xs mb-2">
                          <User className="size-3 text-muted-foreground" />
                          <a 
                            href={getAddressUrl(swap.user_address)} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-blue-600 dark:text-blue-400 hover:underline font-mono"
                          >
                            {truncateAddress(swap.user_address)}
                          </a>
                        </div>
                      )}
                      
                      {/* Swap details */}
                      {swap.swap_details && swap.swap_details.length > 0 ? (
                        <div className="space-y-1 border-t pt-2 mt-1">
                          {swap.swap_details.map((detail, detailIdx) => (
                            <div key={detailIdx} className="grid grid-cols-[auto_1fr_auto_1fr] gap-1 items-center">
                              <div className="text-sm font-medium">
                                {formatTokenAmount(detail.in_amount)}
                              </div>
                              <div className="text-xs text-muted-foreground truncate pl-1">
                                {extractTokenName(detail.in_asset)}
                              </div>
                              <div className="text-muted-foreground">→</div>
                              <div className="flex items-baseline gap-1">
                                <span className="text-sm font-medium">
                                  {formatTokenAmount(detail.out_amount)}
                                </span>
                                <span className="text-xs text-muted-foreground truncate">
                                  {extractTokenName(detail.out_asset)}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-xs text-muted-foreground">
                          Swap details not available
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                
                {/* Pagination for swaps */}
                {totalSwapPages > 1 && (
                  <div className="flex justify-between items-center mt-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSwapPage(Math.max(0, swapPage - 1))}
                      disabled={swapPage === 0}
                    >
                      Previous
                    </Button>
                    
                    <span className="text-xs text-muted-foreground">
                      Page {swapPage + 1} of {totalSwapPages}
                    </span>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSwapPage(Math.min(totalSwapPages - 1, swapPage + 1))}
                      disabled={swapPage === totalSwapPages - 1}
                    >
                      Next
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No swap activity found for this period
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="transfers">
            {transfers.length > 0 ? (
              <div className="space-y-4">
                {/* Transfers list */}
                <div className="space-y-3">
                  {paginatedTransfers.map((transfer, idx) => (
                    <div 
                      key={transfer.tx_id || idx} 
                      className="border rounded-lg p-3 hover:bg-muted/30 transition-colors"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center gap-2">
                          <ArrowDownUp className="size-4 text-muted-foreground" />
                          <a 
                            href={getExplorerUrl(transfer.tx_id)} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-blue-600 dark:text-blue-400 hover:underline font-mono text-xs"
                          >
                            {truncateAddress(transfer.tx_id)}
                            <ExternalLink className="inline ml-1 size-3" />
                          </a>
                        </div>
                        
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock className="size-3" />
                          <span>
                            {formatDateTime(transfer.timestamp)}
                          </span>
                        </div>
                      </div>
                      
                      {/* Transfer details */}
                      <div className="space-y-1 mt-1">
                        <div className="grid grid-cols-[auto_1fr] gap-x-2 gap-y-1 text-sm">
                          <div className="text-muted-foreground text-xs">From:</div>
                          <a 
                            href={getAddressUrl(transfer.sender)} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-blue-600 dark:text-blue-400 hover:underline font-mono text-xs truncate"
                          >
                            {truncateAddress(transfer.sender)}
                          </a>
                          
                          <div className="text-muted-foreground text-xs">To:</div>
                          <a 
                            href={getAddressUrl(transfer.recipient)} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-blue-600 dark:text-blue-400 hover:underline font-mono text-xs truncate"
                          >
                            {truncateAddress(transfer.recipient)}
                          </a>
                          
                          <div className="text-muted-foreground text-xs">Amount:</div>
                          <div className="flex items-baseline gap-1">
                            <span className="font-medium">
                              {formatTokenAmount(transfer.amount)}
                            </span>
                            <span className="text-xs text-muted-foreground truncate">
                              {extractTokenName(transfer.token)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                
                {/* Pagination for transfers */}
                {totalTransferPages > 1 && (
                  <div className="flex justify-between items-center mt-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setTransferPage(Math.max(0, transferPage - 1))}
                      disabled={transferPage === 0}
                    >
                      Previous
                    </Button>
                    
                    <span className="text-xs text-muted-foreground">
                      Page {transferPage + 1} of {totalTransferPages}
                    </span>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setTransferPage(Math.min(totalTransferPages - 1, transferPage + 1))}
                      disabled={transferPage === totalTransferPages - 1}
                    >
                      Next
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No transfer activity found for this period
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}