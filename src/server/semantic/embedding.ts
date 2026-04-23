import { logger } from '../services/Logger.js';

const OLLAMA_HOST = process.env.OLLAMA_HOST || 'http://localhost:11434';
const OLLAMA_EMBED_MODEL = process.env.OLLAMA_EMBED_MODEL || 'all-minilm:v2'; // 384 dimensions

const EXO_HOST = process.env.EXO_HOST || 'http://127.0.0.1:52415';
const EXO_EMBED_MODEL = process.env.EXO_EMBED_MODEL || 'mlx-community/all-MiniLM-L6-v2-MLX-8bit';

/**
 * Generates an embedding for the given text using the configured AI provider.
 */
export async function getEmbedding(text: string): Promise<number[]> {
  const provider = process.env.AI_PROVIDER || 'local_ollama';

  try {
    if (provider === 'exo_cluster') {
      const response = await fetch(`${EXO_HOST}/v1/embeddings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: EXO_EMBED_MODEL,
          input: text,
        }),
        signal: AbortSignal.timeout(30000),
      });

      if (!response.ok) {
        throw new Error(`Exo embeddings failed: ${response.status}`);
      }

      interface ExoEmbeddingResponse {
        data: { embedding: number[] }[];
      }
      const data = (await response.json()) as ExoEmbeddingResponse;
      return data.data[0].embedding;
    } else {
      // Ollama
      const response = await fetch(`${OLLAMA_HOST}/api/embeddings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: OLLAMA_EMBED_MODEL,
          prompt: text,
        }),
        signal: AbortSignal.timeout(30000),
      });

      if (!response.ok) {
        throw new Error(`Ollama embeddings failed: ${response.status}`);
      }

      interface OllamaEmbeddingResponse {
        embedding: number[];
      }
      const data = (await response.json()) as OllamaEmbeddingResponse;
      return data.embedding;
    }
  } catch (error) {
    logger.error({ err: error, text: text.slice(0, 50) }, '[semantic] embedding generation failed');
    throw error;
  }
}
