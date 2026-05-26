import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

// Retrieve API keys from env: supports a comma-separated list of keys, fallback to single key
const keysEnv = process.env.GEMINI_API_KEYS || process.env.GEMINI_API_KEY || '';
const apiKeys = keysEnv
  .split(',')
  .map(k => k.trim())
  .filter(k => k.length > 0);

if (apiKeys.length === 0) {
  console.warn('WARNING: No Gemini API keys are configured in the environment.');
} else {
  console.log(`[Gemini Config] Loaded ${apiKeys.length} API key(s) for rotation.`);
}

let activeKeyIndex = 0;

// Initialize a client instance for each configured key
const clients = apiKeys.map(key => new GoogleGenAI({
  apiKey: key,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
}));

/**
 * Returns the currently active Gemini client instance.
 */
export function getGeminiClient(): GoogleGenAI | null {
  if (clients.length === 0) return null;
  return clients[activeKeyIndex];
}

/**
 * Rotates the active API key index to the next available key.
 */
export function rotateGeminiKey(): void {
  if (clients.length <= 1) return;
  const oldIndex = activeKeyIndex;
  activeKeyIndex = (activeKeyIndex + 1) % clients.length;
  console.warn(`[Gemini Rotation] API key at index ${oldIndex} exceeded limit/quota. Rotated to index ${activeKeyIndex}.`);
}

/**
 * Helper wrapper that runs a Gemini API operation. If the operation fails with a 
 * resource/quota limit or rate limit error (status 429 / RESOURCE_EXHAUSTED), it 
 * automatically rotates the API key and retries the operation.
 */
export async function executeWithRotation<T>(
  operation: (client: GoogleGenAI) => Promise<T>,
  maxRetries: number = apiKeys.length
): Promise<T> {
  let attempt = 0;
  
  while (attempt < maxRetries) {
    const client = getGeminiClient();
    if (!client) {
      throw new Error('No Gemini API client is initialized. Please configure GEMINI_API_KEYS.');
    }

    try {
      return await operation(client);
    } catch (error: any) {
      const errorMessage = error.message || '';
      const status = error.status || error.statusCode;

      // Detect common rate limit / quota exceeded errors
      const isQuotaOrRateLimit =
        status === 429 ||
        errorMessage.includes('RESOURCE_EXHAUSTED') ||
        errorMessage.includes('429') ||
        errorMessage.toLowerCase().includes('quota') ||
        errorMessage.toLowerCase().includes('limit exceeded') ||
        errorMessage.toLowerCase().includes('rate limit');

      if (isQuotaOrRateLimit && clients.length > 1 && attempt < maxRetries - 1) {
        rotateGeminiKey();
        attempt++;
      } else {
        // For other errors, or if we have tried all keys, throw the error
        throw error;
      }
    }
  }

  throw new Error('All configured Gemini API keys have been exhausted and rate-limited.');
}
