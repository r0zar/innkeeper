'use client';

import { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Activity,
  AlertTriangle,
  CheckCircle,
  ChevronDown,
  ChevronRight,
  Clock,
  Users
} from 'lucide-react';
import { QuestValidation, QuestValidationResult } from '@/lib/db/schema';

interface QuestValidationListProps {
  questId: string;
}

export function QuestValidationList({ questId }: QuestValidationListProps) {
  const [validations, setValidations] = useState<QuestValidation[]>([]);
  const [selectedValidation, setSelectedValidation] = useState<string | null>(null);
  const [validationResults, setValidationResults] = useState<QuestValidationResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loadingResults, setLoadingResults] = useState(false);

  useEffect(() => {
    async function fetchValidations() {
      try {
        setLoading(true);
        const response = await fetch(`/api/quests/validations?questId=${questId}`);

        if (!response.ok) {
          throw new Error('Failed to fetch validations');
        }

        const data = await response.json();
        setValidations(data);
      } catch (err) {
        console.error('Error fetching validations:', err);
        setError('Failed to load validation history. Please try again later.');
      } finally {
        setLoading(false);
      }
    }

    fetchValidations();
  }, [questId]);

  const fetchValidationResults = async (validationId: string) => {
    try {
      setLoadingResults(true);
      const response = await fetch(`/api/quests/validations?questId=${questId}&validationId=${validationId}`);

      if (!response.ok) {
        throw new Error('Failed to fetch validation results');
      }

      const data = await response.json();
      setValidationResults(data);
    } catch (err) {
      console.error('Error fetching validation results:', err);
      setError('Failed to load validation details. Please try again later.');
    } finally {
      setLoadingResults(false);
    }
  };

  const toggleValidation = (validationId: string) => {
    if (selectedValidation === validationId) {
      setSelectedValidation(null);
      setValidationResults([]);
    } else {
      setSelectedValidation(validationId);
      fetchValidationResults(validationId);
    }
  };

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

  if (validations.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center py-6">
            <Clock className="size-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h3 className="text-lg font-medium mb-2">No Validations Yet</h3>
            <p className="text-muted-foreground mb-2">
              This quest hasn't been validated yet. Validations run automatically for active quests.
            </p>
            <p className="text-xs text-muted-foreground">
              Validations typically run every 5-10 minutes for active quests.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium">Validation History</h3>

      <div className="space-y-3">
        {validations.map((validation) => (
          <Card key={validation.id} className="overflow-hidden">
            <div
              className="flex items-center justify-between p-4 cursor-pointer"
              onClick={() => toggleValidation(validation.id)}
            >
              <div className="flex items-center gap-3">
                {getStatusIcon(validation.status)}
                <div>
                  <h4 className="font-medium">
                    Validation {new Date(validation.validatedAt).toLocaleString()}
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    {getStatusDescription(validation)}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {validation.validAddresses && Array.isArray(validation.validAddresses) && (
                  <div className="flex items-center text-sm text-muted-foreground">
                    <Users className="size-4 mr-1" />
                    {validation.validAddresses.length} valid
                  </div>
                )}
                {selectedValidation === validation.id ?
                  <ChevronDown className="size-5" /> :
                  <ChevronRight className="size-5" />
                }
              </div>
            </div>

            {selectedValidation === validation.id && (
              <div className="border-t p-4">
                {loadingResults ? (
                  <div className="flex justify-center py-4">
                    <div className="animate-spin rounded-full size-6 border-b-2 border-primary"></div>
                  </div>
                ) : validationResults.length > 0 ? (
                  <div>
                    <div className="mb-4">
                      <div className="flex justify-between text-sm mb-2">
                        <span className="font-medium">Processing time:</span>
                        <span>{validation.processingTime ? `${validation.processingTime}ms` : 'N/A'}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="font-medium">Next validation:</span>
                        <span>
                          {validation.nextValidationAt
                            ? new Date(validation.nextValidationAt).toLocaleString()
                            : 'Not scheduled'}
                        </span>
                      </div>
                    </div>

                    <h5 className="font-medium mb-2">Validation Results</h5>
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                      {validationResults.map((result) => (
                        <div
                          key={result.id}
                          className={`p-2 rounded text-sm ${result.isValid ? 'bg-green-50 border border-green-100' : 'bg-gray-50 border border-gray-100'
                            }`}
                        >
                          <div className="flex justify-between mb-1">
                            <span className="font-medium">{result.userAddress.slice(0, 8)}...{result.userAddress.slice(-8)}</span>
                            <span className={result.isValid ? 'text-green-600' : 'text-gray-500'}>
                              {result.isValid ? 'Valid' : 'Invalid'}
                            </span>
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Type: {result.criteriaType}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-4 text-muted-foreground">
                    No detailed results available
                  </div>
                )}

                {validation.errorMessage && (
                  <div className="mt-4 p-3 bg-red-50 border border-red-100 rounded text-sm text-red-700">
                    <div className="font-medium mb-1">Error:</div>
                    <div>{validation.errorMessage}</div>
                  </div>
                )}
              </div>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}

function getStatusIcon(status: string) {
  switch (status) {
    case 'success':
      return <CheckCircle className="size-5 text-green-500" />;
    case 'failed':
      return <AlertTriangle className="size-5 text-red-500" />;
    case 'partial':
      return <Activity className="size-5 text-amber-500" />;
    case 'pending':
    default:
      return <Clock className="size-5 text-blue-500" />;
  }
}

function getStatusDescription(validation: QuestValidation) {
  switch (validation.status) {
    case 'success':
      return `Validation completed successfully with ${validation.validAddresses && Array.isArray(validation.validAddresses)
          ? validation.validAddresses.length
          : 0
        } valid addresses`;
    case 'failed':
      return 'Validation failed due to an error';
    case 'partial':
      return 'Validation completed with partial results';
    case 'pending':
    default:
      return 'Validation in progress';
  }
}