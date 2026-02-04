import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';
import { getApiKey, getDefaultProvider, type ApiProvider } from './db';

/**
 * Get configured Anthropic client
 * Uses API key from database settings, falling back to environment variable
 */
export function getAnthropicClient(): Anthropic {
  const apiKey = getApiKey('anthropic');
  if (!apiKey) {
    throw new Error('Anthropic API key not configured. Please set it in Settings or ANTHROPIC_API_KEY environment variable.');
  }
  return new Anthropic({ apiKey });
}

/**
 * Get configured OpenAI client
 * Uses API key from database settings, falling back to environment variable
 */
export function getOpenAIClient(): OpenAI {
  const apiKey = getApiKey('openai');
  if (!apiKey) {
    throw new Error('OpenAI API key not configured. Please set it in Settings or OPENAI_API_KEY environment variable.');
  }
  return new OpenAI({ apiKey });
}

/**
 * Check if a provider is configured
 */
export function isProviderConfigured(provider: ApiProvider): boolean {
  return getApiKey(provider) !== null;
}

/**
 * Get the default configured provider
 */
export function getConfiguredDefaultProvider(): ApiProvider {
  const defaultProvider = getDefaultProvider();
  if (isProviderConfigured(defaultProvider)) {
    return defaultProvider;
  }
  // Fall back to first configured provider
  const providers: ApiProvider[] = ['anthropic', 'openai', 'google', 'groq'];
  for (const provider of providers) {
    if (isProviderConfigured(provider)) {
      return provider;
    }
  }
  return 'anthropic'; // Return default even if not configured
}

/**
 * Get all configured providers
 */
export function getConfiguredProviders(): ApiProvider[] {
  const providers: ApiProvider[] = ['anthropic', 'openai', 'google', 'groq'];
  return providers.filter(isProviderConfigured);
}
