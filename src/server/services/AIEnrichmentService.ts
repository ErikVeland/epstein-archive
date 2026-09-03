/**
 * AI Enrichment Service (v3.0)
 *
 * Provides an "Intelligence Stage" to replace deterministic regex logic
 * with context-aware LLM agents.
 *
 * Supports two inference backends:
 *   - Ollama (single-machine, default)
 *   - Exo (distributed cluster via macOS 26.2 Thunderbolt 5 RDMA)
 */

import { logger } from './Logger.js';
import { throttleExoForUserActivity } from './exoActivityGovernor.js';

declare const process: NodeJS.Process;

export interface EnrichmentOutput {
  refinedText: string;
  inferences: {
    type: string;
    description: string;
    confidence: number;
  }[];
  isSensitive: boolean;
}

export class ExoModelUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ExoModelUnavailableError';
  }
}

export class AIEnrichmentService {
  // Ollama (single-machine) configuration
  private static OLLAMA_HOST = process.env.OLLAMA_HOST || 'http://localhost:11434';
  private static OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'llama3.2:1b';

  // Exo (distributed cluster) configuration
  private static EXO_HOST = process.env.EXO_HOST || 'http://127.0.0.1:52415';
  private static discoveredExoModel: string | null = null;
  private static discoveredExoGraphModel: string | null =
    process.env.GRAPH_EXTRACTION_MODEL || null;
  private static discoveredExoVisionModel: string | null = process.env.VISION_MODEL || null;
  // Models confirmed as not running (404 from EXO) — skipped during re-discovery
  private static exoUnavailableModels: Set<string> = new Set();
  private static EXO_DISCOVERY_TIMEOUT_MS = Math.max(
    1000,
    parseInt(process.env.EXO_DISCOVERY_TIMEOUT_MS || '8000', 10) || 8000,
  );
  private static AI_REQUEST_TIMEOUT_MS = Math.max(
    1000,
    parseInt(process.env.AI_REQUEST_TIMEOUT_MS || '120000', 10) || 120000,
  );
  private static callableExoModels: string[] = [];
  private static callableExoModelsCheckedAt = 0;
  private static EXO_CALLABLE_CACHE_MS = Math.max(
    1000,
    parseInt(process.env.EXO_CALLABLE_CACHE_MS || '60000', 10) || 60000,
  );

  private static get aiEnabled(): boolean {
    return process.env.ENABLE_AI_ENRICHMENT === 'true';
  }

  /**
   * Return model IDs that are backed by a live Exo instance.
   *
   * Exo's /v1/models endpoint is a hub catalog, not a list of running
   * instances. A one-token completion probe is therefore the authoritative
   * availability check. Preferred IDs are tested first, but every catalog
   * model can be selected when its instance is callable.
   */
  static async discoverCallableExoModels(preferredModels: string[] = []): Promise<string[]> {
    const now = Date.now();
    if (
      this.callableExoModels.length > 0 &&
      now - this.callableExoModelsCheckedAt < this.EXO_CALLABLE_CACHE_MS
    ) {
      return [...this.callableExoModels];
    }

    await throttleExoForUserActivity();

    const modelsResponse = await fetch(`${this.EXO_HOST}/v1/models`, {
      signal: AbortSignal.timeout(this.EXO_DISCOVERY_TIMEOUT_MS),
    });
    if (!modelsResponse.ok) {
      throw new Error(`Exo discovery failed: ${modelsResponse.status}`);
    }

    const payload = (await modelsResponse.json()) as {
      data?: Array<{ id?: string }>;
    };
    const catalog = (payload.data || [])
      .map((entry) => entry.id?.trim())
      .filter((id): id is string => Boolean(id));
    const catalogSet = new Set(catalog);
    const orderedCandidates = [
      ...preferredModels.filter((id) => catalogSet.has(id)),
      ...catalog,
    ].filter((id, index, all) => all.indexOf(id) === index);

    const callable = new Set<string>();
    let nextIndex = 0;
    const worker = async () => {
      while (nextIndex < orderedCandidates.length) {
        const model = orderedCandidates[nextIndex++];
        try {
          const response = await fetch(`${this.EXO_HOST}/v1/chat/completions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              model,
              messages: [{ role: 'user', content: 'Reply OK' }],
              max_tokens: 1,
              temperature: 0,
              enable_thinking: false,
            }),
            signal: AbortSignal.timeout(this.EXO_DISCOVERY_TIMEOUT_MS),
          });
          if (response.ok) {
            callable.add(model);
            this.exoUnavailableModels.delete(model);
          } else {
            const detail = await response.text();
            if (response.status === 404 && detail.includes('No instance found')) {
              this.exoUnavailableModels.add(model);
            }
          }
        } catch {
          // A failed probe does not make the complete Exo cluster unavailable.
        }
      }
    };

    await Promise.all(Array.from({ length: Math.min(6, orderedCandidates.length) }, worker));
    this.callableExoModels = orderedCandidates.filter((model) => callable.has(model));
    this.callableExoModelsCheckedAt = Date.now();
    logger.info({ models: this.callableExoModels }, '🤖 Discovered callable Exo model instances');
    return [...this.callableExoModels];
  }

  /**
   * Automatically discovers the active model on the Exo cluster
   */
  private static async autoDiscoverExoModel(): Promise<string> {
    if (this.discoveredExoModel) return this.discoveredExoModel;

    try {
      const preferred = [
        process.env.EXO_MODEL,
        ...String(process.env.EXO_MODEL_POOL || '').split(','),
      ].filter((model): model is string => Boolean(model?.trim()));
      const callable = await this.discoverCallableExoModels(preferred);
      if (callable.length > 0) {
        const selected =
          callable.find((model) => model.toLowerCase().includes('qwen3.5-2b')) ||
          callable.find((model) => model.toLowerCase().includes('qwen3-0.6b')) ||
          callable.find((model) => model.toLowerCase().includes('llama-3.2')) ||
          callable[0];
        this.discoveredExoModel = selected;
        logger.info(`🤖 Auto-discovered Exo model (Phase 1–3): ${this.discoveredExoModel}`);
        return selected;
      }
    } catch (err: unknown) {
      logger.warn({ err }, '⚠️ Failed to discover Exo model');
    }

    // Fall back to Qwen3.5-2B — 2.5GB, fits in any cluster, auto-downloaded by EXO on first use
    const fallback = 'mlx-community/Qwen3.5-2B-MLX-8bit';
    logger.warn(`⚠️ Using fallback Exo model: ${fallback}`);
    return fallback;
  }

  /**
   * Discovers the heavier model on the Exo cluster for graph extraction tasks.
   * Preference order: GRAPH_EXTRACTION_MODEL env var → any 14B model → fallback to standard model.
   */
  private static async autoDiscoverExoGraphModel(): Promise<string> {
    if (this.discoveredExoGraphModel) return this.discoveredExoGraphModel;

    try {
      const preferred = [
        process.env.GRAPH_EXTRACTION_MODEL,
        process.env.EXO_MODEL,
        ...String(process.env.EXO_MODEL_POOL || '').split(','),
      ].filter((model): model is string => Boolean(model?.trim()));
      const callable = await this.discoverCallableExoModels(preferred);
      const graphModel =
        callable.find((model) => model.toLowerCase().includes('qwen3.5-9b')) ||
        callable.find((model) => model.toLowerCase().includes('qwen3-vl-4b')) ||
        callable.find((model) => model.toLowerCase().includes('qwen3.5-2b')) ||
        callable[0];
      if (graphModel) {
        this.discoveredExoGraphModel = graphModel;
        logger.info(`🤖 Auto-discovered Exo graph extraction model: ${graphModel}`);
        return graphModel;
      }
    } catch (err: unknown) {
      logger.warn({ err }, '⚠️ Failed to discover Exo graph model — falling back to standard');
    }

    // No preferred graph model found in hub — fall back to whatever standard discovery picks.
    // Standard discovery also queries /v1/models, so if that also fails we get the hardcoded fallback.
    const standard = await this.autoDiscoverExoModel();
    logger.info(`🤖 Using standard model for graph extraction: ${standard}`);
    this.discoveredExoGraphModel = standard;
    return standard;
  }

  /**
   * Discovers the explicit vision-capable model on the Exo cluster.
   * Checks both model IDs (VL suffix) and explicit "vision" capability tag.
   */
  private static async autoDiscoverExoVisionModel(): Promise<string> {
    if (this.discoveredExoVisionModel) return this.discoveredExoVisionModel;

    try {
      const preferred = [
        process.env.VISION_MODEL,
        process.env.EXO_MODEL,
        ...String(process.env.EXO_MODEL_POOL || '').split(','),
      ].filter((model): model is string => Boolean(model?.trim()));
      const callable = await this.discoverCallableExoModels(preferred);
      const selected =
        callable.find((model) => model.toLowerCase().includes('-vl-')) || callable[0];
      if (selected) {
        this.discoveredExoVisionModel = selected;
        logger.info(`👁️ Auto-discovered Exo Vision model: ${selected}`);
        return selected;
      }
    } catch (err: unknown) {
      logger.warn({ err }, '⚠️ Failed to discover Exo vision model — falling back to standard');
    }

    // Fallback to whatever autoDiscover picks if we fail to find dedicated vision metadata
    return await this.autoDiscoverExoModel();
  }

  /**
   * Get the model name for the current provider
   */
  private static async getModelId(
    task: 'repair' | 'classify' | 'resolve' | 'summarize' | 'graph' | 'vision' = 'repair',
  ): Promise<string> {
    const provider = process.env.AI_PROVIDER || 'local_ollama';
    if (provider === 'exo_cluster') {
      if (task === 'vision') {
        return await this.autoDiscoverExoVisionModel();
      }
      // Graph extraction tasks get the heavier model (14B+) when available
      if (task === 'graph') {
        return await this.autoDiscoverExoGraphModel();
      }
      return await this.autoDiscoverExoModel();
    }
    // Ollama model selection by task
    switch (task) {
      case 'classify':
        return process.env.OLLAMA_CLASSIFY_MODEL || 'llama3.2:3b';
      case 'resolve':
      case 'summarize':
        return process.env.OLLAMA_RESOLVE_MODEL || 'mistral:7b';
      case 'graph':
        // Graph extraction needs a model that reliably produces structured JSON
        return process.env.OLLAMA_GRAPH_MODEL || process.env.OLLAMA_RESOLVE_MODEL || 'mistral:7b';
      default:
        return this.OLLAMA_MODEL;
    }
  }

  /**
   * Unified LLM call that works with both Ollama and Exo
   */
  private static async callLLM(
    prompt: string,
    options: {
      maxTokens?: number;
      temperature?: number;
      retryCount?: number;
      task?: 'repair' | 'classify' | 'resolve' | 'summarize' | 'graph' | 'vision';
      images?: Buffer[];
      modelId?: string;
    } = {},
  ): Promise<string> {
    const provider = process.env.AI_PROVIDER || 'local_ollama';
    const { maxTokens = 100, temperature = 0.1, retryCount = 2, task, images } = options;

    let attempt = 0;
    // Track how many different models we've tried to avoid an infinite model-switch loop
    let modelSwitches = 0;
    const MAX_MODEL_SWITCHES = 4;
    while (attempt <= retryCount) {
      try {
        const modelId = options.modelId || (await this.getModelId(task));
        if (provider === 'exo_cluster') {
          await throttleExoForUserActivity();
          // OpenAI-compatible API (Exo)
          const url = `${this.EXO_HOST}/v1/chat/completions`;
          logger.info(`[AIEnrichment] Calling Exo LLM: ${modelId} at ${url}`);

          // Construct user message content. Standard text, or multi-modal content array if images present.
          const messageContent =
            images && images.length > 0
              ? [
                  { type: 'text', text: prompt },
                  ...images.map((img) => ({
                    type: 'image_url',
                    image_url: { url: `data:image/png;base64,${img.toString('base64')}` },
                  })),
                ]
              : prompt;

          const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              model: modelId,
              messages: [{ role: 'user', content: messageContent }],
              max_tokens: maxTokens,
              temperature,
              // Disable Qwen3/thinking-model chain-of-thought so content is
              // returned directly rather than consumed by reasoning_content.
              enable_thinking: false,
            }),
            signal: AbortSignal.timeout(this.AI_REQUEST_TIMEOUT_MS),
          });

          if (!response.ok) {
            const errorText = await response.text();
            // Check for vision model errors
            if (
              errorText.includes('does not support image input') ||
              errorText.includes('Cannot read')
            ) {
              logger.warn(
                `⚠️ Exo model ${modelId} does not support image input - using text-only mode`,
              );
              return '';
            }
            // Model is in the hub catalog but not currently loaded/running.
            // Mark it unavailable and continue the loop WITHOUT consuming a retry attempt —
            // retries are for transient network errors, not for missing models.
            if (response.status === 404 && errorText.includes('No instance found')) {
              this.exoUnavailableModels.add(modelId);
              this.callableExoModels = this.callableExoModels.filter((model) => model !== modelId);
              this.callableExoModelsCheckedAt = 0;
              // Invalidate caches so we re-discover a DIFFERENT available model
              if (task === 'graph') {
                this.discoveredExoGraphModel = null;
              } else if (task === 'vision') {
                this.discoveredExoVisionModel = null;
              } else {
                this.discoveredExoModel = null;
              }
              if (options.modelId) {
                throw new ExoModelUnavailableError(
                  `Exo model ${modelId} has no callable instance.`,
                );
              }
              modelSwitches++;
              if (modelSwitches >= MAX_MODEL_SWITCHES) {
                const message = `No callable Exo model instance found after ${modelSwitches} attempts. The model catalog is reachable, but completion requests return 404.`;
                logger.error(`❌ ${message}`);
                throw new ExoModelUnavailableError(message);
              }
              logger.warn(
                `⚠️ Exo model ${modelId} not running (404). Switching model (${modelSwitches}/${MAX_MODEL_SWITCHES})...`,
              );
              continue; // Re-discover next attempt
            }
            throw new Error(`Exo cluster returned ${response.status}: ${errorText.slice(0, 200)}`);
          }

          interface ExoCompletionResponse {
            choices?: { message?: { content?: string; reasoning_content?: string } }[];
          }
          const data = (await response.json()) as ExoCompletionResponse;
          const msg = data.choices?.[0]?.message;
          // Qwen3 thinking models put output in reasoning_content when thinking
          // is not fully disabled — prefer content, fall back to reasoning_content.
          return msg?.content?.trim() || msg?.reasoning_content?.trim() || '';
        } else {
          // Ollama native API
          const response = await fetch(`${this.OLLAMA_HOST}/api/generate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              model: modelId,
              prompt,
              images:
                images && images.length > 0 ? images.map((i) => i.toString('base64')) : undefined,
              stream: false,
              options: { temperature, num_predict: maxTokens },
            }),
            signal: AbortSignal.timeout(this.AI_REQUEST_TIMEOUT_MS),
          });

          if (!response.ok) {
            const errorText = await response.text();
            // Check for vision model errors
            if (
              errorText.includes('does not support image input') ||
              errorText.includes('Cannot read')
            ) {
              logger.warn(
                `⚠️ Ollama model ${modelId} does not support image input - using text-only mode`,
              );
              return '';
            }
            throw new Error(`Ollama returned ${response.status}: ${errorText.slice(0, 200)}`);
          }

          interface OllamaGenerateResponse {
            response?: string;
          }
          const data = (await response.json()) as OllamaGenerateResponse;
          return data.response?.trim() || '';
        }
      } catch (e: unknown) {
        attempt++;
        const err = e as { message?: string; code?: string; cause?: { code?: string } };
        const isNetworkError =
          err.message?.includes('fetch failed') ||
          err.code === 'ECONNRESET' ||
          err.cause?.code === 'ECONNRESET';

        // Handle vision model errors gracefully - text-only models don't support images
        const isVisionError =
          err.message?.includes('does not support image input') ||
          (err.message?.includes('Cannot read') && err.message?.includes('image'));

        if (isVisionError) {
          logger.warn(
            { err: e },
            '⚠️ AI model does not support image input - falling back to text-only processing',
          );
          return '';
        }

        if (attempt > retryCount) {
          logger.error({ err: e }, `❌ AI Enrichment failed after ${retryCount + 1} attempts`);
          return '';
        }

        // Exponential backoff with jitter
        const baseDelay = isNetworkError ? 2000 : 500; // Longer wait for network errors
        const delay = Math.pow(2, attempt) * baseDelay + Math.random() * 500;

        if (isNetworkError) {
          logger.warn(
            `⚠️ Network error (Exo/Ollama), retrying in ${Math.round(delay)}ms... (Attempt ${attempt}/${retryCount})`,
          );
        }

        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
    return '';
  }

  /**
   * DECODE: Deterministic HTML entity and unicode normalisation.
   * Runs before any LLM step — no tokens wasted on &amp; or mojibake.
   */
  static decodeHtmlAndUnicode(text: string): string {
    if (!text) return text;

    const HTML_ENTITIES: Record<string, string> = {
      '&amp;': '&',
      '&lt;': '<',
      '&gt;': '>',
      '&quot;': '"',
      '&apos;': "'",
      '&nbsp;': ' ',
      '&ndash;': '\u2013',
      '&mdash;': '\u2014',
      '&lsquo;': '\u2018',
      '&rsquo;': '\u2019',
      '&ldquo;': '\u201C',
      '&rdquo;': '\u201D',
      '&hellip;': '\u2026',
      '&bull;': '\u2022',
      '&copy;': '\u00A9',
      '&reg;': '\u00AE',
      '&trade;': '\u2122',
      '&deg;': '\u00B0',
      '&cent;': '\u00A2',
      '&pound;': '\u00A3',
      '&euro;': '\u20AC',
      '&yen;': '\u00A5',
    };

    let r = text;
    for (const [ent, ch] of Object.entries(HTML_ENTITIES)) r = r.replaceAll(ent, ch);

    // Numeric HTML entities: &#160; &#xA0;
    r = r.replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)));
    r = r.replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(parseInt(d, 10)));

    // Common UTF-8 mojibake
    const MOJIBAKE: Record<string, string> = {
      'â€™': '\u2019',
      'â€˜': '\u2018',
      'â€œ': '\u201C',
      'â€': '\u201D',
      'â€”': '\u2014',
      'â€“': '\u2013',
      'â€¦': '\u2026',
      'Ã©': 'é',
      'Ã¨': 'è',
      'Ã ': 'à',
      'Ã¢': 'â',
      'Ã®': 'î',
      'Ã´': 'ô',
      'Ã»': 'û',
      'Ã§': 'ç',
      'Ã«': 'ë',
      'Ã¯': 'ï',
      'Ã¼': 'ü',
      'Ã¶': 'ö',
      'Ã¤': 'ä',
      'Ã±': 'ñ',
    };
    for (const [bad, good] of Object.entries(MOJIBAKE)) r = r.replaceAll(bad, good);

    // OCR ligature artifacts
    r = r
      .replace(/ﬁ/g, 'fi')
      .replace(/ﬂ/g, 'fl')
      .replace(/ﬀ/g, 'ff')
      .replace(/ﬃ/g, 'ffi')
      .replace(/ﬄ/g, 'ffl')
      .replace(/ﬅ/g, 'st');

    // Invisible / problematic unicode
    r = r
      .replace(/\u00A0/g, ' ')
      .replace(/\u200B/g, '')
      .replace(/\u00AD/g, '')
      .replace(/\uFEFF/g, '');

    return r;
  }

  /** Describe a source-verified photograph for visual search and review. */
  static async analyzeVerifiedPhotograph(imageBuffer: Buffer): Promise<string> {
    const isAiEnabled = AIEnrichmentService.aiEnabled;
    if (!isAiEnabled) return '';

    try {
      const prompt = `Describe this source-verified photograph for forensic visual search.
Return only these compact Markdown fields:
- Scene: people, objects, setting, activity, composition, and notable visual details.
- Visible text: only text that is clearly legible; otherwise "None legible".
- Search terms: 8-20 concrete, comma-separated visual terms.
Do not identify a person unless their identity is established by clearly visible text in the image. Do not infer motives, relationships, location, date, or criminal conduct. Distinguish direct observation from uncertainty.`;

      const result = await this.callLLM(prompt, {
        task: 'vision',
        images: [imageBuffer],
        maxTokens: 700,
        temperature: 0.1,
      });

      return result || '';
    } catch (e) {
      logger.warn({ err: e }, '⚠️ analyzeVerifiedPhotograph failed');
      return '';
    }
  }

  /**
   * CLEAN: AI-assisted OCR text normalisation.
   * Fixes line-break artifacts, joins mid-word hyphenation, strips page
   * headers/footers, and corrects obvious character confusions. Operates on
   * paragraph-sized chunks so context is preserved across sentences.
   */
  static async cleanOCRText(text: string, evidenceType?: string): Promise<string> {
    const isAiEnabled = AIEnrichmentService.aiEnabled;
    if (!isAiEnabled || !text || text.length < 100) return text;

    // Chunk at paragraph boundaries, cap at 5 chunks to keep latency reasonable
    const MAX_CHUNK = 1400;
    const MAX_CHUNKS = 5;
    const paragraphs = text.split(/\n{2,}/);
    const chunks: string[] = [];
    let current = '';
    for (const para of paragraphs) {
      if (current.length + para.length > MAX_CHUNK && current.length > 0) {
        chunks.push(current.trim());
        current = para;
      } else {
        current = current ? current + '\n\n' + para : para;
      }
    }
    if (current.trim()) chunks.push(current.trim());

    const toProcess = chunks.slice(0, MAX_CHUNKS);
    const cleaned = await Promise.all(toProcess.map((c) => this.cleanOCRChunk(c, evidenceType)));

    const remainder = chunks.slice(MAX_CHUNKS).join('\n\n');
    return [cleaned.join('\n\n'), remainder].filter(Boolean).join('\n\n');
  }

  private static async cleanOCRChunk(chunk: string, evidenceType?: string): Promise<string> {
    try {
      const docLabel = evidenceType || 'legal document';
      const prompt = `Task: Clean OCR-extracted text from a ${docLabel}. Fix hyphenated line-break splits (e.g. "con-\nfidential" → "confidential"), join sentences broken by hard line breaks, remove page numbers and headers that appear mid-text, and correct obvious OCR character confusions (0/O, 1/l/I, rn/m). Preserve all factual content and paragraph structure exactly.

Text:
${chunk}

Cleaned text (output ONLY the cleaned text, no explanation):`;

      const result = await this.callLLM(prompt, {
        maxTokens: Math.floor(chunk.length * 1.3),
        temperature: 0.05,
      });

      if (!result || result.length < chunk.length * 0.4 || result.length > chunk.length * 2.5)
        return chunk;
      return result;
    } catch {
      return chunk;
    }
  }

  /**
   * REPAIR: Contextual MIME Wildcard Reconstruction
   * HTML/unicode decode runs first as a free deterministic pre-pass.
   */
  static async repairMimeWildcards(text: string, context: string): Promise<string> {
    const isAiEnabled = AIEnrichmentService.aiEnabled;
    // Always run the deterministic decode regardless of AI flag
    const decoded = this.decodeHtmlAndUnicode(text);
    if (!isAiEnabled || !decoded.includes('=')) return decoded;

    const lines = text.split('\n');
    const repairedLines: string[] = new Array(lines.length);
    const batchTasks: { lines: string[]; indices: number[] }[] = [];
    let currentBatch: string[] = [];
    let currentIndices: number[] = [];

    // Identify corrupted lines and group into batches
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line.includes('=') && line.length > 3 && line.length < 2000) {
        currentBatch.push(line);
        currentIndices.push(i);
      } else {
        repairedLines[i] = line;
      }

      if (currentBatch.length >= 10) {
        batchTasks.push({ lines: currentBatch, indices: currentIndices });
        currentBatch = [];
        currentIndices = [];
      }
    }
    if (currentBatch.length > 0) {
      batchTasks.push({ lines: currentBatch, indices: currentIndices });
    }

    // Process batches in parallel chunks of 8 (better cluster utilization)
    for (let i = 0; i < batchTasks.length; i += 8) {
      const chunk = batchTasks.slice(i, i + 8);
      const results = await Promise.all(
        chunk.map((task) => this.callRepairBatch(task.lines, context)),
      );

      // Map results back to original indices
      chunk.forEach((task, chunkIdx) => {
        task.indices.forEach((originalIndex, lineIdx) => {
          repairedLines[originalIndex] = results[chunkIdx][lineIdx];
        });
      });
    }

    return repairedLines.join('\n');
  }

  private static async callRepairBatch(lines: string[], context: string): Promise<string[]> {
    try {
      const target = lines.join('\n[LINE_BREAK]\n');
      const prompt = `Task: Repair the corrupted lines in the [TARGET] block where '=' is a missing character.
Context: "${context}"
Target:
${target}

Output the repaired lines, preserving the [LINE_BREAK] markers between them. Output ONLY the repaired text.`;

      const result = await this.callLLM(prompt, {
        maxTokens: Math.floor(target.length * 1.5),
        temperature: 0.1,
      });

      if (!result) return lines;

      const results = result.split('[LINE_BREAK]').map((l: string) => l.trim());

      // If the LLM failed to return the same number of lines, fallback to individual repair
      if (results.length !== lines.length) {
        const fallback = [];
        for (const line of lines) {
          fallback.push(await this.callRepairSingle(line, context));
        }
        return fallback;
      }

      return results;
    } catch (_error) {
      return lines;
    }
  }

  private static async callRepairSingle(text: string, context: string): Promise<string> {
    try {
      const prompt = `Task: Repair the corrupted text in the [TARGET] segment where '=' is a missing character.
Context: "${context}"
Target: "${text}"
Output ONLY the repaired text. No quotes.`;

      const result = await this.callLLM(prompt, { maxTokens: 100, temperature: 0.1 });
      if (!result) return text;

      // Basic sanity check to prevent LLM bloat
      if (result.length < text.length * 1.5) {
        return result;
      }
      return text;
    } catch (_error) {
      return text;
    }
  }

  /**
   * CLASSIFY: Semantic Redaction Inference
   * Uses narrative context to categorize redactions.
   * Model: llama3.2:3b (better reasoning for classification)
   */
  /**
   * CLASSIFY: Semantic Redaction Inference
   */
  static async classifyRedaction(
    preContext: string,
    postContext: string,
  ): Promise<EnrichmentOutput['inferences']> {
    const isAiEnabled = AIEnrichmentService.aiEnabled;
    if (!isAiEnabled) return [];

    try {
      const prompt = `### INSTRUCTION
Infer the type of the [REDACTED] entity based on the surrounding context.

[BEFORE]: "${preContext.slice(-200)}"
[REDACTED]
[AFTER]: "${postContext.slice(0, 200)}"

### OUTPUT RULES
- Output ONLY a one-word category followed by a colon and confidence score
- Categories: PERSON, ORGANIZATION, LOCATION, DATE, FINANCIAL, LEGAL, OTHER
- Confidence must be between 0.0 and 1.0
- Example output: PERSON: 0.92

### OUTPUT`;

      const result = await this.callLLM(prompt, { maxTokens: 20, temperature: 0.1 });
      if (!result) return [];

      // Parse the structured output: "PERSON: 0.92"
      const match = result.match(
        /^(PERSON|ORGANIZATION|LOCATION|DATE|FINANCIAL|LEGAL|OTHER):\s*([\d.]+)/i,
      );
      if (match) {
        const category = match[1].toUpperCase();
        const confidence = Math.min(1.0, Math.max(0.0, parseFloat(match[2])));
        return [
          {
            type: category,
            description: `Inferred ${category.toLowerCase()} from surrounding context`,
            confidence,
          },
        ];
      }

      return [];
    } catch (_e) {
      // Keep enrichment best-effort, but don't fail silently (debug to avoid noise).
      logger.debug({ err: _e }, '[AIEnrichment] inferEntityType failed; returning []');
      return [];
    }
  }

  /**
   * RESOLVE: Semantic Entity Disambiguation
   */
  static async resolveIdentity(
    mention: string,
    documentContext: string,
    knownEntities: { id: number; name: string }[] = [],
  ): Promise<{ entityId: number | null; confidence: number; canonicalName: string | null }> {
    const isAiEnabled = AIEnrichmentService.aiEnabled;
    if (!isAiEnabled || knownEntities.length === 0) {
      return { entityId: null, confidence: 0, canonicalName: null };
    }

    try {
      const entityList = knownEntities
        .slice(0, 50)
        .map((e) => e.name)
        .join(', ');
      const prompt = `### INSTRUCTION
You are an entity disambiguation expert. Given a mention and document context, identify which known entity it refers to.

### MENTION
"${mention}"

### DOCUMENT CONTEXT
"${documentContext.slice(0, 500)}"

### KNOWN ENTITIES
${entityList}

### OUTPUT RULES
- If the mention matches a known entity, output: MATCH: [exact entity name]: [confidence 0.0-1.0]
- If no match is found, output: NO_MATCH
- Example: MATCH: Jeffrey Epstein: 0.95

### OUTPUT`;

      const result = await this.callLLM(prompt, { maxTokens: 50, temperature: 0.1 });
      if (!result) return { entityId: null, confidence: 0, canonicalName: null };

      // Parse: "MATCH: Jeffrey Epstein: 0.95"
      const match = result.match(/^MATCH:\s*(.+?):\s*([\d.]+)/i);
      if (match) {
        const matchedName = match[1].trim();
        const confidence = Math.min(1.0, Math.max(0.0, parseFloat(match[2])));
        const entity = knownEntities.find(
          (e) => e.name.toLowerCase() === matchedName.toLowerCase(),
        );
        if (entity) {
          return { entityId: entity.id, confidence, canonicalName: entity.name };
        }
      }

      return { entityId: null, confidence: 0, canonicalName: null };
    } catch (_e) {
      return { entityId: null, confidence: 0, canonicalName: null };
    }
  }

  /**
   * EXTRACT: Relationship Mining
   */
  static async extractRelationships(
    paragraph: string,
    entityNames: string[],
  ): Promise<{ source: string; target: string; relationship: string; confidence: number }[]> {
    const isAiEnabled = AIEnrichmentService.aiEnabled;
    if (!isAiEnabled || entityNames.length < 2) return [];

    try {
      const prompt = `### INSTRUCTION
Extract relationships between the named entities in this paragraph.

### PARAGRAPH
"${paragraph.slice(0, 1000)}"

### ENTITIES TO FIND
${entityNames.join(', ')}

### OUTPUT RULES
- Output one relationship per line in format: [ENTITY_A] -[RELATIONSHIP]-> [ENTITY_B]: [confidence]
- Relationship types: ASSOCIATE, EMPLOYER, EMPLOYEE, ATTORNEY, CLIENT, FRIEND, RELATIVE, WITNESS, VICTIM, OTHER
- Only output relationships you are confident about (>0.6)
- If no relationships found, output: NONE

### OUTPUT`;

      const result = await this.callLLM(prompt, {
        maxTokens: 200,
        temperature: 0.1,
        task: 'graph',
      });
      if (!result || result === 'NONE') return [];

      // Parse: "[Entity A] -[RELATIONSHIP]-> [Entity B]: 0.85"
      const relationships: {
        source: string;
        target: string;
        relationship: string;
        confidence: number;
      }[] = [];
      const lines = result.split('\n');

      for (const line of lines) {
        const match = line.match(/^\[?(.+?)\]?\s*-\[?(\w+)\]?->\s*\[?(.+?)\]?:\s*([\d.]+)/);
        if (match) {
          relationships.push({
            source: match[1].trim(),
            target: match[3].trim(),
            relationship: match[2].toUpperCase(),
            confidence: Math.min(1.0, Math.max(0.0, parseFloat(match[4]))),
          });
        }
      }

      return relationships;
    } catch (_e) {
      // Keep enrichment best-effort, but don't fail silently (debug to avoid noise).
      logger.debug({ err: _e }, '[AIEnrichment] extractRelationships failed; returning []');
      return [];
    }
  }

  /**
   * SUMMARIZE: Forensic Document Summary
   */
  static async summarizeDocument(
    content: string,
    metadata: { fileName?: string; subject?: string; modelId?: string },
  ): Promise<string | null> {
    const isAiEnabled = AIEnrichmentService.aiEnabled;
    if (!isAiEnabled || !content || content.length < 100) return null;

    try {
      const prompt = `### INSTRUCTION
Summarize this document in 2-3 sentences, focusing on forensic significance (names, dates, financial details, locations, or legal implications).

### DOCUMENT
Title: ${metadata.subject || metadata.fileName || 'Unknown'}
Content: "${content.slice(0, 2000)}"

### OUTPUT RULES
- Be concise (2-3 sentences max)
- Focus on WHO, WHAT, WHEN, WHERE
- Highlight any red flags or unusual details

### SUMMARY`;

      const result = await this.callLLM(prompt, {
        maxTokens: 150,
        temperature: 0.1,
        task: 'summarize',
        modelId: metadata.modelId,
      });

      // Basic sanity check
      if (result && result.length > 20 && result.length < 1000) {
        return result;
      }

      return null;
    } catch (_e) {
      logger.warn({ err: _e }, '⚠️ AI Summarization failed - returning null');
      return null;
    }
  }

  /**
   * EXTRACT: Timeline Events from a document
   */
  static async extractTimelineEvents(
    content: string,
    fileName: string,
  ): Promise<
    {
      title: string;
      date: string;
      description: string;
      type: string;
      significance: string;
      entities: string;
    }[]
  > {
    const isAiEnabled = AIEnrichmentService.aiEnabled;
    if (!isAiEnabled || !content || content.length < 100) return [];

    try {
      const prompt = `### INSTRUCTION
Extract dated events from this document. Only include events with a specific or approximate date.

### DOCUMENT
File: ${fileName}
Content: "${content.slice(0, 2500)}"

### OUTPUT FORMAT
Return a compact JSON array (no markdown, no explanation). Each object:
{"title":"short event title","date":"YYYY-MM-DD","description":"1-2 sentence description","type":"LEGAL|FINANCIAL|POLITICAL|TRAVEL|MEETING|COMMUNICATION|OTHER","significance":"HIGH|MEDIUM|LOW","entities":"comma-separated person/org names"}
Return [] if no clearly dated events found.

### OUTPUT`;

      const result = await this.callLLM(prompt, {
        maxTokens: 600,
        temperature: 0.1,
        task: 'graph',
      });
      if (!result || result.trim() === '[]') return [];
      const match = result.match(/\[[\s\S]*\]/);
      if (!match) return [];
      const parsed = JSON.parse(match[0]);
      if (!Array.isArray(parsed)) return [];
      return parsed.filter(
        (e: unknown) =>
          e &&
          typeof e === 'object' &&
          typeof (e as Record<string, unknown>).title === 'string' &&
          typeof (e as Record<string, unknown>).date === 'string',
      );
    } catch {
      return [];
    }
  }

  /**
   * EXTRACT: Financial Transactions from a document
   */
  static async extractFinancialTransactions(
    content: string,
    entityNames: string[],
  ): Promise<
    {
      from_entity: string;
      to_entity: string;
      amount: number;
      currency: string;
      date: string;
      transaction_type: string;
      method: string;
      risk_level: string;
      description: string;
    }[]
  > {
    const isAiEnabled = AIEnrichmentService.aiEnabled;
    if (!isAiEnabled || !content || content.length < 100) return [];

    try {
      const entityHint =
        entityNames.length > 0 ? `Known entities: ${entityNames.slice(0, 20).join(', ')}` : '';
      const prompt = `### INSTRUCTION
Extract financial transactions mentioned in this document.
${entityHint}

### DOCUMENT
"${content.slice(0, 2500)}"

### OUTPUT FORMAT
Return a compact JSON array (no markdown). Each object:
{"from_entity":"name","to_entity":"name","amount":0.00,"currency":"USD","date":"YYYY-MM-DD","transaction_type":"PAYMENT|TRANSFER|GIFT|LOAN|INVESTMENT|SALARY|EXPENSE|OTHER","method":"CASH|WIRE|CHECK|CRYPTO|UNKNOWN","risk_level":"HIGH|MEDIUM|LOW","description":"brief description"}
Return [] if no financial transactions found.

### OUTPUT`;

      const result = await this.callLLM(prompt, {
        maxTokens: 600,
        temperature: 0.1,
        task: 'graph',
      });
      if (!result || result.trim() === '[]') return [];
      const match = result.match(/\[[\s\S]*\]/);
      if (!match) return [];
      const parsed = JSON.parse(match[0]);
      if (!Array.isArray(parsed)) return [];
      return parsed.filter(
        (e: unknown) =>
          e &&
          typeof e === 'object' &&
          typeof (e as Record<string, unknown>).from_entity === 'string' &&
          typeof (e as Record<string, unknown>).to_entity === 'string',
      );
    } catch {
      return [];
    }
  }

  private static buildFocusedExcerpt(content: string, keywords: string[], maxChars = 2600): string {
    const normalized = content.replace(/\s+/g, ' ').trim();
    if (normalized.length <= maxChars) return normalized;

    const lower = normalized.toLowerCase();
    const windows: string[] = [normalized.slice(0, 700)];
    const seen = new Set<number>([0]);

    for (const keyword of keywords) {
      const idx = lower.indexOf(keyword.toLowerCase());
      if (idx < 0) continue;
      const start = Math.max(0, idx - 260);
      const bucket = Math.floor(start / 200);
      if (seen.has(bucket)) continue;
      seen.add(bucket);
      windows.push(normalized.slice(start, Math.min(normalized.length, start + 760)));
      if (windows.join('\n\n').length >= maxChars) break;
    }

    return windows.join('\n\n').slice(0, maxChars);
  }

  static buildClaimExcerptForRetry(content: string, entityNames: string[]): string {
    return this.buildClaimExcerpt(content, entityNames);
  }

  private static buildClaimExcerpt(
    content: string,
    entityNames: string[],
    maxChars = 2400,
  ): string {
    const normalized = content.replace(/\s+/g, ' ').trim();
    const keywords = [
      'alleges',
      'alleged',
      'plaintiff',
      'defendant',
      'testified',
      'stated',
      'paid',
      'transferred',
      'met',
      'traveled',
      'owned',
      'claims',
      'represents',
      'confirmed',
      'denied',
    ];
    const entities = entityNames.map((name) => name.toLowerCase()).filter(Boolean);
    const sentences = normalized.split(/(?<=[.!?;:])\s+/);
    const scored = sentences
      .map((sentence, index) => {
        const lower = sentence.toLowerCase();
        const entityHits = entities.filter((entity) => lower.includes(entity)).length;
        const keywordHits = keywords.filter((keyword) => lower.includes(keyword)).length;
        const mostlyUpper =
          sentence.length > 80 &&
          sentence.replace(/[^A-Za-z]/g, '').length > 0 &&
          sentence.replace(/[^A-Z]/g, '').length / sentence.replace(/[^A-Za-z]/g, '').length > 0.75;
        return {
          sentence,
          index,
          score: entityHits * 3 + keywordHits - (mostlyUpper ? 4 : 0),
        };
      })
      .filter(({ sentence, score }) => score > 0 && sentence.length >= 35 && sentence.length <= 700)
      .sort((a, b) => b.score - a.score || a.index - b.index)
      .slice(0, 8)
      .sort((a, b) => a.index - b.index)
      .map(({ sentence }) => sentence);

    const excerpt = scored.join(' ');
    if (excerpt.length >= 100) return excerpt.slice(0, maxChars);

    return this.buildFocusedExcerpt(content, keywords, maxChars);
  }

  private static fallbackClaimTriples(
    excerpt: string,
    entityNames: string[],
  ): {
    subject: string;
    predicate: string;
    object: string;
    confidence: number;
    modality: string;
  }[] {
    const entities = entityNames.filter(Boolean);
    if (entities.length === 0) return [];

    const sentences = excerpt
      .split(/(?<=[.!?;:])\s+/)
      .map((sentence) => sentence.trim())
      .filter((sentence) => sentence.length >= 40 && sentence.length <= 500);

    const triples: {
      subject: string;
      predicate: string;
      object: string;
      confidence: number;
      modality: string;
    }[] = [];

    for (const sentence of sentences) {
      const lower = sentence.toLowerCase();
      const subject = entities.find((entity) => lower.includes(entity.toLowerCase()));
      if (!subject) continue;
      triples.push({
        subject,
        predicate: /alleg|claim|complaint|plaintiff|defendant/i.test(sentence)
          ? 'is referenced in allegation'
          : 'is referenced in statement',
        object: sentence.slice(0, 450),
        confidence: 0.65,
        modality: /alleg|claim|complaint/i.test(sentence) ? 'ALLEGED' : 'ASSERTED',
      });
      if (triples.length >= 5) break;
    }

    return triples;
  }

  /**
   * EXTRACT: Claim Triples (subject-predicate-object) from a document
   */
  static async extractClaimTriples(
    content: string,
    entityNames: string[],
  ): Promise<
    {
      subject: string;
      predicate: string;
      object: string;
      confidence: number;
      modality: string;
    }[]
  > {
    const isAiEnabled = AIEnrichmentService.aiEnabled;
    if (!isAiEnabled || !content || content.length < 100) return [];

    try {
      const excerpt = this.buildClaimExcerpt(content, entityNames);
      const entityHint =
        entityNames.length > 0 ? `Known entities: ${entityNames.slice(0, 20).join(', ')}` : '';
      const prompt = `Extract subject-predicate-object triples from this text as JSON array: ${excerpt}
${entityHint}
Return JSON only with subject,predicate,object,confidence,modality. Use ALLEGED for disputed allegations and ASSERTED for ordinary statements.`;

      const result = await this.callLLM(prompt, {
        maxTokens: 600,
        temperature: 0.1,
        task: 'graph',
      });
      if (!result || result.trim() === '[]') return this.fallbackClaimTriples(excerpt, entityNames);
      const match = result.match(/\[[\s\S]*\]/);
      if (!match) return this.fallbackClaimTriples(excerpt, entityNames);
      const parsed = JSON.parse(match[0]);
      if (!Array.isArray(parsed)) return this.fallbackClaimTriples(excerpt, entityNames);
      const triples = parsed.filter(
        (e: unknown) =>
          e &&
          typeof e === 'object' &&
          typeof (e as Record<string, unknown>).subject === 'string' &&
          typeof (e as Record<string, unknown>).predicate === 'string' &&
          typeof (e as Record<string, unknown>).object === 'string',
      );
      return triples.length > 0 ? triples : this.fallbackClaimTriples(excerpt, entityNames);
    } catch {
      return this.fallbackClaimTriples(content.slice(0, 2000), entityNames);
    }
  }

  /**
   * CLEAN: Black Book Entry Normalization
   */
  static async cleanBlackBookEntry(entryText: string): Promise<{
    name: string;
    phones: string[];
    emails: string[];
    addresses: string[];
    notes: string;
  } | null> {
    const isAiEnabled = AIEnrichmentService.aiEnabled;
    if (!isAiEnabled || !entryText || entryText.length < 5) return null;

    try {
      const prompt = `### INSTRUCTION
Normalize this "Black Book" contact entry. Fix OCR errors, extract structured fields, and separate notes.

### ENTRY TEXT
"${entryText.replace(/"/g, "'")}"

### OUTPUT FORMAT (JSON ONLY)
{
  "name": "Canonical Full Name",
  "phones": ["+1-XXX-XXX-XXXX"],
  "emails": ["example@domain.com"],
  "addresses": ["Full Address"],
  "notes": "Any extra context (titles, assistant names, etc.)"
}

### OUTPUT`;

      const result = await this.callLLM(prompt, { maxTokens: 300, temperature: 0.1 });

      // Attempt to parse JSON
      const jsonMatch = result.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      return null;
    } catch (_e) {
      return null;
    }
  }
}
