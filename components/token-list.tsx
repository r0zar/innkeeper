'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { cn } from '@/lib/utils';
import { Copy, ExternalLink } from 'lucide-react';
import { TokenInfo } from './token-info';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';

interface Token {
  name: string;
  symbol: string;
  decimals: number;
  total_supply?: string;
  contract_address?: string;
  contract_principal?: string;
  logo_url?: string;
  price_usd?: number;
  market_cap?: number;
  volume_24h?: number;
  [key: string]: any;
}

interface TokenListProps {
  tokens: Token[];
  count?: number;
  title?: string;
  description?: string;
  showPrices?: boolean;
  prices?: Record<string, number>;
}

// Helper to format token supply with appropriate decimal places
const formatSupply = (supply: string | undefined, decimals: number): string => {
  if (!supply) return 'N/A';
  
  try {
    const supplyNum = parseFloat(supply);
    if (isNaN(supplyNum)) return supply;
    
    const actualSupply = supplyNum / Math.pow(10, decimals);
    return formatNumber(actualSupply);
  } catch (e) {
    return supply;
  }
};

// Helper to format numbers
const formatNumber = (num: number | undefined, digits = 2): string => {
  if (num === undefined || isNaN(num)) return 'N/A';
  
  if (num === 0) return '0';
  
  // Handle very small numbers with scientific notation
  if (Math.abs(num) < 0.00001) return num.toExponential(digits);
  
  // Format based on size
  if (Math.abs(num) >= 1_000_000_000) return `${(num / 1_000_000_000).toFixed(digits)}B`;
  if (Math.abs(num) >= 1_000_000) return `${(num / 1_000_000).toFixed(digits)}M`;
  if (Math.abs(num) >= 1_000) return `${(num / 1_000).toFixed(digits)}K`;
  
  // For small decimals, use more precision
  if (Math.abs(num) < 1) return num.toFixed(6);
  
  // Default case
  return num.toFixed(digits);
};

// Helper to format price with appropriate precision
const formatPrice = (price: number | undefined): string => {
  if (price === undefined || isNaN(price)) return 'N/A';
  
  if (price === 0) return '$0';
  
  if (price < 0.01) return '$' + price.toFixed(6);
  if (price < 100) return '$' + price.toFixed(2);
  
  return '$' + formatNumber(price);
};

// Helper to truncate addresses/hashes
const truncateAddress = (address: string | undefined, first = 6, last = 4): string => {
  if (!address) return 'N/A';
  if (address.length <= first + last + 3) return address;
  return `${address.substring(0, first)}...${address.substring(address.length - last)}`;
};

export function TokenList({ 
  tokens, 
  count,
  title = "Available Tokens", 
  description,
  showPrices = true,
  prices = {}
}: TokenListProps) {
  const [expandedTokenIndex, setExpandedTokenIndex] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [sortBy, setSortBy] = useState<string>('default');
  const [showCopiedAddress, setShowCopiedAddress] = useState<string | null>(null);
  
  // Copy address function
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setShowCopiedAddress(text);
    setTimeout(() => setShowCopiedAddress(null), 2000);
  };
  
  // Sort tokens based on the selected criteria
  const sortedTokens = [...tokens].sort((a, b) => {
    switch (sortBy) {
      case 'name':
        return a.name.localeCompare(b.name);
      case 'symbol':
        return a.symbol.localeCompare(b.symbol);
      case 'price_high':
        const priceA = getPriceForToken(a);
        const priceB = getPriceForToken(b);
        return (priceB || 0) - (priceA || 0);
      case 'price_low':
        const priceALow = getPriceForToken(a);
        const priceBLow = getPriceForToken(b);
        return (priceALow || 0) - (priceBLow || 0);
      default:
        return 0;
    }
  });
  
  // Helper to get price for a token
  const getPriceForToken = (token: Token): number | undefined => {
    if (token.price_usd !== undefined) return token.price_usd;
    
    const contractKey = token.contract_principal || token.contract_address;
    if (contractKey && prices[contractKey]) return prices[contractKey];
    
    return undefined;
  };
  
  // Get explorer URL for a token
  const getExplorerUrl = (token: Token): string => {
    const contractPrincipal = token.contract_principal || token.contract_address;
    if (!contractPrincipal) return '#';
    
    if (contractPrincipal.startsWith('SP') || contractPrincipal.includes('.')) {
      return `https://explorer.stacks.co/address/${contractPrincipal}`;
    }
    
    if (contractPrincipal.startsWith('0x')) {
      return `https://etherscan.io/address/${contractPrincipal}`;
    }
    
    return `https://explorer.stacks.co/address/${contractPrincipal}`;
  };
  
  // Render token image or placeholder
  const renderTokenImage = (token: Token, size: 'sm' | 'md' = 'sm') => {
    const sizeClass = size === 'sm' ? 'w-8 h-8' : 'w-12 h-12';
    const textSize = size === 'sm' ? 'text-sm' : 'text-lg';
    
    if (token.logo_url) {
      return (
        <img 
          src={token.logo_url} 
          alt={token.symbol} 
          className={cn("rounded-full", sizeClass)}
          onError={(e) => {
            // Hide broken images and show fallback
            (e.target as HTMLImageElement).style.display = 'none';
            (e.target as HTMLImageElement).nextElementSibling!.style.display = 'flex';
          }}
        />
      );
    }
    
    return (
      <div className={cn(
        "rounded-full bg-gradient-to-br from-purple-400 to-indigo-600 flex items-center justify-center text-white font-bold",
        sizeClass,
        textSize
      )}>
        {token.symbol ? token.symbol.charAt(0) : '?'}
      </div>
    );
  };
  
  return (
    <Card className="w-full overflow-hidden">
      <CardHeader className="pb-2">
        <div className="flex justify-between">
          <div>
            <CardTitle>{title}</CardTitle>
            {description && (
              <CardDescription>{description}</CardDescription>
            )}
            {!description && count !== undefined && (
              <CardDescription>Found {count} tokens</CardDescription>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            <Button 
              variant={viewMode === 'grid' ? 'default' : 'outline'} 
              size="sm" 
              onClick={() => setViewMode('grid')}
              className="size-8 p-0 rounded-full"
              title="Grid view"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="7" height="7" rx="1" />
                <rect x="14" y="3" width="7" height="7" rx="1" />
                <rect x="3" y="14" width="7" height="7" rx="1" />
                <rect x="14" y="14" width="7" height="7" rx="1" />
              </svg>
            </Button>
            <Button 
              variant={viewMode === 'table' ? 'default' : 'outline'} 
              size="sm" 
              onClick={() => setViewMode('table')}
              className="size-8 p-0 rounded-full"
              title="Table view"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 10h18M3 14h18M3 6h18M3 18h18" />
              </svg>
            </Button>
          </div>
        </div>
        
        <div className="flex mt-2 gap-2">
          <select 
            className="text-xs border rounded p-1 bg-background"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
          >
            <option value="default">Sort by: Default</option>
            <option value="name">Sort by: Name (A-Z)</option>
            <option value="symbol">Sort by: Symbol (A-Z)</option>
            {showPrices && (
              <>
                <option value="price_high">Sort by: Price (High to Low)</option>
                <option value="price_low">Sort by: Price (Low to High)</option>
              </>
            )}
          </select>
        </div>
      </CardHeader>
      
      <CardContent className="p-0">
        {viewMode === 'grid' ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 p-4">
            {sortedTokens.map((token, index) => {
              const isExpanded = expandedTokenIndex === index;
              const tokenPrice = getPriceForToken(token);
              const contractPrincipal = token.contract_principal || token.contract_address;
              
              return (
                <div 
                  key={`${token.name}-${index}`}
                  className={cn(
                    "border rounded-lg p-3 transition-all",
                    isExpanded ? "shadow-md" : "hover:shadow-sm"
                  )}
                >
                  <div 
                    className="flex items-center gap-3 cursor-pointer"
                    onClick={() => setExpandedTokenIndex(isExpanded ? null : index)}
                  >
                    {renderTokenImage(token)}
                    <div className="overflow-hidden">
                      <h3 className="font-medium truncate" title={token.name}>
                        {token.name}
                      </h3>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <span>{token.symbol}</span>
                        {showPrices && tokenPrice !== undefined && (
                          <span className="font-semibold text-foreground">
                            {formatPrice(tokenPrice)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {isExpanded && (
                    <div className="mt-3 pt-3 border-t text-xs grid gap-2">
                      <div>
                        <span className="text-muted-foreground">Contract:</span>
                        <div className="font-mono flex items-center gap-1 mt-0.5">
                          <span className="truncate" title={contractPrincipal}>
                            {truncateAddress(contractPrincipal)}
                          </span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-5 w-5"
                            onClick={() => copyToClipboard(contractPrincipal || '')}
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-x-2">
                        <div>
                          <span className="text-muted-foreground">Decimals:</span>
                          <p className="font-medium mt-0.5">{token.decimals}</p>
                        </div>
                        
                        <div>
                          <span className="text-muted-foreground">Supply:</span>
                          <p className="font-medium mt-0.5 truncate" title={token.total_supply}>
                            {formatSupply(token.total_supply, token.decimals)}
                          </p>
                        </div>
                      </div>
                      
                      <Button 
                        variant="outline" 
                        size="sm"
                        className="mt-2 h-7 text-xs w-full"
                        onClick={() => window.open(getExplorerUrl(token), '_blank')}
                      >
                        View on Explorer
                        <ExternalLink className="ml-1 h-3 w-3" />
                      </Button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left p-3 font-medium">Token</th>
                  {showPrices && (
                    <th className="text-right p-3 font-medium">Price</th>
                  )}
                  <th className="text-right p-3 font-medium">Supply</th>
                  <th className="text-left p-3 font-medium">Contract</th>
                  <th className="text-center p-3 font-medium">Decimals</th>
                  <th className="text-right p-3 font-medium">Action</th>
                </tr>
              </thead>
              <tbody>
                {sortedTokens.map((token, index) => {
                  const tokenPrice = getPriceForToken(token);
                  const contractPrincipal = token.contract_principal || token.contract_address;
                  
                  return (
                    <tr 
                      key={`${token.name}-${index}`}
                      className="border-b hover:bg-muted/30"
                    >
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          {renderTokenImage(token)}
                          <div>
                            <div className="font-medium">{token.name}</div>
                            <div className="text-xs text-muted-foreground">{token.symbol}</div>
                          </div>
                        </div>
                      </td>
                      
                      {showPrices && (
                        <td className="p-3 text-right">
                          {formatPrice(tokenPrice)}
                        </td>
                      )}
                      
                      <td className="p-3 text-right font-mono text-xs">
                        {formatSupply(token.total_supply, token.decimals)}
                      </td>
                      
                      <td className="p-3">
                        <div className="flex items-center gap-1">
                          <span className="font-mono text-xs truncate max-w-40" title={contractPrincipal}>
                            {truncateAddress(contractPrincipal)}
                          </span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => copyToClipboard(contractPrincipal || '')}
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                        </div>
                      </td>
                      
                      <td className="p-3 text-center">
                        {token.decimals}
                      </td>
                      
                      <td className="p-3 text-right">
                        <Button 
                          variant="outline" 
                          size="sm"
                          className="h-7 text-xs"
                          onClick={() => window.open(getExplorerUrl(token), '_blank')}
                        >
                          Explorer
                          <ExternalLink className="ml-1 h-3 w-3" />
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
      
      {/* Notification for copied address */}
      {showCopiedAddress && (
        <div className="fixed bottom-4 right-4 bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 px-3 py-1 rounded-md text-xs animate-in fade-in slide-in-from-bottom-4 z-50">
          Contract address copied!
        </div>
      )}
    </Card>
  );
}