'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Label } from './ui/label';
import { Input } from './ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { cn } from '@/lib/utils';
import { PlusCircle, Trash2, ArrowDown, ArrowRight, Plus, X } from 'lucide-react';
import { TokenSearch } from './token-search';

// Types for validation criteria
type CriteriaType =
  | 'swappedFor'
  | 'firstNBuyers'
  | 'minValueSwap'
  | 'holdsToken'
  | 'and'
  | 'or'
  | 'not';

interface BaseCriteria {
  type: CriteriaType;
  params: Record<string, any>;
}

interface SwappedForCriteria extends BaseCriteria {
  type: 'swappedFor';
  params: {
    tokenToSwap: string;
    targetToken: string;
    minAmount?: number;
    startTime?: number;
    endTime?: number;
  };
}

interface FirstNBuyersCriteria extends BaseCriteria {
  type: 'firstNBuyers';
  params: {
    token: string;
    n: number;
    minValueUsd?: number;
    startTime?: number;
  };
}

interface MinValueSwapCriteria extends BaseCriteria {
  type: 'minValueSwap';
  params: {
    token: string;
    minValue: number;
  };
}

interface HoldsTokenCriteria extends BaseCriteria {
  type: 'holdsToken';
  params: {
    token: string;
    minAmount?: number;
  };
}

interface AndCriteria extends BaseCriteria {
  type: 'and';
  params: {
    conditions: BaseCriteria[];
  };
}

interface OrCriteria extends BaseCriteria {
  type: 'or';
  params: {
    conditions: BaseCriteria[];
  };
}

interface NotCriteria extends BaseCriteria {
  type: 'not';
  params: {
    condition: BaseCriteria;
  };
}

type ValidationCriteria =
  | SwappedForCriteria
  | FirstNBuyersCriteria
  | MinValueSwapCriteria
  | HoldsTokenCriteria
  | AndCriteria
  | OrCriteria
  | NotCriteria;

interface QuestCriteriaBuilderProps {
  initialCriteria?: ValidationCriteria;
  onSave: (criteria: ValidationCriteria) => void;
  showSearch?: boolean;
}

// Helper functions for creating default criteria
const createDefaultSwappedFor = (): SwappedForCriteria => ({
  type: 'swappedFor',
  params: {
    tokenToSwap: '',
    targetToken: '',
  },
});

const createDefaultFirstNBuyers = (): FirstNBuyersCriteria => ({
  type: 'firstNBuyers',
  params: {
    token: '',
    n: 10,
  },
});

const createDefaultMinValueSwap = (): MinValueSwapCriteria => ({
  type: 'minValueSwap',
  params: {
    token: '',
    minValue: 10,
  },
});

const createDefaultHoldsToken = (): HoldsTokenCriteria => ({
  type: 'holdsToken',
  params: {
    token: '',
  },
});

// Helper to create a criteria by type
const createDefaultCriteria = (type: CriteriaType): ValidationCriteria => {
  switch (type) {
    case 'swappedFor':
      return createDefaultSwappedFor();
    case 'firstNBuyers':
      return createDefaultFirstNBuyers();
    case 'minValueSwap':
      return createDefaultMinValueSwap();
    case 'holdsToken':
      return createDefaultHoldsToken();
    case 'and':
      return {
        type: 'and',
        params: {
          conditions: [createDefaultSwappedFor()],
        },
      };
    case 'or':
      return {
        type: 'or',
        params: {
          conditions: [createDefaultSwappedFor()],
        },
      };
    case 'not':
      return {
        type: 'not',
        params: {
          condition: createDefaultSwappedFor(),
        },
      };
    default:
      return createDefaultSwappedFor();
  }
};

// Individual criteria components
const SwappedForCriteriaForm = ({
  criteria,
  onChange,
  onRemove,
  isNested = false,
  showRemove = true,
}: {
  criteria: SwappedForCriteria;
  onChange: (newCriteria: SwappedForCriteria) => void;
  onRemove?: () => void;
  isNested?: boolean;
  showRemove?: boolean;
}) => {
  const handleTokenToSwapChange = (value: string) => {
    onChange({
      ...criteria,
      params: {
        ...criteria.params,
        tokenToSwap: value,
      },
    });
  };

  const handleTargetTokenChange = (value: string) => {
    onChange({
      ...criteria,
      params: {
        ...criteria.params,
        targetToken: value,
      },
    });
  };

  const handleMinAmountChange = (value: string) => {
    onChange({
      ...criteria,
      params: {
        ...criteria.params,
        minAmount: value ? parseFloat(value) : undefined,
      },
    });
  };

  return (
    <Card className={cn("w-full", isNested ? "border-dashed" : "")}>
      <CardHeader className="p-4 pb-2 flex flex-row justify-between items-center">
        <CardTitle className="text-base font-medium">
          Swap Token
        </CardTitle>
        {showRemove && onRemove && (
          <Button variant="ghost" size="icon" onClick={onRemove}>
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </CardHeader>
      <CardContent className="p-4 pt-0 space-y-3">
        <div>
          <Label htmlFor="tokenToSwap">Token to Swap</Label>
          <Input
            id="tokenToSwap"
            placeholder="Enter token principal"
            value={criteria.params.tokenToSwap}
            onChange={(e) => handleTokenToSwapChange(e.target.value)}
          />
          <p className="text-xs text-muted-foreground mt-1">
            Enter the token principal that will be swapped
          </p>
        </div>
        
        <div className="flex justify-center">
          <ArrowDown className="h-5 w-5 text-muted-foreground" />
        </div>
        
        <div>
          <Label htmlFor="targetToken">Target Token</Label>
          <Input
            id="targetToken"
            placeholder="Enter target token principal"
            value={criteria.params.targetToken}
            onChange={(e) => handleTargetTokenChange(e.target.value)}
          />
          <p className="text-xs text-muted-foreground mt-1">
            Enter the target token to receive in the swap
          </p>
        </div>
        
        <div>
          <Label htmlFor="minAmount">Minimum Amount (Optional)</Label>
          <Input
            id="minAmount"
            type="number"
            step="0.01"
            placeholder="Minimum amount to swap"
            value={criteria.params.minAmount || ''}
            onChange={(e) => handleMinAmountChange(e.target.value)}
          />
          <p className="text-xs text-muted-foreground mt-1">
            Minimum amount of the token to swap (optional)
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

const FirstNBuyersCriteriaForm = ({
  criteria,
  onChange,
  onRemove,
  isNested = false,
  showRemove = true,
}: {
  criteria: FirstNBuyersCriteria;
  onChange: (newCriteria: FirstNBuyersCriteria) => void;
  onRemove?: () => void;
  isNested?: boolean;
  showRemove?: boolean;
}) => {
  const handleTokenChange = (value: string) => {
    onChange({
      ...criteria,
      params: {
        ...criteria.params,
        token: value,
      },
    });
  };

  const handleNChange = (value: string) => {
    onChange({
      ...criteria,
      params: {
        ...criteria.params,
        n: parseInt(value) || 10,
      },
    });
  };

  const handleMinValueChange = (value: string) => {
    onChange({
      ...criteria,
      params: {
        ...criteria.params,
        minValueUsd: value ? parseFloat(value) : undefined,
      },
    });
  };

  return (
    <Card className={cn("w-full", isNested ? "border-dashed" : "")}>
      <CardHeader className="p-4 pb-2 flex flex-row justify-between items-center">
        <CardTitle className="text-base font-medium">
          First N Buyers
        </CardTitle>
        {showRemove && onRemove && (
          <Button variant="ghost" size="icon" onClick={onRemove}>
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </CardHeader>
      <CardContent className="p-4 pt-0 space-y-3">
        <div>
          <Label htmlFor="token">Token</Label>
          <Input
            id="token"
            placeholder="Enter token principal"
            value={criteria.params.token}
            onChange={(e) => handleTokenChange(e.target.value)}
          />
          <p className="text-xs text-muted-foreground mt-1">
            Enter the token principal to check first buyers for
          </p>
        </div>
        
        <div>
          <Label htmlFor="n">Number of Buyers (N)</Label>
          <Input
            id="n"
            type="number"
            min="1"
            step="1"
            placeholder="Number of first buyers"
            value={criteria.params.n}
            onChange={(e) => handleNChange(e.target.value)}
          />
          <p className="text-xs text-muted-foreground mt-1">
            The number of first buyers to consider
          </p>
        </div>
        
        <div>
          <Label htmlFor="minValueUsd">Minimum Value in USD (Optional)</Label>
          <Input
            id="minValueUsd"
            type="number"
            step="0.01"
            placeholder="Minimum value in USD"
            value={criteria.params.minValueUsd || ''}
            onChange={(e) => handleMinValueChange(e.target.value)}
          />
          <p className="text-xs text-muted-foreground mt-1">
            Minimum value in USD for the swap to qualify (optional)
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

const MinValueSwapCriteriaForm = ({
  criteria,
  onChange,
  onRemove,
  isNested = false,
  showRemove = true,
}: {
  criteria: MinValueSwapCriteria;
  onChange: (newCriteria: MinValueSwapCriteria) => void;
  onRemove?: () => void;
  isNested?: boolean;
  showRemove?: boolean;
}) => {
  const handleTokenChange = (value: string) => {
    onChange({
      ...criteria,
      params: {
        ...criteria.params,
        token: value,
      },
    });
  };

  const handleMinValueChange = (value: string) => {
    onChange({
      ...criteria,
      params: {
        ...criteria.params,
        minValue: parseFloat(value) || 0,
      },
    });
  };

  return (
    <Card className={cn("w-full", isNested ? "border-dashed" : "")}>
      <CardHeader className="p-4 pb-2 flex flex-row justify-between items-center">
        <CardTitle className="text-base font-medium">
          Minimum Value Swap
        </CardTitle>
        {showRemove && onRemove && (
          <Button variant="ghost" size="icon" onClick={onRemove}>
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </CardHeader>
      <CardContent className="p-4 pt-0 space-y-3">
        <div>
          <Label htmlFor="token">Token</Label>
          <Input
            id="token"
            placeholder="Enter token principal"
            value={criteria.params.token}
            onChange={(e) => handleTokenChange(e.target.value)}
          />
          <p className="text-xs text-muted-foreground mt-1">
            Enter the token principal to check swap value for
          </p>
        </div>
        
        <div>
          <Label htmlFor="minValue">Minimum Value (USD)</Label>
          <Input
            id="minValue"
            type="number"
            step="0.01"
            placeholder="Minimum value in USD"
            value={criteria.params.minValue}
            onChange={(e) => handleMinValueChange(e.target.value)}
          />
          <p className="text-xs text-muted-foreground mt-1">
            Minimum value in USD for the swap to qualify
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

const HoldsTokenCriteriaForm = ({
  criteria,
  onChange,
  onRemove,
  isNested = false,
  showRemove = true,
}: {
  criteria: HoldsTokenCriteria;
  onChange: (newCriteria: HoldsTokenCriteria) => void;
  onRemove?: () => void;
  isNested?: boolean;
  showRemove?: boolean;
}) => {
  const handleTokenChange = (value: string) => {
    onChange({
      ...criteria,
      params: {
        ...criteria.params,
        token: value,
      },
    });
  };

  const handleMinAmountChange = (value: string) => {
    onChange({
      ...criteria,
      params: {
        ...criteria.params,
        minAmount: value ? parseFloat(value) : undefined,
      },
    });
  };

  return (
    <Card className={cn("w-full", isNested ? "border-dashed" : "")}>
      <CardHeader className="p-4 pb-2 flex flex-row justify-between items-center">
        <CardTitle className="text-base font-medium">
          Holds Token
        </CardTitle>
        {showRemove && onRemove && (
          <Button variant="ghost" size="icon" onClick={onRemove}>
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </CardHeader>
      <CardContent className="p-4 pt-0 space-y-3">
        <div>
          <Label htmlFor="token">Token</Label>
          <Input
            id="token"
            placeholder="Enter token principal"
            value={criteria.params.token}
            onChange={(e) => handleTokenChange(e.target.value)}
          />
          <p className="text-xs text-muted-foreground mt-1">
            Enter the token principal to check holdings for
          </p>
        </div>
        
        <div>
          <Label htmlFor="minAmount">Minimum Amount (Optional)</Label>
          <Input
            id="minAmount"
            type="number"
            step="0.01"
            placeholder="Minimum holding amount"
            value={criteria.params.minAmount || ''}
            onChange={(e) => handleMinAmountChange(e.target.value)}
          />
          <p className="text-xs text-muted-foreground mt-1">
            Minimum amount of the token to hold (optional)
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

// Component for AND/OR combinators
const CombinatorCriteriaForm = ({
  criteria,
  onChange,
  onRemove,
  isNested = false,
  showRemove = true,
}: {
  criteria: AndCriteria | OrCriteria;
  onChange: (newCriteria: AndCriteria | OrCriteria) => void;
  onRemove?: () => void;
  isNested?: boolean;
  showRemove?: boolean;
}) => {
  const addCondition = () => {
    onChange({
      ...criteria,
      params: {
        ...criteria.params,
        conditions: [...criteria.params.conditions, createDefaultSwappedFor()],
      },
    });
  };

  const removeCondition = (index: number) => {
    const newConditions = [...criteria.params.conditions];
    newConditions.splice(index, 1);
    
    // If no conditions left, remove the combinator itself
    if (newConditions.length === 0 && onRemove) {
      onRemove();
      return;
    }
    
    onChange({
      ...criteria,
      params: {
        ...criteria.params,
        conditions: newConditions,
      },
    });
  };

  const updateCondition = (index: number, updatedCondition: ValidationCriteria) => {
    const newConditions = [...criteria.params.conditions];
    newConditions[index] = updatedCondition;
    
    onChange({
      ...criteria,
      params: {
        ...criteria.params,
        conditions: newConditions,
      },
    });
  };

  return (
    <Card className={cn("w-full", isNested ? "border-dashed" : "")}>
      <CardHeader className="p-4 pb-2 flex flex-row justify-between items-center">
        <CardTitle className="text-base font-medium">
          {criteria.type === 'and' ? 'ALL of these conditions (AND)' : 'ANY of these conditions (OR)'}
        </CardTitle>
        {showRemove && onRemove && (
          <Button variant="ghost" size="icon" onClick={onRemove}>
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </CardHeader>
      <CardContent className="p-4 pt-0 space-y-4">
        <div className="space-y-4">
          {criteria.params.conditions.map((condition, index) => (
            <div key={index} className="pl-4 border-l-2 border-muted-foreground/20">
              <div className="mb-2 flex items-center">
                <span className="text-xs font-medium">
                  Condition {index + 1}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 ml-2"
                  onClick={() => removeCondition(index)}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
              
              <CriteriaFormWrapper
                criteria={condition}
                onChange={(newCriteria) => updateCondition(index, newCriteria)}
                onRemove={() => removeCondition(index)}
                isNested={true}
                showRemove={false} // Don't show remove button inside nested criteria
              />
            </div>
          ))}
        </div>
        
        <Button 
          variant="outline" 
          size="sm" 
          className="w-full"
          onClick={addCondition}
        >
          <PlusCircle className="h-4 w-4 mr-2" />
          Add Condition
        </Button>
      </CardContent>
    </Card>
  );
};

// Component for NOT combinator
const NotCriteriaForm = ({
  criteria,
  onChange,
  onRemove,
  isNested = false,
  showRemove = true,
}: {
  criteria: NotCriteria;
  onChange: (newCriteria: NotCriteria) => void;
  onRemove?: () => void;
  isNested?: boolean;
  showRemove?: boolean;
}) => {
  const updateCondition = (updatedCondition: ValidationCriteria) => {
    onChange({
      ...criteria,
      params: {
        ...criteria.params,
        condition: updatedCondition,
      },
    });
  };

  return (
    <Card className={cn("w-full", isNested ? "border-dashed" : "")}>
      <CardHeader className="p-4 pb-2 flex flex-row justify-between items-center">
        <CardTitle className="text-base font-medium">
          NOT this condition
        </CardTitle>
        {showRemove && onRemove && (
          <Button variant="ghost" size="icon" onClick={onRemove}>
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </CardHeader>
      <CardContent className="p-4 pt-0 space-y-3">
        <div className="pl-4 border-l-2 border-red-300">
          <CriteriaFormWrapper
            criteria={criteria.params.condition}
            onChange={updateCondition}
            isNested={true}
            showRemove={false} // Don't show remove button inside NOT
          />
        </div>
      </CardContent>
    </Card>
  );
};

// Wrapper to choose which form to render based on criteria type
const CriteriaFormWrapper = ({
  criteria,
  onChange,
  onRemove,
  isNested = false,
  showRemove = true,
}: {
  criteria: ValidationCriteria;
  onChange: (newCriteria: ValidationCriteria) => void;
  onRemove?: () => void;
  isNested?: boolean;
  showRemove?: boolean;
}) => {
  switch (criteria.type) {
    case 'swappedFor':
      return (
        <SwappedForCriteriaForm
          criteria={criteria}
          onChange={onChange}
          onRemove={onRemove}
          isNested={isNested}
          showRemove={showRemove}
        />
      );
    case 'firstNBuyers':
      return (
        <FirstNBuyersCriteriaForm
          criteria={criteria}
          onChange={onChange}
          onRemove={onRemove}
          isNested={isNested}
          showRemove={showRemove}
        />
      );
    case 'minValueSwap':
      return (
        <MinValueSwapCriteriaForm
          criteria={criteria}
          onChange={onChange}
          onRemove={onRemove}
          isNested={isNested}
          showRemove={showRemove}
        />
      );
    case 'holdsToken':
      return (
        <HoldsTokenCriteriaForm
          criteria={criteria}
          onChange={onChange}
          onRemove={onRemove}
          isNested={isNested}
          showRemove={showRemove}
        />
      );
    case 'and':
    case 'or':
      return (
        <CombinatorCriteriaForm
          criteria={criteria as AndCriteria | OrCriteria}
          onChange={onChange as (newCriteria: AndCriteria | OrCriteria) => void}
          onRemove={onRemove}
          isNested={isNested}
          showRemove={showRemove}
        />
      );
    case 'not':
      return (
        <NotCriteriaForm
          criteria={criteria as NotCriteria}
          onChange={onChange as (newCriteria: NotCriteria) => void}
          onRemove={onRemove}
          isNested={isNested}
          showRemove={showRemove}
        />
      );
    default:
      return null;
  }
};

// Main builder component
export function QuestCriteriaBuilder({
  initialCriteria,
  onSave,
  showSearch = false,
}: QuestCriteriaBuilderProps) {
  const [criteria, setCriteria] = useState<ValidationCriteria>(
    initialCriteria || createDefaultSwappedFor()
  );
  const [showTokenSearch, setShowTokenSearch] = useState(false);

  // When type changes, update criteria with a new default
  const handleTypeChange = (type: CriteriaType) => {
    setCriteria(createDefaultCriteria(type));
  };

  // Called when the form values change
  const handleCriteriaChange = (newCriteria: ValidationCriteria) => {
    setCriteria(newCriteria);
  };

  // Save button handler
  const handleSave = () => {
    onSave(criteria);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row gap-4 justify-between">
        <div>
          <Label htmlFor="criteriaType">Criteria Type</Label>
          <Select
            value={criteria.type}
            onValueChange={(value) => handleTypeChange(value as CriteriaType)}
          >
            <SelectTrigger id="criteriaType" className="w-[250px]">
              <SelectValue placeholder="Select a criteria type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="swappedFor">Swapped For Token</SelectItem>
              <SelectItem value="firstNBuyers">First N Buyers</SelectItem>
              <SelectItem value="minValueSwap">Minimum Value Swap</SelectItem>
              <SelectItem value="holdsToken">Holds Token</SelectItem>
              <SelectItem value="and">AND (All Conditions)</SelectItem>
              <SelectItem value="or">OR (Any Conditions)</SelectItem>
              <SelectItem value="not">NOT (Negate Condition)</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground mt-1">
            Select the type of validation criteria to build
          </p>
        </div>

        {showSearch && (
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setShowTokenSearch(!showTokenSearch)}
          >
            {showTokenSearch ? 'Hide Token Search' : 'Search for Tokens'}
          </Button>
        )}
      </div>

      {showSearch && showTokenSearch && (
        <div className="bg-muted/30 p-4 rounded-lg border">
          <p className="text-sm mb-2">Search for tokens to use in your criteria</p>
          <p className="text-xs text-muted-foreground mb-4">
            Use this to find token information that you can copy into your criteria
          </p>
          
          {/* This would integrate with your TokenSearch component */}
          <div className="text-center text-sm text-muted-foreground py-8">
            Token search integration would appear here
          </div>
        </div>
      )}

      <div className="w-full">
        <CriteriaFormWrapper
          criteria={criteria}
          onChange={handleCriteriaChange}
        />
      </div>

      <div className="pt-4 border-t flex justify-end gap-3">
        <Button variant="outline" onClick={() => handleTypeChange(criteria.type)}>
          Reset
        </Button>
        <Button onClick={handleSave}>
          Save Criteria
        </Button>
      </div>

      {/* JSON Preview for debugging */}
      <div className="mt-6 p-4 bg-muted/20 rounded-lg border">
        <div className="flex justify-between mb-2">
          <h3 className="text-sm font-medium">Criteria JSON Preview</h3>
        </div>
        <pre className="text-xs overflow-auto max-h-32">
          {JSON.stringify(criteria, null, 2)}
        </pre>
      </div>
    </div>
  );
}