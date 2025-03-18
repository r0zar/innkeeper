import {
  customProvider,
  extractReasoningMiddleware,
  wrapLanguageModel,
} from 'ai';
import { openai } from '@ai-sdk/openai';
import { anthropic } from '@ai-sdk/anthropic';
import { fireworks } from '@ai-sdk/fireworks';
import { isTestEnvironment } from '../constants';
import {
  artifactModel,
  chatModel,
  reasoningModel,
  titleModel,
} from './models.test';

export const myProvider = isTestEnvironment
  ? customProvider({
    languageModels: {
      'chat-model-small': chatModel,
      'chat-model-large': chatModel,
      'chat-model-reasoning': reasoningModel,
      'title-model': titleModel,
      'artifact-model': artifactModel,
    },
  })
  : customProvider({
    languageModels: {
      'chat-model-small': anthropic('claude-3-haiku-20240307'),
      'chat-model-large': anthropic('claude-3-7-sonnet-20250219'),
      'chat-model-reasoning': wrapLanguageModel({
        model: fireworks('accounts/fireworks/models/deepseek-r1'),
        middleware: extractReasoningMiddleware({ tagName: 'think' }),
      }),
      'title-model': anthropic('claude-3-7-sonnet-20250219'),
      'artifact-model': openai('gpt-4o-mini'),
    },
    imageModels: {
      'small-model': openai.image('dall-e-2'),
      'large-model': openai.image('dall-e-3'),
    },
  });
