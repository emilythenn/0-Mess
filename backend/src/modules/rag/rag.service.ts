import { supabase } from '../config/supabase';
import { EmbeddingService } from '../embeddings/embedding.service';
import { GeminiService } from '../ai/gemini.service';
import { getGeminiClient } from '../config/gemini';

export class RagService {
  /**
   * Main RAG Query flow:
   * 1. Generates query embedding from question.
   * 2. Query Supabase for top 5-10 similar document chunks in the active group workspace.
   * 3. Construct a context-rich prompt and feed it to the Gemini LLM.
   * 4. Return response + original source files.
   */
  static async queryRAG(question: string, groupId: string, userId: string) {
    // Check if Gemini is in offline demo mode
    const client = getGeminiClient();
    if (!client) {
      const lowerPrompt = question.toLowerCase();
      let fallbackReply = "I am the project workspace RAG assistant. Note: The Gemini AI semantic search capabilities are currently running in local offline demo mode because no API keys are configured in the server environment.";

      if (lowerPrompt.includes("hello") || lowerPrompt.includes("hi")) {
        fallbackReply = "Hello! I am the project workspace RAG assistant. How can I help coordinate your group assignment today?";
      } else if (lowerPrompt.includes("conflict") || lowerPrompt.includes("disagree")) {
        fallbackReply = "Conflict in group projects is common! Try setting up a precise milestone with a defined lead role, or publish a new Attendance Schedule Ballot under the Team tab.";
      } else if (lowerPrompt.includes("syllabus") || lowerPrompt.includes("objective")) {
        fallbackReply = "You can upload your syllabus PDF under the Resources or Overview tab, and we can reference it for our group's tasks.";
      } else if (lowerPrompt.includes("task") || lowerPrompt.includes("kanban")) {
        fallbackReply = "Our Sprint Kanban Board allows you to log tasks, assign owners, and track development progress in real-time.";
      } else if (lowerPrompt.includes("vote") || lowerPrompt.includes("ballot")) {
        fallbackReply = "You can publish a meeting poll under the Team tab. Members can cast their availability votes to finalize the best slot.";
      }

      return {
        reply: fallbackReply,
        sources: [],
      };
    }

    // 1. Convert user question into embedding

    const queryEmbedding = await EmbeddingService.generateEmbedding(question);

    // 2. Query Supabase similarity search RPC function
    const { data: chunks, error: rpcError } = await supabase.rpc('match_document_chunks', {
      query_embedding: queryEmbedding,
      match_threshold: 0.15, // Retrieve matching vectors above similarity threshold
      match_count: 8,        // Get top 8 chunks for context
      filter_group_id: groupId,
    });

    if (rpcError) {
      console.error('Error invoking Supabase match_document_chunks:', rpcError);
      throw new Error(`Vector similarity query failed: ${rpcError.message}`);
    }

    // If no relevant documents found in the database, answer with a standard placeholder disclaimer
    if (!chunks || chunks.length === 0) {
      const fallbackPrompt = `User question: "${question}"\n\nNo relevant workspace files or documents have been uploaded to reference. Answer the user's question directly to the best of your ability. Politely mention to the user that there are no uploaded workspace documents to pull this context from yet.`;
      
      const systemInstruction = "You are the friendly '0-Mess AI Assistant' embedded in a university project collaboration interface. Answer student coordination questions politely.";
      const reply = await GeminiService.generateAnswer(systemInstruction, fallbackPrompt);
      
      return {
        reply,
        sources: [],
      };
    }

    // 3. Consolidate context text and associate source files
    const contextText = chunks
      .map((chunk: any, index: number) => `[Source doc index ${index + 1}]:\n${chunk.content}`)
      .join('\n\n');

    // 4. Construct prompt with retrieved chunks + user question
    const prompt = `Use the following retrieved document excerpts from the workspace files as your source of truth to answer the user's question. If the document excerpts do not contain the answer, answer the question using your general knowledge but note that the uploaded files did not cover this specific question.

Retrieved Document Excerpts:
${contextText}

User Question:
${question}

Instructions:
- Answer the user's question clearly, addressing them as part of the student group.
- Reference the sources (e.g. [Source doc index 1], [Source doc index 2]) in your response where you draw information from.
- Keep the formatting neat with standard scannable markdown.`;

    const systemInstruction = "You are the friendly '0-Mess AI Assistant' performing Retrieval-Augmented Generation (RAG) using documents uploaded in the workspace group. Cite sources where appropriate.";

    // 5. Generate LLM response
    const reply = await GeminiService.generateAnswer(systemInstruction, prompt);

    // Retrieve unique source file records for metadata returning
    const fileIds = Array.from(new Set(chunks.map((c: any) => c.file_id))) as string[];
    let sources: { id: string; name: string }[] = [];

    if (fileIds.length > 0) {
      const { data: filesData } = await supabase
        .from('files')
        .select('id, name')
        .in('id', fileIds);

      if (filesData) {
        sources = filesData.map((f: any) => ({
          id: f.id,
          name: f.name,
        }));
      }
    }

    return {
      reply,
      sources,
    };
  }
}
