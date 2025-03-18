'use client';

import type { UIMessage } from 'ai';
import cx from 'classnames';
import { AnimatePresence, motion } from 'framer-motion';
import { memo, useState } from 'react';
import type { Vote } from '@/lib/db/schema';
import { DocumentToolCall, DocumentToolResult } from './document';
import { PencilEditIcon, SparklesIcon } from './icons';
import { Markdown } from './markdown';
import { MessageActions } from './message-actions';
import { PreviewAttachment } from './preview-attachment';
import { Weather } from './weather';
import { TokenSearch } from './token-search';
import { TokenInfo } from './token-info';
import { TokenList } from './token-list';
import { ValidationResults } from './validation-results';
import { SwapActivity } from './swap-activity';
import equal from 'fast-deep-equal';
import { cn } from '@/lib/utils';
import { Button } from './ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip';
import { MessageEditor } from './message-editor';
import { DocumentPreview } from './document-preview';
import { MessageReasoning } from './message-reasoning';
import { UseChatHelpers } from '@ai-sdk/react';
import { Badge } from './ui/badge';

const PurePreviewMessage = ({
  chatId,
  message,
  vote,
  isLoading,
  setMessages,
  reload,
  isReadonly,
}: {
  chatId: string;
  message: UIMessage;
  vote: Vote | undefined;
  isLoading: boolean;
  setMessages: UseChatHelpers['setMessages'];
  reload: UseChatHelpers['reload'];
  isReadonly: boolean;
}) => {
  const [mode, setMode] = useState<'view' | 'edit'>('view');

  return (
    <AnimatePresence>
      <motion.div
        data-testid={`message-${message.role}`}
        className="w-full mx-auto ma4xl px-4 group/message"
        initial={{ y: 5, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        data-role={message.role}
      >
        <div
          className={cn(
            'flex gap-4 w-full group-data-[role=user]/message:ml-auto group-data-[role=user]/message:max-w-2xl',
            {
              'w-full': mode === 'edit',
              'group-data-[role=user]/message:w-fit': mode !== 'edit',
            },
          )}
        >
          {message.role === 'assistant' && (
            <div className="size-8 flex items-center rounded-full justify-center ring-1 shrink-0 ring-border bg-background">
              <div className="translate-y-px">
                <SparklesIcon size={14} />
              </div>
            </div>
          )}

          <div className="flex flex-col gap-4 w-full">
            {message.experimental_attachments && (
              <div
                data-testid={`message-attachments`}
                className="flex flex-row justify-end gap-2"
              >
                {message.experimental_attachments.map((attachment) => (
                  <PreviewAttachment
                    key={attachment.url}
                    attachment={attachment}
                  />
                ))}
              </div>
            )}

            {message.parts?.map((part, index) => {
              const { type } = part;
              const key = `message-${message.id}-part-${index}`;

              if (type === 'reasoning') {
                return (
                  <MessageReasoning
                    key={key}
                    isLoading={isLoading}
                    reasoning={part.reasoning}
                  />
                );
              }

              if (type === 'text') {
                if (mode === 'view') {
                  return (
                    <div key={key} className="flex flex-row gap-2 items-start">
                      {message.role === 'user' && !isReadonly && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              data-testid="message-edit-button"
                              variant="ghost"
                              className="px-2 h-fit rounded-full text-muted-foreground opacity-0 group-hover/message:opacity-100"
                              onClick={() => {
                                setMode('edit');
                              }}
                            >
                              <PencilEditIcon />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Edit message</TooltipContent>
                        </Tooltip>
                      )}

                      <div
                        data-testid="message-content"
                        className={cn('flex flex-col gap-4', {
                          'bg-primary text-primary-foreground px-3 py-2 rounded-xl':
                            message.role === 'user',
                        })}
                      >
                        <Markdown>{part.text}</Markdown>
                      </div>
                    </div>
                  );
                }

                if (mode === 'edit') {
                  return (
                    <div key={key} className="flex flex-row gap-2 items-start">
                      <div className="size-8" />

                      <MessageEditor
                        key={message.id}
                        message={message}
                        setMode={setMode}
                        setMessages={setMessages}
                        reload={reload}
                      />
                    </div>
                  );
                }
              }

              if (type === 'tool-invocation') {
                const { toolInvocation } = part;
                const { toolName, toolCallId, state } = toolInvocation;

                if (state === 'call') {
                  const { args } = toolInvocation;

                  return (
                    <div
                      key={toolCallId}
                      className={cx({
                        skeleton: ['getWeather'].includes(toolName),
                      })}
                    >
                      {toolName === 'getWeather' ? (
                        <Weather />
                      ) : toolName === 'searchTokens' ? (
                        <div className="animate-pulse p-4 rounded-lg border border-border">
                          <p className="text-muted-foreground">Searching for tokens...</p>
                        </div>
                      ) : toolName === 'getBlockchainData' || toolName === 'getBlockchainInfo' ? (
                        <div className="animate-pulse p-4 rounded-lg border border-border">
                          <div className="flex items-center gap-2">
                            <div className="h-10 w-10 rounded-full bg-muted"></div>
                            <div className="space-y-2">
                              <div className="h-4 w-40 bg-muted rounded"></div>
                              <div className="h-3 w-24 bg-muted rounded"></div>
                            </div>
                          </div>
                          <div className="mt-4 space-y-2">
                            <div className="h-3 w-full bg-muted rounded"></div>
                            <div className="h-3 w-4/5 bg-muted rounded"></div>
                            <div className="h-3 w-2/3 bg-muted rounded"></div>
                          </div>
                        </div>
                      ) : toolName === 'createDocument' ? (
                        <DocumentPreview isReadonly={isReadonly} args={args} />
                      ) : toolName === 'updateDocument' ? (
                        <DocumentToolCall
                          type="update"
                          args={args}
                          isReadonly={isReadonly}
                        />
                      ) : toolName === 'requestSuggestions' ? (
                        <DocumentToolCall
                          type="request-suggestions"
                          args={args}
                          isReadonly={isReadonly}
                        />
                      ) : toolName === 'createQuest' ? (
                        <div className="animate-pulse p-4 rounded-lg border border-border">
                          <p className="text-muted-foreground">Creating quest...</p>
                        </div>
                      ) : null}
                    </div>
                  );
                }

                if (state === 'result') {
                  const { result } = toolInvocation;

                  return (
                    <div key={toolCallId}>
                      {toolName === 'getWeather' ? (
                        <Weather weatherAtLocation={result} />
                      ) : toolName === 'searchTokens' ? (
                        <TokenSearch searchResults={result} />
                      ) : result.action === 'get-token-info' ? (
                        <TokenInfo tokenData={result.data} />
                      ) : result.action === 'get-token-price' ? (
                        <TokenInfo
                          tokenData={result.data || {}}
                          priceHistory={result.data || []}
                          latestPrice={result.latestPrice}
                        />
                      ) : result.action === 'list-tokens' ? (
                        <TokenList
                          tokens={result.tokens || []}
                          count={result.count}
                          title="Available Tokens"
                          description={result.usage}
                        />
                      ) : result.action === 'get-latest-prices' ? (
                        <TokenList
                          tokens={result.topTokens?.map((item: any) => ({
                            name: item.token,
                            symbol: '',
                            decimals: 6,
                            contract_principal: item.token,
                            price_usd: item.price
                          })) || []}
                          showPrices={true}
                          prices={result.prices || {}}
                          title="Top Tokens by Price"
                          description={result.usage}
                        />
                      ) : result.action === 'get-recent-swaps' ? (
                        <SwapActivity
                          swaps={result.data || []}
                          timeframe={result.timeframe || "Recent Activity"}
                        />
                      ) : result.action === 'get-user-activity' ? (
                        <SwapActivity
                          swaps={result.swaps || []}
                          transfers={result.tokenTransfers?.data || []}
                          timeframe={result.timeframe || "Recent Activity"}
                          userAddress={result.userAddress}
                        />
                      ) :
                        (result.action === 'validate-token-swap' ||
                          result.action === 'validate-first-n-buyers' ||
                          result.action === 'validate-min-value-swap' ||
                          result.action === 'validate-token-holding') ? (
                          <ValidationResults
                            result={{
                              satisfied: result.validation?.satisfied || false,
                              matches: result.sampleMatches || result.transfers || [],
                              metadata: result.validation?.metadata || {}
                            }}
                            title={result.validation?.criteria || "Validation Results"}
                            description={`Timeframe: ${result.validation?.timeframe || "Current"}`}
                          />
                        ) : result.action === 'preview-quest-validation' ? (
                          <div className="space-y-4">
                            <div className="rounded-lg border p-4">
                              <h3 className="text-base font-medium mb-2">Quest Validation Preview</h3>
                              <p className="text-sm text-muted-foreground mb-3">
                                Preview of different validation options for {result.timeframe}
                              </p>
                              <div className="space-y-3">
                                {Object.entries(result.previewResults).map(([key, validation]: [string, any]) => (
                                  <div key={key} className={cn(
                                    "p-3 rounded-md border",
                                    validation.satisfied
                                      ? "border-green-200 bg-green-50 dark:bg-green-950/30 dark:border-green-900"
                                      : "border-amber-200 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-900"
                                  )}>
                                    <div className="flex items-center justify-between">
                                      <div>
                                        <Badge
                                          variant={validation.satisfied ? "success" : "warning"}
                                          className="mb-1"
                                        >
                                          {validation.satisfied ? "Will Pass" : "May Fail"}
                                        </Badge>
                                        <p className="text-sm font-medium">{validation.criteria}</p>
                                      </div>
                                      <div className="text-sm">
                                        {validation.matched} matches
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                            {result.recommendedValidation && (
                              <div className="rounded-lg border-2 border-green-300 p-4 bg-green-50 dark:bg-green-950/20">
                                <h3 className="text-base font-medium text-green-800 dark:text-green-300 mb-1">
                                  Recommended Validation
                                </h3>
                                <p className="text-sm text-green-700 dark:text-green-400">
                                  {result.recommendedValidation.message}
                                </p>
                              </div>
                            )}
                          </div>
                        ) :
                          (result.action === 'get-current-time' ||
                            result.action === 'convert-date' ||
                            result.action === 'get-timeframe') ? (
                            <div className="rounded-lg border p-4">
                              <h3 className="text-base font-medium mb-3">
                                {result.action === 'get-current-time' ? 'Current Time' :
                                  result.action === 'convert-date' ? 'Date Conversion' :
                                    'Timeframe Information'}
                              </h3>
                              <div className="grid grid-cols-2 gap-3 text-sm">
                                {Object.entries(
                                  result.action === 'get-timeframe' ? result.timeframe :
                                    result.action === 'convert-date' ? result.results : result
                                )
                                  .filter(([key]) => key !== 'action' && key !== 'success')
                                  .map(([key, value]) => (
                                    <div key={key} className="border rounded p-2">
                                      <div className="text-xs text-muted-foreground mb-1">
                                        {key.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                                      </div>
                                      <div className="font-medium">{String(value)}</div>
                                    </div>
                                  ))}
                              </div>
                            </div>
                          ) : toolName === 'createDocument' ? (
                            <DocumentPreview
                              isReadonly={isReadonly}
                              result={result}
                            />
                          ) : toolName === 'updateDocument' ? (
                            <DocumentToolResult
                              type="update"
                              result={result}
                              isReadonly={isReadonly}
                            />
                          ) : toolName === 'requestSuggestions' ? (
                            <DocumentToolResult
                              type="request-suggestions"
                              result={result}
                              isReadonly={isReadonly}
                            />
                          ) : toolName === 'createQuest' ? (
                            <div className="p-4 rounded-lg border border-green-200 bg-green-50 dark:bg-green-950 dark:border-green-800">
                              <h3 className="text-green-800 dark:text-green-300 font-medium">Quest Created</h3>
                              <p className="text-green-700 dark:text-green-400 text-sm mt-1">
                                {result.message}
                              </p>
                              <p className="text-xs text-green-600 dark:text-green-500 mt-2">
                                Quest ID: {result.questId}
                              </p>
                            </div>
                          ) : (
                            <pre>{JSON.stringify(result, null, 2)}</pre>
                          )}
                    </div>
                  );
                }
              }
            })}

            {!isReadonly && (
              <MessageActions
                key={`action-${message.id}`}
                chatId={chatId}
                message={message}
                vote={vote}
                isLoading={isLoading}
              />
            )}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export const PreviewMessage = memo(
  PurePreviewMessage,
  (prevProps, nextProps) => {
    if (prevProps.isLoading !== nextProps.isLoading) return false;
    if (prevProps.message.id !== nextProps.message.id) return false;
    if (!equal(prevProps.message.parts, nextProps.message.parts)) return false;
    if (!equal(prevProps.vote, nextProps.vote)) return false;

    return true;
  },
);

export const ThinkingMessage = () => {
  const role = 'assistant';

  return (
    <motion.div
      data-testid="message-assistant-loading"
      className="w-full mx-auto max-w-4xl px-4 group/message "
      initial={{ y: 5, opacity: 0 }}
      animate={{ y: 0, opacity: 1, transition: { delay: 1 } }}
      data-role={role}
    >
      <div
        className={cx(
          'flex gap-4 group-data-[role=user]/message:px-3 w-full group-data-[role=user]/message:w-fit group-data-[role=user]/message:ml-auto group-data-[role=user]/message:max-w-2xl group-data-[role=user]/message:py-2 rounded-xl',
          {
            'group-data-[role=user]/message:bg-muted': true,
          },
        )}
      >
        <div className="size-8 flex items-center rounded-full justify-center ring-1 shrink-0 ring-border">
          <SparklesIcon size={14} />
        </div>

        <div className="flex flex-col gap-2 w-full">
          <div className="flex flex-col gap-4 text-muted-foreground">
            Hmm...
          </div>
        </div>
      </div>
    </motion.div>
  );
};
