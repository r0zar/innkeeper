'use client';

import cx from 'classnames';
import { useState } from 'react';
import { Button } from './ui/button';

interface TokenResult {
  name: string;
  symbol: string;
  decimals: number;
  total_supply: string;
  contract_principal: string;
  token_uri?: string;
  description?: string;
  image_uri?: string;
  tx_id: string;
}

interface TokenSearchResponse {
  results: TokenResult[];
  total: number;
  limit: number;
  offset: number;
  has_more: boolean;
  query_term: string;
  error?: string;
}

export function TokenSearch({
  searchResults,
}: {
  searchResults: TokenSearchResponse;
}) {
  const [expandedToken, setExpandedToken] = useState<string | null>(null);
  
  // Handle cases where there was an error or no results
  if (searchResults.error) {
    return (
      <div className="rounded-2xl p-4 border border-red-200 bg-red-50 dark:bg-red-950 dark:border-red-800">
        <p className="text-red-700 dark:text-red-300">Error: {searchResults.error}</p>
        <p className="text-sm text-red-600 dark:text-red-400">Query: "{searchResults.query_term}"</p>
      </div>
    );
  }

  if (searchResults.results.length === 0) {
    return (
      <div className="rounded-2xl p-4 border border-amber-200 bg-amber-50 dark:bg-amber-950 dark:border-amber-800">
        <p className="text-amber-700 dark:text-amber-300">No tokens found matching "{searchResults.query_term}"</p>
      </div>
    );
  }

  // Format and display token supply with proper decimals
  const formatSupply = (supply: string, decimals: number) => {
    const num = parseFloat(supply);
    if (isNaN(num)) return supply;
    
    const divisor = Math.pow(10, decimals);
    const formattedSupply = (num / divisor).toLocaleString('en-US', {
      maximumFractionDigits: 2
    });
    
    return formattedSupply;
  };

  // Truncate long contract addresses for display
  const truncateAddress = (address: string) => {
    if (!address) return '';
    if (address.length <= 15) return address;
    return `${address.slice(0, 8)}...${address.slice(-7)}`;
  };

  return (
    <div className="flex flex-col gap-2 p-1 max-w-[600px]">
      <div className="flex justify-between items-center mb-2">
        <h3 className="text-lg font-medium">
          {searchResults.results.length} Tokens Found
        </h3>
        <span className="text-sm text-muted-foreground">
          {searchResults.offset + 1}-{searchResults.offset + searchResults.results.length} of {searchResults.total}
        </span>
      </div>
      
      <div className="grid gap-2">
        {searchResults.results.map((token) => (
          <div 
            key={token.contract_principal + token.name}
            className={cx(
              "border rounded-lg p-3 transition-all cursor-pointer hover:shadow-md",
              "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700",
              expandedToken === token.contract_principal ? "shadow-md" : ""
            )}
            onClick={() => setExpandedToken(
              expandedToken === token.contract_principal ? null : token.contract_principal
            )}
          >
            <div className="flex justify-between items-start">
              <div className="flex items-center gap-2">
                {token.image_uri ? (
                  <img 
                    src={token.image_uri} 
                    alt={token.symbol} 
                    className="w-8 h-8 rounded-full"
                    onError={(e) => {
                      // Hide broken images
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-400 to-indigo-600 flex items-center justify-center text-white font-bold">
                    {token.symbol ? token.symbol.charAt(0) : '?'}
                  </div>
                )}
                <div>
                  <h4 className="font-semibold">{token.name}</h4>
                  <p className="text-sm text-muted-foreground">{token.symbol}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-medium">
                  {formatSupply(token.total_supply, token.decimals)}
                </p>
                <p className="text-xs text-muted-foreground">Supply</p>
              </div>
            </div>
            
            {expandedToken === token.contract_principal && (
              <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700 space-y-2 text-sm">
                {token.description && (
                  <p className="text-gray-600 dark:text-gray-300">{token.description}</p>
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  <div>
                    <span className="text-xs text-muted-foreground">Contract:</span>
                    <p className="font-mono text-xs break-all">{token.contract_principal}</p>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground">Decimals:</span>
                    <p>{token.decimals}</p>
                  </div>
                  {token.token_uri && (
                    <div className="col-span-1 md:col-span-2">
                      <span className="text-xs text-muted-foreground">Token URI:</span>
                      <p className="font-mono text-xs break-all">{token.token_uri}</p>
                    </div>
                  )}
                </div>
                
                <div className="flex justify-end mt-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigator.clipboard.writeText(token.contract_principal);
                    }}
                  >
                    Copy Contract
                  </Button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
      
      {searchResults.has_more && (
        <div className="flex justify-center mt-2">
          <span className="text-sm text-muted-foreground">
            + {searchResults.total - (searchResults.offset + searchResults.results.length)} more tokens
          </span>
        </div>
      )}
    </div>
  );
}