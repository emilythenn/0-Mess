import { executeWithRotation } from '../config/gemini';

export class EmbeddingService {
  /**
   * Generates a 768-dimension vector embedding for the given text using text-embedding-004.
   * Automatically rotates API keys if rate limits or quota boundaries are met.
   */
  static async generateEmbedding(text: string): Promise<number[]> {
    try {
      return await executeWithRotation(async (client) => {
        const res = await client.models.embedContent({
          model: 'gemini-embedding-2',
          contents: text,
          config: {
            outputDimensionality: 768
          }
        });

        const values = res.embeddings?.[0]?.values;
        if (!values) {
          throw new Error('Missing embedding values in Gemini API response.');
        }
        return values;
      });
    } catch (error: any) {
      console.error('Error generating embedding from text-embedding-004:', error);
      throw new Error(`Embedding service error: ${error.message || error}`);
    }
  }
}
