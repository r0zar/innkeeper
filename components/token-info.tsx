'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { cn } from '@/lib/utils';
import { Copy, ExternalLink, Info } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip';

interface TokenData {
  name: string;
  symbol: string;
  decimals: number;
  total_supply?: string;
  contract_address?: string;
  contract_principal?: string;
  logo_url?: string;
  description?: string;
  creation_date?: string;
  creator?: string;
  price_usd?: number;
  market_cap?: number;
  volume_24h?: number;
  price_change_24h?: number;
  holders?: number;
  website?: string;
  social_links?: Record<string, string>;
  [key: string]: any;
}

interface TokenPriceData {
  price: number;
  timestamp: string;
  volume: number;
  market_cap?: number;
}

interface TokenInfoProps {
  tokenData: TokenData;
  priceHistory?: TokenPriceData[];
  latestPrice?: number;
}

// Helper function to format large numbers
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

// Helper to truncate contract addresses
const truncateAddress = (address: string | undefined, first = 6, last = 4): string => {
  if (!address) return 'N/A';
  if (address.length <= first + last + 3) return address;
  return `${address.substring(0, first)}...${address.substring(address.length - last)}`;
};

// Helper to get explorer URL based on principal format
const getExplorerUrl = (principal: string): string => {
  if (principal.startsWith('SP') || principal.includes('.')) {
    return `https://explorer.stacks.co/address/${principal}`;
  }

  if (principal.startsWith('0x')) {
    return `https://etherscan.io/address/${principal}`;
  }

  return `https://explorer.stacks.co/address/${principal}`;
};

// IconInfo component for displaying key metrics
const IconInfo = ({
  icon,
  label,
  value,
  tooltip
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  tooltip?: string
}) => (
  <div className="flex items-center gap-2">
    <div className="text-muted-foreground">
      {icon}
    </div>
    <div>
      <div className="flex items-center gap-2">
        <span className="font-medium">{value}</span>
        {tooltip && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Info className="h-3 w-3 text-muted-foreground cursor-help" />
            </TooltipTrigger>
            <TooltipContent>
              <p className="text-xs max-w-60">{tooltip}</p>
            </TooltipContent>
          </Tooltip>
        )}
      </div>
      <span className="text-xs text-muted-foreground">{label}</span>
    </div>
  </div>
);

// Price change badge component
const PriceChangeBadge = ({ change }: { change: number | undefined }) => {
  if (change === undefined || isNaN(change)) return null;

  const isPositive = change >= 0;

  return (
    <Badge
      variant={isPositive ? 'success' : 'destructive'}
      className="ml-2"
    >
      {isPositive ? '+' : ''}{change.toFixed(2)}%
    </Badge>
  );
};

export function TokenInfo({ tokenData, priceHistory = [], latestPrice }: TokenInfoProps) {
  const [showCopiedAddress, setShowCopiedAddress] = useState(false);

  // Determine the contract principal to use
  const contractPrincipal = tokenData?.contract_principal || tokenData?.contract_address || '';

  // Copy address function
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setShowCopiedAddress(true);
    setTimeout(() => setShowCopiedAddress(false), 2000);
  };

  // Calculate price change from price history
  const calculatePriceChange = (): number | undefined => {
    if (priceHistory && priceHistory.length >= 2) {
      const currentPrice = priceHistory[priceHistory.length - 1]?.price;
      const previousPrice = priceHistory[0]?.price;

      if (currentPrice !== undefined && previousPrice !== undefined && previousPrice !== 0) {
        return ((currentPrice - previousPrice) / previousPrice) * 100;
      }
    }

    return tokenData?.price_change_24h;
  };

  const priceChange = calculatePriceChange();

  // Display actual price or latest price from props
  const displayPrice = latestPrice || tokenData?.price_usd;

  // Get token icon - either from URL or use first letter
  const tokenIcon = tokenData?.logo_url ? (
    <img
      src={tokenData?.logo_url}
      alt={tokenData?.symbol}
      className="w-12 h-12 rounded-full"
      onError={(e) => {
        // Hide broken images
        (e.target as HTMLImageElement).style.display = 'none';
      }}
    />
  ) : (
    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-400 to-indigo-600 flex items-center justify-center text-white font-bold text-xl">
      {tokenData?.symbol ? tokenData?.symbol.charAt(0) : '?'}
    </div>
  );

  return (
    <Card className="w-full overflow-hidden">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {tokenIcon}
            <div>
              <CardTitle className="text-xl">{tokenData?.name}</CardTitle>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span className="font-medium">{tokenData?.symbol}</span>
                {displayPrice !== undefined && (
                  <span className="font-semibold text-foreground">
                    ${typeof displayPrice === 'number' ?
                      displayPrice < 0.01 ? displayPrice.toFixed(6) : displayPrice.toFixed(2) :
                      displayPrice}
                    <PriceChangeBadge change={priceChange} />
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            {contractPrincipal && (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => copyToClipboard(contractPrincipal)}
                  title="Copy contract address"
                >
                  <Copy className="h-4 w-4" />
                </Button>

                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => window.open(getExplorerUrl(contractPrincipal), '_blank')}
                  title="View on explorer"
                >
                  <ExternalLink className="h-4 w-4" />
                </Button>
              </>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="pb-4">
        <Tabs defaultValue="overview">
          <TabsList className="grid w-full grid-cols-3 mb-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="price">Price Data</TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <div className="space-y-4">
              {/* Show description if available */}
              {tokenData?.description && (
                <div className="text-sm text-muted-foreground">
                  {tokenData?.description}
                </div>
              )}

              {/* Key metrics grid */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-3">
                {/* Contract */}
                <div>
                  <h4 className="text-xs text-muted-foreground mb-1">Contract</h4>
                  <div className="flex items-center gap-1">
                    <span
                      className="text-sm font-mono truncate"
                      title={contractPrincipal}
                    >
                      {truncateAddress(contractPrincipal)}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => copyToClipboard(contractPrincipal)}
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                </div>

                {/* Supply */}
                <div>
                  <h4 className="text-xs text-muted-foreground mb-1">Supply</h4>
                  <p className="text-sm font-medium">
                    {formatSupply(tokenData?.total_supply, tokenData?.decimals)}
                  </p>
                </div>

                {/* Decimals */}
                <div>
                  <h4 className="text-xs text-muted-foreground mb-1">Decimals</h4>
                  <p className="text-sm font-medium">{tokenData?.decimals}</p>
                </div>

                {/* Market Cap if available */}
                {tokenData?.market_cap && (
                  <div>
                    <h4 className="text-xs text-muted-foreground mb-1">Market Cap</h4>
                    <p className="text-sm font-medium">${formatNumber(tokenData?.market_cap)}</p>
                  </div>
                )}

                {/* Volume if available */}
                {tokenData?.volume_24h && (
                  <div>
                    <h4 className="text-xs text-muted-foreground mb-1">24h Volume</h4>
                    <p className="text-sm font-medium">${formatNumber(tokenData?.volume_24h)}</p>
                  </div>
                )}

                {/* Creation date if available */}
                {tokenData?.creation_date && (
                  <div>
                    <h4 className="text-xs text-muted-foreground mb-1">Created</h4>
                    <p className="text-sm font-medium">
                      {new Date(tokenData?.creation_date).toLocaleDateString()}
                    </p>
                  </div>
                )}
              </div>

              {/* Links if available */}
              {tokenData?.website && (
                <div className="pt-2">
                  <h4 className="text-xs text-muted-foreground mb-2">Links</h4>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => window.open(tokenData?.website, '_blank')}
                    >
                      Website
                      <ExternalLink className="ml-1 h-3 w-3" />
                    </Button>

                    {tokenData?.social_links && Object.entries(tokenData?.social_links).map(([platform, url]) => (
                      <Button
                        key={platform}
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => window.open(url, '_blank')}
                      >
                        {platform.charAt(0).toUpperCase() + platform.slice(1)}
                        <ExternalLink className="ml-1 h-3 w-3" />
                      </Button>
                    ))}

                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => window.open(getExplorerUrl(contractPrincipal), '_blank')}
                    >
                      Explorer
                      <ExternalLink className="ml-1 h-3 w-3" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="details">
            <div className="space-y-4">
              {/* All token properties in a table format */}
              <div className="border rounded-md overflow-hidden">
                <table className="w-full text-sm">
                  <tbody>
                    {Object.entries(tokenData)
                      .filter(([key]) => !['logo_url', 'social_links'].includes(key))
                      .map(([key, value]) => (
                        <tr key={key} className="border-b last:border-0">
                          <td className="px-3 py-2 font-medium border-r bg-muted/40">
                            {key.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                          </td>
                          <td className="px-3 py-2 break-all">
                            {typeof value === 'object' ?
                              JSON.stringify(value) :
                              String(value)}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="price">
            {priceHistory && priceHistory.length > 0 ? (
              <div className="space-y-4">
                {/* Price summary */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div>
                    <h4 className="text-xs text-muted-foreground mb-1">Current Price</h4>
                    <p className="text-lg font-medium">
                      ${typeof displayPrice === 'number' ?
                        displayPrice < 0.01 ? displayPrice.toFixed(6) : displayPrice.toFixed(2) :
                        'N/A'}
                    </p>
                  </div>

                  <div>
                    <h4 className="text-xs text-muted-foreground mb-1">Price Change</h4>
                    <p className="text-lg font-medium flex items-center">
                      {priceChange !== undefined ?
                        <span className={cn(
                          priceChange >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
                        )}>
                          {priceChange >= 0 ? '+' : ''}{priceChange.toFixed(2)}%
                        </span> :
                        'N/A'}
                    </p>
                  </div>

                  {/* Show market cap if available from the latest price data */}
                  {priceHistory[priceHistory.length - 1]?.market_cap && (
                    <div>
                      <h4 className="text-xs text-muted-foreground mb-1">Market Cap</h4>
                      <p className="text-lg font-medium">
                        ${formatNumber(priceHistory[priceHistory.length - 1].market_cap)}
                      </p>
                    </div>
                  )}
                </div>

                {/* Price history table - show last 5 entries */}
                <div>
                  <h4 className="text-xs font-medium mb-2">Recent Price History</h4>
                  <div className="border rounded-md overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-muted text-muted-foreground">
                        <tr>
                          <th className="px-3 py-2 text-left">Date</th>
                          <th className="px-3 py-2 text-right">Price</th>
                          <th className="px-3 py-2 text-right">Volume</th>
                        </tr>
                      </thead>
                      <tbody>
                        {priceHistory.slice(-5).reverse().map((entry, index) => (
                          <tr key={index} className="border-b last:border-0">
                            <td className="px-3 py-2">
                              {new Date(entry.timestamp).toLocaleDateString()}
                            </td>
                            <td className="px-3 py-2 text-right font-medium">
                              ${entry.price < 0.01 ? entry.price.toFixed(6) : entry.price.toFixed(2)}
                            </td>
                            <td className="px-3 py-2 text-right text-muted-foreground">
                              ${formatNumber(entry.volume)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-6 text-muted-foreground">
                No price history available for this token
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>

      {/* Notification for copied address */}
      {showCopiedAddress && (
        <div className="absolute bottom-4 right-4 bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 px-3 py-1 rounded-md text-xs animate-in fade-in slide-in-from-bottom-4">
          Contract address copied!
        </div>
      )}
    </Card>
  );
}