import { executeWithRotation } from '../config/gemini';

export class GeminiService {
  /**
   * Generates a text answer from the Gemini LLM model using system instructions and context-filled user prompt.
   * Automatically rotates configured API keys if rate limits or quota boundaries are met.
   */
  static async generateAnswer(systemInstruction: string, prompt: string): Promise<string> {
    try {
      return await executeWithRotation(async (client) => {
        const response = await client.models.generateContent({
          model: 'gemini-3.5-flash',
          contents: prompt,
          config: {
            systemInstruction,
          },
        });
        
        return response.text || 'No response generated from AI.';
      });
    } catch (error: any) {
      console.error('Error generating content from Gemini LLM:', error);
      throw new Error(`Gemini LLM service error: ${error.message || error}`);
    }
  }
}
