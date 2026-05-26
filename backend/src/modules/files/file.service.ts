import pdf from 'pdf-parse';
import mammoth from 'mammoth';
import { supabase } from '../config/supabase';
import { EmbeddingService } from '../embeddings/embedding.service';

export class FileService {
  /**
   * Helper function to extract plain text from file buffers based on file extensions.
   */
  static async extractText(buffer: Buffer, originalName: string): Promise<string> {
    const ext = originalName.split('.').pop()?.toLowerCase();
    
    if (ext === 'pdf') {
      const data = await pdf(buffer);
      return data.text;
    } else if (ext === 'docx') {
      const result = await mammoth.extractRawText({ buffer });
      return result.value;
    } else {
      // Default to plain text
      return buffer.toString('utf-8');
    }
  }

  /**
   * Chunks extracted text into smaller segments of 300 to 500 tokens (approx. 1200 - 1800 characters)
   * with standard sentence boundary matching and character overlaps to prevent context leaks.
   */
  static chunkText(text: string, chunkSize: number = 1500, chunkOverlap: number = 200): string[] {
    const chunks: string[] = [];
    if (!text) return chunks;

    // Remove double spacings and normalise newlines for clean parsing
    const cleanedText = text.replace(/\r\n/g, '\n').replace(/ +/g, ' ');
    
    let start = 0;
    while (start < cleanedText.length) {
      let end = start + chunkSize;
      if (end >= cleanedText.length) {
        chunks.push(cleanedText.slice(start).trim());
        break;
      }

      // Sentence boundary scan boundary
      let splitPoint = end;
      const scanLimit = Math.max(start, end - 180);
      for (let i = end; i > scanLimit; i--) {
        if (['.', '!', '?', '\n'].includes(cleanedText[i])) {
          splitPoint = i + 1; // Include the separator
          break;
        }
      }

      chunks.push(cleanedText.slice(start, splitPoint).trim());
      
      // Advance starting point minus overlap
      start = splitPoint - chunkOverlap;
      if (start < 0) start = 0;
      if (start >= splitPoint) start = splitPoint + 1; // Safeguard against loop freezing
    }

    return chunks.filter(c => c.length > 15);
  }

  /**
   * Main pipeline: extracts text, chunks it, stores file logs, generates embeddings and saves to Supabase pgvector.
   */
  static async indexFile(
    fileName: string,
    fileSize: string,
    mimeType: string,
    fileBuffer: Buffer,
    userId: string,
    groupId: string,
    title?: string,
    description?: string
  ) {
    // 1. Text extraction
    const extractedText = await this.extractText(fileBuffer, fileName);
    if (!extractedText || extractedText.trim().length === 0) {
      throw new Error('Failed to extract text. File appears empty or unsupported.');
    }

    // 2. Chunks generation
    const chunks = this.chunkText(extractedText);
    if (chunks.length === 0) {
      throw new Error('Text extraction did not yield sufficient content chunks to index.');
    }

    // 3. Register file logs in Supabase
    const { data: fileData, error: fileError } = await supabase
      .from('files')
      .insert({
        name: title || fileName,
        size: fileSize,
        mime_type: mimeType,
        user_id: userId,
        group_id: groupId,
        description: description || null,
        url: '#'
      })
      .select()
      .single();

    if (fileError) {
      throw new Error(`Supabase files database insert error: ${fileError.message}`);
    }

    const fileId = fileData.id;

    // 4. Generate embeddings and construct chunk inserts
    try {
      const chunkPromises = chunks.map(async (content, idx) => {
        try {
          const embedding = await EmbeddingService.generateEmbedding(content);
          return {
            file_id: fileId,
            user_id: userId,
            group_id: groupId,
            content,
            embedding,
          };
        } catch (err: any) {
          console.error(`Failed to embed chunk index [${idx}] of file [${fileName}]:`, err);
          return null;
        }
      });

      const chunkData = (await Promise.all(chunkPromises)).filter(c => c !== null);

      if (chunkData.length === 0) {
        throw new Error('Failed to generate embeddings for any text chunks.');
      }

      // 5. Bulk insert document chunks
      const { error: chunksError } = await supabase
        .from('document_chunks')
        .insert(chunkData);

      if (chunksError) {
        throw new Error(`Supabase document_chunks database insert error: ${chunksError.message}`);
      }

      return {
        fileId,
        chunksCount: chunkData.length,
      };
    } catch (err: any) {
      // Revert/cleanup the file record if chunk insertion fails
      await supabase.from('files').delete().eq('id', fileId);
      throw err;
    }
  }

  /**
   * Lists all indexed files belonging to a specific project group workspace.
   */
  static async listFiles(groupId: string) {
    const { data, error } = await supabase
      .from('files')
      .select('*')
      .eq('group_id', groupId)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Supabase list files error: ${error.message}`);
    }
    return data;
  }

  /**
   * Deletes a file and all associated document chunks (cascades automatically in DB).
   */
  static async deleteFile(fileId: string) {
    const { error } = await supabase
      .from('files')
      .delete()
      .eq('id', fileId);

    if (error) {
      throw new Error(`Supabase delete file error: ${error.message}`);
    }
    return true;
  }

  /**
   * Creates a persistent shared link resource inside the files database table.
   */
  static async createLink(
    title: string,
    url: string,
    category: string,
    description: string,
    userId: string,
    groupId: string
  ) {
    const { data, error } = await supabase
      .from('files')
      .insert({
        name: title,
        url,
        mime_type: category, // Category maps to mime_type (e.g. 'Google Drive', 'Figma')
        description,
        user_id: userId,
        group_id: groupId,
        size: 'Link'
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Supabase create link error: ${error.message}`);
    }
    return data;
  }

  /**
   * Updates an existing resource's title, description, and link (if it is a link).
   */
  static async updateResource(
    id: string,
    title: string,
    description: string,
    url: string | null
  ) {
    const updateData: any = {
      name: title,
      description,
      updated_at: new Date().toISOString()
    };
    if (url !== null && url !== undefined) {
      updateData.url = url;
    }

    const { data, error } = await supabase
      .from('files')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(`Supabase update resource error: ${error.message}`);
    }
    return data;
  }
}

