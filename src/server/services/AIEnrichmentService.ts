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

export class AIEnrichmentService {
  // Ollama (single-machine) configuration
  private static OLLAMA_HOST = process.env.OLLAMA_HOST || 'http://localhost:11434';
  private static OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'llama3.2:1b';

  // Exo (distributed cluster) configuration
  private static EXO_HOST = process.env.EXO_HOST || 'http://127.0.0.1:52415';
  private static discoveredExoModel: string | null = process.env.EXO_MODEL || null;
  private static EXO_DISCOVERY_TIMEOUT_MS = Math.max(
    1000,
    parseInt(process.env.EXO_DISCOVERY_TIMEOUT_MS || '8000', 10) || 8000,
  );
  private static AI_REQUEST_TIMEOUT_MS = Math.max(
    1000,
    parseInt(process.env.AI_REQUEST_TIMEOUT_MS || '120000', 10) || 120000,
  );

  /**
   * Automatically discovers the active model on the Exo cluster
   */
  private static async autoDiscoverExoModel(): Promise<string> {
    // 1. If explicitly set via env var, use it (highest priority)
    if (process.env.EXO_MODEL) {
      logger.info(`🤖 Using EXO_MODEL from environment: ${process.env.EXO_MODEL}`);
      return process.env.EXO_MODEL;
    }

    // 2. If already discovered, use cached
    if (this.discoveredExoModel) return this.discoveredExoModel;

    try {
      logger.info(`🔍 Attempting Exo model discovery via: ${this.EXO_HOST}/v1/models`);
      const response = await fetch(`${this.EXO_HOST}/v1/models`, {
        signal: AbortSignal.timeout(this.EXO_DISCOVERY_TIMEOUT_MS),
      });
      if (!response.ok) throw new Error(`Exo discovery failed: ${response.status}`);

      interface ExoModel {
        id: string;
      }
      interface ExoModelsResponse {
        data?: ExoModel[];
      }

      const data = (await response.json()) as ExoModelsResponse;
      if (data.data && data.data.length > 0) {
        // Log available models for debugging
        const availableModels = data.data.map((m) => m.id).join(', ');
        logger.info(`📋 Available Exo models: ${availableModels}`);

        // 1. Try to find the specific active instance ID from the screenshot first
        const activeInstance = data.data.find((m) => m.id === '306A62B7');

        // 2. Try to find a Qwen/Gwen model (Speed focus)
        const gwen = data.data.find(
          (m) =>
            (m.id.toLowerCase().includes('qwen') || m.id.toLowerCase().includes('gwen')) &&
            (m.id.includes('0.6B') || m.id.toLowerCase().includes('instruct')),
        );

        // 3. Fallback to any Instruct model
        const anyInstruct = data.data.find((m) => m.id.toLowerCase().includes('instruct'));

        // 4. Fallback to first available
        const selected = activeInstance || gwen || anyInstruct || data.data[0];

        this.discoveredExoModel = selected.id;
        logger.info(`🤖 Auto-discovered Exo model: ${this.discoveredExoModel}`);
        return this.discoveredExoModel!;
      }
    } catch (err: unknown) {
      logger.warn({ err }, '⚠️ Failed to discover Exo model');
    }

    const fallback = '306A62B7'; // Confirmed active instance ID
    logger.warn(`⚠️ Using fallback Exo model: ${fallback}`);
    return fallback;
  }

  /**
   * Get the model name for the current provider
   */
  private static async getModelId(
    task: 'repair' | 'classify' | 'resolve' | 'summarize' = 'repair',
  ): Promise<string> {
    const provider = process.env.AI_PROVIDER || 'local_ollama';
    if (provider === 'exo_cluster') {
      return await this.autoDiscoverExoModel();
    }
    // Ollama model selection by task
    switch (task) {
      case 'classify':
        return process.env.OLLAMA_CLASSIFY_MODEL || 'llama3.2:3b';
      case 'resolve':
      case 'summarize':
        return process.env.OLLAMA_RESOLVE_MODEL || 'mistral:7b';
      default:
        return this.OLLAMA_MODEL;
    }
  }

  /**
   * Unified LLM call that works with both Ollama and Exo
   */
  private static async callLLM(
    prompt: string,
    options: { maxTokens?: number; temperature?: number; retryCount?: number } = {},
  ): Promise<string> {
    const provider = process.env.AI_PROVIDER || 'local_ollama';
    const { maxTokens = 100, temperature = 0.1, retryCount = 2 } = options;

    let attempt = 0;
    while (attempt <= retryCount) {
      try {
        const modelId = await this.getModelId();
        if (provider === 'exo_cluster') {
          // OpenAI-compatible API (Exo)
          const url = `${this.EXO_HOST}/v1/chat/completions`;
          logger.info(`[AIEnrichment] Calling Exo LLM: ${modelId} at ${url}`);

          // Use a custom agent with keepAlive to potentially reduce connection overhead,
          const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              model: modelId,
              messages: [{ role: 'user', content: prompt }],
              max_tokens: maxTokens,
              temperature,
              // Disable Qwen3/thinking-model chain-of-thought so content is
              // returned directly rather than consumed by reasoning_content.
              enable_thinking: false,
            }),
            signal: AbortSignal.timeout(this.AI_REQUEST_TIMEOUT_MS),
          });

          if (!response.ok) {
            throw new Error(`Exo cluster returned ${response.status}`);
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
              stream: false,
              options: { temperature, num_predict: maxTokens },
            }),
            signal: AbortSignal.timeout(this.AI_REQUEST_TIMEOUT_MS),
          });

          if (!response.ok) {
            throw new Error(`Ollama returned ${response.status}`);
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

  /**
   * CLEAN: AI-assisted OCR text normalisation.
   * Fixes line-break artifacts, joins mid-word hyphenation, strips page
   * headers/footers, and corrects obvious character confusions. Operates on
   * paragraph-sized chunks so context is preserved across sentences.
   */
  static async cleanOCRText(text: string, evidenceType?: string): Promise<string> {
    const isAiEnabled = process.env.ENABLE_AI_ENRICHMENT === 'true';
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
    const isAiEnabled = process.env.ENABLE_AI_ENRICHMENT === 'true';
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
    const isAiEnabled = process.env.ENABLE_AI_ENRICHMENT === 'true';
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
    const isAiEnabled = process.env.ENABLE_AI_ENRICHMENT === 'true';
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
    const isAiEnabled = process.env.ENABLE_AI_ENRICHMENT === 'true';
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

      const result = await this.callLLM(prompt, { maxTokens: 200, temperature: 0.1 });
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
      return [];
    }
  }

  /**
   * SUMMARIZE: Forensic Document Summary
   */
  static async summarizeDocument(
    content: string,
    metadata: { fileName?: string; subject?: string },
  ): Promise<string | null> {
    const isAiEnabled = process.env.ENABLE_AI_ENRICHMENT === 'true';
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

      const result = await this.callLLM(prompt, { maxTokens: 150, temperature: 0.3 });

      // Basic sanity check
      if (result && result.length > 20 && result.length < 1000) {
        return result;
      }

      return null;
    } catch (_e) {
      return null;
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
    const isAiEnabled = process.env.ENABLE_AI_ENRICHMENT === 'true';
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
