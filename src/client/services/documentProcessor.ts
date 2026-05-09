import {
  Document,
  DocumentMetadata,
  Entity,
  Passage,
  DocumentCollection,
  BrowseFilters,
  TechnicalMetadata,
  StructureMetadata,
  LinguisticMetadata,
  TemporalMetadata,
  NetworkMetadata,
} from '@client/types/documents';
import { EntityNameService } from './EntityNameService';

export class DocumentProcessor {
  private documents: Map<string, Document> = new Map();
  private entities: Map<string, Entity> = new Map();
  private passages: Map<string, Passage[]> = new Map();
  private searchIndex: Map<string, Set<string>> = new Map();
  private invertedIndex: Map<string, Set<string>> = new Map();
  private entityIndex: Map<string, Set<string>> = new Map();
  private dateIndex: Map<string, Set<string>> = new Map();
  private categoryIndex: Map<string, Set<string>> = new Map();

  // Performance optimizations

  private searchCache: Map<string, Document[]> = new Map();
  private lastSearchTime: number = 0;
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes
  private readonly MAX_CACHE_SIZE = 100;

  // Keywords for red flag rating calculation
  private readonly RED_FLAG_KEYWORDS = {
    criminal: 5,
    indictment: 5,
    charges: 5,
    arrest: 5,
    conviction: 5,
    sex: 4,
    minor: 4,
    underage: 4,
    rape: 4,
    assault: 4,
    flight: 3,
    'private jet': 3,
    island: 3,
    lolita: 3,
    massage: 3,
    trump: 2,
    clinton: 2,
    president: 2,
    prince: 2,
    senator: 2,
    epstein: 1,
    maxwell: 1,
    ghislaine: 1,
  };

  // Entity extraction patterns
  private readonly ENTITY_PATTERNS = {
    person: /\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,3})\b/g, // More flexible person name pattern
    email: /\b([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})\b/g,
    phone: /\b(?:\+?1[-.\s]?)?\(?([0-9]{3})\)?[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})\b/g,
    date: /\b(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+\d{4}\b/g,
    amount: /\$[0-9,]+(?:\.[0-9]{2})?/g,
    location:
      /\b(?:New York|Los Angeles|Chicago|Miami|Palm Beach|Little St James|Epstein Island|Russia|CIA|FBI|Mossad)\b/g,
  };

  async processDocument(filePath: string, content: string): Promise<Document> {
    const id = this.generateDocumentId(filePath);
    const metadata = this.extractMetadata(filePath, content);
    const entities = this.extractEntities(content, filePath);
    const passages = this.extractPassages(content, filePath);
    const redFlagScore = this.calculateRedFlagScore(content);
    const redFlagRating = this.calculateRedFlagRating(redFlagScore);

    // Forensic Analysis
    const technical = this.extractTechnicalMetadata(content);
    const structure = this.analyzePDFStructure(content);
    const linguistics = this.analyzeLinguistics(content);
    const temporal = this.analyzeTemporalPatterns(metadata, technical);
    const network = this.calculateNetworkMetrics(entities, content);

    // Merge forensic metadata
    metadata.technical = technical;
    metadata.structure = structure;
    metadata.linguistics = linguistics;
    metadata.temporal = temporal;
    metadata.network = network;

    const document: Document = {
      id,
      filename: filePath.split('/').pop() || filePath,
      title: this.extractTitle(content, filePath),
      content,
      fileType: this.detectFileType(filePath),
      fileSize: content.length,
      metadata,
      entities,
      passages,
      redFlagScore,
      redFlagRating: redFlagRating.rating,
      redFlagPeppers: redFlagRating.peppers,
      redFlagDescription: redFlagRating.description,
    };

    this.documents.set(id, document);
    // console.log(`DocumentProcessor: Added document ${id}, total documents: ${this.documents.size}`);
    this.buildSearchIndex(document);
    this.buildInvertedIndex(document);
    this.buildEntityIndex(document);
    this.buildDateIndex(document);
    this.buildCategoryIndex(document);
    this.updateEntityIndex(entities);
    this.passages.set(id, passages);

    return document;
  }

  async processDocumentBatch(
    fileContents: Array<{ path: string; content: string }>,
    batchSize: number = 100,
  ): Promise<Document[]> {
    const documents: Document[] = [];

    // Process in batches to avoid memory issues with large datasets
    for (let i = 0; i < fileContents.length; i += batchSize) {
      const batch = fileContents.slice(i, i + batchSize);
      const batchPromises = batch.map((file) => this.processDocument(file.path, file.content));

      try {
        const batchResults = await Promise.all(batchPromises);
        documents.push(...batchResults);

        // Log progress for large batches
        if (fileContents.length > 1000) {
          console.log(
            `Processed batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(fileContents.length / batchSize)} - ${documents.length} documents total`,
          );
        }
      } catch (error) {
        console.error(`Error processing batch starting at index ${i}:`, error);
        // Continue processing remaining batches
      }
    }

    return documents;
  }

  private generateDocumentId(filePath: string): string {
    // Create a simple hash of the file path
    let hash = 0;
    for (let i = 0; i < filePath.length; i++) {
      const char = filePath.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return (
      Math.abs(hash).toString(36) +
        '_' +
        filePath
          .split('/')
          .pop()
          ?.replace(/[^a-zA-Z0-9]/g, '')
          .substring(0, 10) || 'doc'
    );
  }

  private extractTitle(content: string, filePath: string): string {
    // Try to extract title from content first
    const titleMatch = content.match(/^(Subject:|Title:|Re:)[\s]*(.+)$/im);
    if (titleMatch) {
      return titleMatch[2].trim();
    }

    // Fallback to filename
    const filename = filePath.split('/').pop() || filePath;
    return filename.replace(/\.[^/.]+$/, '').replace(/_/g, ' ');
  }

  private detectFileType(filePath: string): 'email' | 'pdf' | 'txt' | 'doc' | 'image' | 'other' {
    const ext = filePath.split('.').pop()?.toLowerCase();

    if (filePath.includes('email') || ext === 'eml' || ext === 'msg') return 'email';
    if (ext === 'pdf') return 'pdf';
    if (ext === 'txt' || ext === 'text') return 'txt';
    if (ext === 'doc' || ext === 'docx') return 'doc';
    if (['jpg', 'jpeg', 'png', 'gif', 'bmp'].includes(ext || '')) return 'image';

    return 'other';
  }

  private extractMetadata(filePath: string, content: string): DocumentMetadata {
    const metadata: DocumentMetadata = {
      tags: [],
      categories: [],
      confidentiality: 'public',
      source: this.detectSource(filePath),
    };

    // Extract email-specific metadata
    if (this.detectFileType(filePath) === 'email') {
      const subjectMatch = content.match(/^Subject:[\s]*(.+)$/im);
      const fromMatch = content.match(/^From:[\s]*(.+)$/im);
      const toMatch = content.match(/^To:[\s]*(.+)$/im);
      const dateMatch = content.match(/^Date:[\s]*(.+)$/im);

      if (subjectMatch) metadata.subject = subjectMatch[1].trim();
      if (fromMatch) metadata.author = fromMatch[1].trim();
      if (toMatch) metadata.recipient = toMatch[1].trim();
      if (dateMatch) metadata.testimonyDate = dateMatch[1].trim();
    }

    // Extract flight log metadata
    if (
      content.includes('flight') ||
      content.includes('N-number') ||
      content.includes('tail number')
    ) {
      const flightMatch = content.match(/Flight\s+(\w+)/i);
      const dateMatch = content.match(/Date[:\s]+([A-Za-z]+\s+\d{1,2},?\s+\d{4})/i);
      const fromMatch = content.match(/From[:\s]+([A-Za-z\s]+)/i);
      const toMatch = content.match(/To[:\s]+([A-Za-z\s]+)/i);

      if (flightMatch) metadata.flightNumber = flightMatch[1];
      if (dateMatch) metadata.flightDate = dateMatch[1];
      if (fromMatch) metadata.flightFrom = fromMatch[1].trim();
      if (toMatch) metadata.flightTo = toMatch[1].trim();
    }

    // Extract legal metadata
    if (
      content.includes('deposition') ||
      content.includes('testimony') ||
      content.includes('court')
    ) {
      metadata.categories.push('legal');
      const caseMatch = content.match(/Case\s+(?:No\.?\s*)?(\w+)/i);
      const depoMatch = content.match(/Deposition\s+Date[:\s]+([A-Za-z]+\s+\d{1,2},?\s+\d{4})/i);

      if (caseMatch) metadata.legalCase = caseMatch[1];
      if (depoMatch) metadata.depositionDate = depoMatch[1];
    }

    // Determine confidentiality
    if (content.includes('CONFIDENTIAL') || content.includes('SEALED')) {
      metadata.confidentiality = 'confidential';
    } else if (content.includes('CLASSIFIED')) {
      metadata.confidentiality = 'classified';
    }

    return metadata;
  }

  private detectSource(filePath: string): string {
    if (filePath.includes('house_oversight')) return 'House Oversight Committee';
    if (filePath.includes('fbi')) return 'FBI Files';
    if (filePath.includes('palm_beach')) return 'Palm Beach Police';
    if (filePath.includes('flight_log')) return 'Flight Logs';
    if (filePath.includes('email')) return 'Email Archive';
    if (filePath.includes('legal')) return 'Legal Documents';
    return 'Unknown Source';
  }

  private extractEntities(content: string, filePath: string): Entity[] {
    const entities: Map<string, Entity> = new Map();

    // Extract people
    const peopleMatches = content.match(this.ENTITY_PATTERNS.person) || [];
    peopleMatches.forEach((name) => {
      if (EntityNameService.isValidPersonName(name)) {
        // Consolidate name variants
        const canonicalName = EntityNameService.consolidatePersonName(name);
        this.addEntity(entities, canonicalName, 'person', content, filePath);
      }
    });

    // Extract emails
    const emailMatches = content.match(this.ENTITY_PATTERNS.email) || [];
    emailMatches.forEach((email) => {
      this.addEntity(entities, email, 'email', content, filePath);
    });

    // Extract phone numbers
    const phoneMatches = content.match(this.ENTITY_PATTERNS.phone) || [];
    phoneMatches.forEach((phone) => {
      this.addEntity(entities, phone, 'phone', content, filePath);
    });

    // Extract dates
    const dateMatches = content.match(this.ENTITY_PATTERNS.date) || [];
    dateMatches.forEach((date) => {
      this.addEntity(entities, date, 'date', content, filePath);
    });

    // Extract amounts
    const amountMatches = content.match(this.ENTITY_PATTERNS.amount) || [];
    amountMatches.forEach((amount) => {
      this.addEntity(entities, amount, 'amount', content, filePath);
    });

    // Extract locations and organizations
    const locationMatches = content.match(this.ENTITY_PATTERNS.location) || [];
    locationMatches.forEach((location) => {
      if (EntityNameService.isValidOrganizationName(location)) {
        this.addEntity(entities, location, 'organization', content, filePath);
      } else {
        this.addEntity(entities, location, 'location', content, filePath);
      }
    });

    // Filter and consolidate entities using EntityNameService
    const entityArray = Array.from(entities.values());
    return EntityNameService.filterAndConsolidateEntities(entityArray);
  }

  private addEntity(
    entities: Map<string, Entity>,
    name: string,
    type: Entity['type'],
    content: string,
    filePath: string,
  ) {
    if (!entities.has(name)) {
      entities.set(name, {
        name,
        type,
        mentions: 0,
        contexts: [],
        significance: 'medium',
        relatedEntities: [],
      });
    }

    const entity = entities.get(name)!;
    entity.mentions++;

    // Find context around the entity mention
    const regex = new RegExp(`\\b${this.escapeRegExp(name)}\\b`, 'gi');
    let match;
    while ((match = regex.exec(content)) !== null) {
      const start = Math.max(0, match.index - 100);
      const end = Math.min(content.length, match.index + name.length + 100);
      const context = content.substring(start, end);

      entity.contexts.push({
        passage: match[0],
        context: context,
        position: match.index,
        file: filePath,
        significance: this.calculateEntitySignificance(name, context),
      });
    }
  }

  private isValidPersonName(name: string): boolean {
    return EntityNameService.isValidPersonName(name);
  }

  private escapeRegExp(string: string): string {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  private calculateEntitySignificance(_name: string, context: string): 'high' | 'medium' | 'low' {
    const lowerContext = context.toLowerCase();

    if (lowerContext.includes('epstein') || lowerContext.includes('maxwell')) {
      return 'high';
    }

    if (
      lowerContext.includes('flight') ||
      lowerContext.includes('island') ||
      lowerContext.includes('massage')
    ) {
      return 'medium';
    }

    return 'low';
  }

  private extractPassages(content: string, filePath: string): Passage[] {
    const passages: Passage[] = [];
    const sentences = content.split(/[.!?]+/).filter((s) => s.trim().length > 10);

    sentences.forEach((sentence, index) => {
      const trimmedSentence = sentence.trim();
      if (trimmedSentence.length > 20) {
        const entities = this.extractEntitiesFromPassage(trimmedSentence);
        const keywords = this.extractKeywords(trimmedSentence);
        const redFlagLevel = this.calculateRedFlagScore(trimmedSentence);

        passages.push({
          id: `${filePath}_passage_${index}`,
          content: trimmedSentence,
          context: this.getPassageContext(content, index, sentences),
          keywords,
          entities: entities.map((e) => e.name),
          redFlagLevel,
          significance: this.calculatePassageSignificance(redFlagLevel, entities.length),
          file: filePath,
          position: content.indexOf(trimmedSentence),
        });
      }
    });

    return passages;
  }

  private extractEntitiesFromPassage(passage: string): Entity[] {
    const entities: Entity[] = [];

    // Simple entity extraction for passages
    const peopleMatches = passage.match(this.ENTITY_PATTERNS.person) || [];
    peopleMatches.forEach((name) => {
      if (this.isValidPersonName(name)) {
        entities.push({
          name,
          type: 'person',
          mentions: 1,
          contexts: [],
          significance: 'medium',
          relatedEntities: [],
        });
      }
    });

    return entities;
  }

  private extractKeywords(text: string): string[] {
    const words = text.toLowerCase().split(/\s+/);
    const keywords = words.filter(
      (word) =>
        word.length > 3 &&
        !this.isStopWord(word) &&
        (this.RED_FLAG_KEYWORDS[word as keyof typeof this.RED_FLAG_KEYWORDS] || 0) > 0,
    );

    return [...new Set(keywords)];
  }

  private isStopWord(word: string): boolean {
    const stopWords = [
      'the',
      'and',
      'for',
      'are',
      'but',
      'not',
      'you',
      'all',
      'can',
      'had',
      'her',
      'was',
      'one',
      'our',
      'out',
      'day',
      'get',
      'has',
      'him',
      'his',
      'how',
      'man',
      'new',
      'now',
      'old',
      'see',
      'two',
      'way',
      'who',
      'boy',
      'did',
      'its',
      'let',
      'put',
      'say',
      'she',
      'too',
      'use',
    ];
    return stopWords.includes(word);
  }

  private getPassageContext(_content: string, index: number, sentences: string[]): string {
    const start = Math.max(0, index - 2);
    const end = Math.min(sentences.length, index + 3);
    return sentences.slice(start, end).join('. ').trim();
  }

  private calculatePassageSignificance(
    redFlagLevel: number,
    entityCount: number,
  ): 'high' | 'medium' | 'low' {
    if (redFlagLevel >= 4 || entityCount >= 3) return 'high';
    if (redFlagLevel >= 2 || entityCount >= 1) return 'medium';
    return 'low';
  }

  private calculateRedFlagScore(content: string): number {
    const lowerContent = content.toLowerCase();
    let score = 0;
    let keywordCount = 0;

    Object.entries(this.RED_FLAG_KEYWORDS).forEach(([keyword, weight]) => {
      const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
      const matches = lowerContent.match(regex);
      if (matches) {
        score += matches.length * weight;
        keywordCount += matches.length;
      }
    });

    // Bonus for multiple red-flag keywords
    if (keywordCount >= 5) score += 10;
    if (keywordCount >= 10) score += 20;

    return Math.min(score, 100); // Cap at 100
  }

  private calculateRedFlagRating(score: number): {
    rating: number;
    peppers: string;
    description: string;
  } {
    if (score >= 50) {
      return {
        rating: 5,
        peppers: '',
        description: 'Red Flag Index 5 - Major criminal evidence',
      };
    } else if (score >= 35) {
      return {
        rating: 4,
        peppers: '',
        description: 'Red Flag Index 4 - Significant incriminating content',
      };
    } else if (score >= 20) {
      return {
        rating: 3,
        peppers: '',
        description: 'Red Flag Index 3 - Notable controversial mentions',
      };
    } else if (score >= 10) {
      return {
        rating: 2,
        peppers: '',
        description: 'Red Flag Index 2 - Some interesting connections',
      };
    } else {
      return { rating: 1, peppers: '', description: 'Red Flag Index 1 - Minor mentions' };
    }
  }

  private buildSearchIndex(document: Document) {
    const searchTerms = this.extractSearchTerms(document);

    searchTerms.forEach((term) => {
      if (!this.searchIndex.has(term)) {
        this.searchIndex.set(term, new Set());
      }
      this.searchIndex.get(term)!.add(document.id);
    });
  }

  private extractSearchTerms(document: Document): string[] {
    const terms: string[] = [];

    // Add title terms
    terms.push(...document.title.toLowerCase().split(/\s+/));

    // Add content terms (limit to avoid memory issues)
    const contentWords = document.content.toLowerCase().split(/\s+/);
    const uniqueWords = [...new Set(contentWords)].filter((word) => word.length > 2);
    terms.push(...uniqueWords.slice(0, 1000)); // Limit to first 1000 unique words

    // Add entity names (safely handle undefined)
    const entities = document.entities || [];
    entities.forEach((entity) => {
      if (entity && entity.name) {
        terms.push(entity.name.toLowerCase());
      }
    });

    // Add keywords from passages (safely handle undefined)
    const passages: Passage[] = document.passages || [];
    passages.forEach((passage) => {
      if (passage && passage.keywords && Array.isArray(passage.keywords)) {
        terms.push(...passage.keywords);
      }
    });

    return [...new Set(terms)].filter((term) => term.length > 2);
  }

  private updateEntityIndex(entities: Entity[]) {
    entities.forEach((entity) => {
      if (!this.entities.has(entity.name)) {
        this.entities.set(entity.name, {
          name: entity.name,
          type: entity.type,
          mentions: 0,
          contexts: [],
          significance: entity.significance,
          relatedEntities: [],
        });
      }

      const existingEntity = this.entities.get(entity.name)!;
      existingEntity.mentions += entity.mentions;
      existingEntity.contexts.push(...entity.contexts);

      // Update significance if higher
      if (
        entity.significance === 'high' ||
        (entity.significance === 'medium' && existingEntity.significance === 'low')
      ) {
        existingEntity.significance = entity.significance;
      }
    });
  }

  private buildInvertedIndex(document: Document) {
    const words = document.content.toLowerCase().split(/\s+/);
    const uniqueWords = [...new Set(words)].filter((word) => word.length > 2);

    uniqueWords.forEach((word) => {
      if (!this.invertedIndex.has(word)) {
        this.invertedIndex.set(word, new Set());
      }
      this.invertedIndex.get(word)!.add(document.id);
    });
  }

  private buildEntityIndex(document: Document) {
    document.entities?.forEach((entity) => {
      const entityKey = `${entity.type}:${entity.name.toLowerCase()}`;
      if (!this.entityIndex.has(entityKey)) {
        this.entityIndex.set(entityKey, new Set());
      }
      this.entityIndex.get(entityKey)!.add(document.id);
    });
  }

  private buildDateIndex(document: Document) {
    const datePattern =
      /\b(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+\d{4}\b/g;
    const dates = document.content?.match(datePattern) || [];

    dates.forEach((date) => {
      const dateKey = new Date(date).toISOString().split('T')[0];
      if (!this.dateIndex.has(dateKey)) {
        this.dateIndex.set(dateKey, new Set());
      }
      this.dateIndex.get(dateKey)!.add(document.id);
    });
  }

  private buildCategoryIndex(document: Document) {
    document.metadata?.categories?.forEach((category) => {
      if (!this.categoryIndex.has(category)) {
        this.categoryIndex.set(category, new Set());
      }
      this.categoryIndex.get(category)!.add(document.id);
    });
  }

  // Performance optimization methods
  private getCacheKey(type: string, params: Record<string, unknown>): string {
    return `${type}:${JSON.stringify(params)}`;
  }

  private setCache(key: string, value: Document[]): void {
    if (this.searchCache.size >= this.MAX_CACHE_SIZE) {
      const firstKey = this.searchCache.keys().next().value;
      if (firstKey) {
        this.searchCache.delete(firstKey);
      }
    }
    this.searchCache.set(key, value);
  }

  private getCache(key: string): Document[] | null {
    const cached = this.searchCache.get(key);
    if (cached && Date.now() - this.lastSearchTime < this.CACHE_TTL) {
      return cached;
    }
    return null;
  }

  // Public methods for searching and browsing
  searchDocuments(query: string, filters?: BrowseFilters): Document[] {
    // Check cache first
    const cacheKey = this.getCacheKey('search', { query, filters });
    const cached = this.getCache(cacheKey);
    if (cached) return cached;

    const searchTerms = query
      .toLowerCase()
      .split(/\s+/)
      .filter((term) => term.length > 2);
    const matchingDocIds = new Set<string>();

    // Search in inverted index first (full-text search)
    searchTerms.forEach((term) => {
      if (this.invertedIndex.has(term)) {
        this.invertedIndex.get(term)!.forEach((docId) => {
          matchingDocIds.add(docId);
        });
      }
    });

    // Search in entity index for named entities
    searchTerms.forEach((term) => {
      ['person', 'email', 'location'].forEach((entityType) => {
        const entityKey = `${entityType}:${term}`;
        if (this.entityIndex.has(entityKey)) {
          this.entityIndex.get(entityKey)!.forEach((docId) => {
            matchingDocIds.add(docId);
          });
        }
      });
    });

    // Search in titles and entities directly
    if (matchingDocIds.size === 0) {
      // Fallback to title and entity search if no full-text matches
      Array.from(this.documents.values()).forEach((doc) => {
        const titleMatch = searchTerms.some((term) => doc.title.toLowerCase().includes(term));
        const entityMatch = doc.entities?.some((entity) =>
          searchTerms.some((term) => entity.name.toLowerCase().includes(term)),
        );

        if (titleMatch || entityMatch) {
          matchingDocIds.add(doc.id);
        }
      });
    }

    let results = Array.from(matchingDocIds)
      .map((id) => this.documents.get(id)!)
      .filter(Boolean);

    // Apply filters
    if (filters) {
      results = this.applyFilters(results, filters);
    }

    // Sort by relevance (number of matching terms)
    results.sort((a, b) => {
      const aMatches = this.calculateRelevanceScore(a, searchTerms);
      const bMatches = this.calculateRelevanceScore(b, searchTerms);
      return bMatches - aMatches;
    });

    // Cache results
    this.setCache(cacheKey, results);
    this.lastSearchTime = Date.now();

    return results;
  }

  private calculateRelevanceScore(document: Document, searchTerms: string[]): number {
    let score = 0;

    // Title matches (higher weight)
    searchTerms.forEach((term) => {
      if (document.title.toLowerCase().includes(term)) {
        score += 5;
      }
    });

    // Entity matches (medium weight)
    document.entities?.forEach((entity) => {
      searchTerms.forEach((term) => {
        if (entity.name.toLowerCase().includes(term)) {
          score += 3;
        }
      });
    });

    // Content matches (lower weight)
    searchTerms.forEach((term) => {
      const contentLower = document.content.toLowerCase();
      try {
        const escapedTerm = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const matches = contentLower.match(new RegExp(`\\b${escapedTerm}\\b`, 'g'));
        if (matches) {
          score += matches.length;
        }
      } catch {
        // Ignore regex errors for weird terms
      }
    });

    // Red-flag rating bonus (Core investigative feature)
    score += (document.redFlagRating || 0) * 0.5;

    return score;
  }

  browseDocuments(
    filters: BrowseFilters,
    sortBy: string = 'relevance',
    sortOrder: 'asc' | 'desc' = 'desc',
  ): Document[] {
    // Check cache first
    const cacheKey = this.getCacheKey('browse', { filters, sortBy, sortOrder });
    const cached = this.getCache(cacheKey);
    if (cached) return cached;

    let documents = Array.from(this.documents.values());

    // Apply filters
    documents = this.applyFilters(documents, filters);

    // Sort results
    documents = this.sortDocuments(documents, sortBy, sortOrder);

    // Cache results
    this.setCache(cacheKey, documents);

    return documents;
  }

  private applyFilters(documents: Document[], filters: BrowseFilters): Document[] {
    return documents.filter((doc) => {
      // File type filter
      if (filters.fileType && filters.fileType.length > 0) {
        if (!filters.fileType.includes(doc.fileType)) return false;
      }

      // Date range filter
      if (filters.dateRange) {
        if (filters.dateRange.start && doc.dateCreated && doc.dateCreated < filters.dateRange.start)
          return false;
        if (filters.dateRange.end && doc.dateCreated && doc.dateCreated > filters.dateRange.end)
          return false;
      }

      // Entities filter
      if (filters.entities && filters.entities.length > 0) {
        const docEntityNames = doc.entities?.map((e) => e.name) || [];
        const hasMatchingEntity = filters.entities.some((entity) =>
          docEntityNames.includes(entity),
        );
        if (!hasMatchingEntity) return false;
      }

      // Categories filter
      if (filters.categories && filters.categories.length > 0) {
        const hasMatchingCategory = filters.categories.some((category) =>
          doc.metadata?.categories?.includes(category),
        );
        if (!hasMatchingCategory) return false;
      }

      // Red-flag rating filter
      if (filters.redFlagLevel) {
        if (
          (doc.redFlagRating || 0) < filters.redFlagLevel.min ||
          (doc.redFlagRating || 0) > filters.redFlagLevel.max
        ) {
          return false;
        }
      }

      // Confidentiality filter
      if (filters.confidentiality && filters.confidentiality.length > 0) {
        if (!filters.confidentiality.includes(doc.metadata?.confidentiality || '')) return false;
      }

      // Source filter
      if (filters.source && filters.source.length > 0) {
        if (!filters.source.includes(doc.metadata?.source || '')) return false;
      }

      return true;
    });
  }

  private sortDocuments(
    documents: Document[],
    sortBy: string,
    sortOrder: 'asc' | 'desc',
  ): Document[] {
    return documents.sort((a, b) => {
      let comparison = 0;

      switch (sortBy) {
        case 'date': {
          const dateA = a.dateCreated || '';
          const dateB = b.dateCreated || '';
          comparison = dateA.localeCompare(dateB);
          break;
        }
        case 'red_flag':
          comparison = (a.redFlagScore || 0) - (b.redFlagScore || 0);
          break;
        case 'fileType':
          comparison = a.fileType.localeCompare(b.fileType);
          break;
        case 'size':
          comparison = a.fileSize - b.fileSize;
          break;
        default: // relevance - sort by entity count and mentions
          comparison = (b.entities?.length || 0) - (a.entities?.length || 0);
          if (comparison === 0) {
            comparison = (b.redFlagScore || 0) - (a.redFlagScore || 0);
          }
      }

      return sortOrder === 'asc' ? comparison : -comparison;
    });
  }

  getDocumentById(id: string): Document | undefined {
    return this.documents.get(id);
  }

  getAllEntities(): Entity[] {
    return Array.from(this.entities.values()).sort((a, b) => b.mentions - a.mentions);
  }

  getDocumentCollection(): DocumentCollection {
    const documents = Array.from(this.documents.values());
    console.log(
      `DocumentProcessor: getDocumentCollection called, documents in Map: ${this.documents.size}, array length: ${documents.length}`,
    );
    const fileTypes = new Map<string, number>();
    const categories = new Map<string, number>();

    documents.forEach((doc) => {
      fileTypes.set(doc.fileType, (fileTypes.get(doc.fileType) || 0) + 1);
      doc.metadata?.categories?.forEach((cat) => {
        categories.set(cat, (categories.get(cat) || 0) + 1);
      });
    });

    const dates = documents
      .map((doc) => doc.dateCreated)
      .filter((date) => date !== undefined)
      .sort();

    return {
      documents,
      entities: this.entities,
      totalFiles: documents.length,
      totalSize: documents.reduce((sum, doc) => sum + doc.fileSize, 0),
      dateRange: {
        earliest: dates[0],
        latest: dates[dates.length - 1],
      },
      fileTypes,
      categories,
    };
  }

  // Forensic Metadata Extraction Methods

  private extractTechnicalMetadata(content: string): TechnicalMetadata {
    const technical: TechnicalMetadata = {};

    // Extract PDF metadata using regex
    const producerMatch = content.match(/\/Producer\s*\(([^)]+)\)/);
    if (producerMatch) technical.producer = producerMatch[1];

    const creatorMatch = content.match(/\/Creator\s*\(([^)]+)\)/);
    if (creatorMatch) technical.creator = creatorMatch[1];

    const createDateMatch = content.match(/\/CreationDate\s*\(D:([^)]+)\)/);
    if (createDateMatch) technical.createDate = this.parsePDFDate(createDateMatch[1]);

    const modDateMatch = content.match(/\/ModDate\s*\(D:([^)]+)\)/);
    if (modDateMatch) technical.modifyDate = this.parsePDFDate(modDateMatch[1]);

    return technical;
  }

  private parsePDFDate(dateStr: string): string {
    // Format: D:YYYYMMDDHHmmSSOHH'mm'
    // Example: D:20190706120000-04'00'
    try {
      const year = dateStr.substring(0, 4);
      const month = dateStr.substring(4, 6);
      const day = dateStr.substring(6, 8);
      const hour = dateStr.substring(8, 10) || '00';
      const min = dateStr.substring(10, 12) || '00';
      const sec = dateStr.substring(12, 14) || '00';
      return `${year}-${month}-${day}T${hour}:${min}:${sec}Z`;
    } catch {
      return new Date().toISOString();
    }
  }

  private analyzePDFStructure(content: string): StructureMetadata {
    const structure: StructureMetadata = {};

    // Detect Javascript
    structure.hasJavascript = /\/JavaScript|\/JS\b/.test(content);

    // Count fonts
    const fontMatches = content.match(/\/Font\b/g);
    structure.fontCount = fontMatches ? fontMatches.length : 0;

    // Check if tagged
    structure.isTagged = /\/MarkInfo\s*<<\s*\/Marked\s+true/.test(content);

    // PDF Version
    const versionMatch = content.match(/^\s*%PDF-(\d+\.\d+)/);
    if (versionMatch) structure.pdfVersion = versionMatch[1];

    // Page count (estimate based on /Page objects)
    const pageMatches = content.match(/\/Type\s*\/Page\b/g);
    structure.pageCount = pageMatches ? pageMatches.length : 1;

    return structure;
  }

  private analyzeLinguistics(content: string): LinguisticMetadata {
    const linguistics: LinguisticMetadata = {};

    // Word count and unique words
    const words = content.toLowerCase().match(/\b\w+\b/g) || [];
    linguistics.wordCount = words.length;
    const uniqueWords = new Set(words);
    linguistics.uniqueWordCount = uniqueWords.size;

    // Type-Token Ratio (TTR)
    linguistics.ttr = words.length > 0 ? uniqueWords.size / words.length : 0;

    // Readability (Flesch-Kincaid Grade Level)
    // 0.39 * (words/sentences) + 11.8 * (syllables/words) - 15.59
    const sentences = content.split(/[.!?]+/).filter((s) => s.trim().length > 0);
    const sentenceCount = Math.max(1, sentences.length);
    const syllableCount = this.countSyllables(content);

    const avgWordsPerSentence = words.length / sentenceCount;
    const avgSyllablesPerWord = words.length > 0 ? syllableCount / words.length : 0;

    linguistics.readingLevel = Math.max(
      0,
      0.39 * avgWordsPerSentence + 11.8 * avgSyllablesPerWord - 15.59,
    );

    // Sentiment (Simple keyword based)
    const positiveWords = [
      'good',
      'great',
      'excellent',
      'positive',
      'success',
      'happy',
      'agree',
      'confirm',
    ];
    const negativeWords = [
      'bad',
      'poor',
      'negative',
      'fail',
      'sad',
      'deny',
      'reject',
      'criminal',
      'guilty',
      'abuse',
    ];

    let sentimentScore = 0;
    words.forEach((word) => {
      if (positiveWords.includes(word)) sentimentScore += 1;
      if (negativeWords.includes(word)) sentimentScore -= 1;
    });

    // Normalize score -1 to 1
    linguistics.sentimentScore = Math.max(
      -1,
      Math.min(1, sentimentScore / Math.max(1, words.length * 0.1)),
    );
    linguistics.sentiment =
      linguistics.sentimentScore > 0.1
        ? 'positive'
        : linguistics.sentimentScore < -0.1
          ? 'negative'
          : 'neutral';

    return linguistics;
  }

  private countSyllables(text: string): number {
    // Very basic syllable counter
    return text.toLowerCase().split(/[aeiouy]+/).length - 1;
  }

  private analyzeTemporalPatterns(
    metadata: DocumentMetadata,
    technical: TechnicalMetadata,
  ): TemporalMetadata {
    const temporal: TemporalMetadata = {};

    // Use creation date if available
    const dateStr = technical.createDate || metadata.testimonyDate || metadata.flightDate;

    if (dateStr) {
      const date = new Date(dateStr);
      if (!isNaN(date.getTime())) {
        const hour = date.getUTCHours();
        const day = date.getUTCDay();

        // Business hours (9am - 5pm)
        temporal.isBusinessHours = hour >= 9 && hour <= 17 && day !== 0 && day !== 6;

        const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        temporal.dayOfWeek = days[day];

        // Timezone inference (very rough, based on offset in original string if we had it, but here we just have UTC date object)
        // Ideally we'd parse the offset from the raw string in extractTechnicalMetadata
      }
    }

    return temporal;
  }

  private calculateNetworkMetrics(entities: Entity[], content: string): NetworkMetadata {
    const network: NetworkMetadata = {};

    // Entity Density (Entities per 1000 words)
    const wordCount = content.split(/\s+/).length;
    network.entityDensity = wordCount > 0 ? (entities.length / wordCount) * 1000 : 0;

    // Risk Score (Sum of significance)
    let riskScore = 0;
    entities.forEach((e) => {
      if (e.significance === 'high') riskScore += 10;
      if (e.significance === 'medium') riskScore += 5;
      if (e.significance === 'low') riskScore += 1;
    });
    network.riskScore = riskScore;

    // Co-occurrence Risk (Pairs of high risk entities)
    const highRiskEntities = entities.filter((e) => e.significance === 'high');
    // n * (n-1) / 2 pairs
    const n = highRiskEntities.length;
    network.coOccurrenceRisk = (n * (n - 1)) / 2;

    return network;
  }

  findRelatedDocuments(documentId: string, limit: number = 10): Document[] {
    const document = this.documents.get(documentId);
    if (!document) return [];

    const relatedDocs = new Map<string, number>();

    // Find documents with shared entities
    document.entities?.forEach((entity) => {
      const entityKey = `${entity.type}:${entity.name.toLowerCase()}`;
      if (this.entityIndex.has(entityKey)) {
        this.entityIndex.get(entityKey)!.forEach((docId) => {
          if (docId !== documentId) {
            relatedDocs.set(docId, (relatedDocs.get(docId) || 0) + 1);
          }
        });
      }
    });

    // Find documents with shared categories
    document.metadata?.categories?.forEach((category) => {
      if (this.categoryIndex.has(category)) {
        this.categoryIndex.get(category)!.forEach((docId) => {
          if (docId !== documentId) {
            relatedDocs.set(docId, (relatedDocs.get(docId) || 0) + 0.5);
          }
        });
      }
    });

    // Sort by relevance score and return top results
    return Array.from(relatedDocs.entries())
      .sort(([, scoreA], [, scoreB]) => scoreB - scoreA)
      .slice(0, limit)
      .map(([docId]) => this.documents.get(docId)!)
      .filter(Boolean);
  }

  findDocumentsByEntity(entityName: string, entityType?: string): Document[] {
    const results: Document[] = [];
    const searchKey = entityType
      ? `${entityType}:${entityName.toLowerCase()}`
      : entityName.toLowerCase();

    if (entityType && this.entityIndex.has(searchKey)) {
      this.entityIndex.get(searchKey)!.forEach((docId) => {
        results.push(this.documents.get(docId)!);
      });
    } else {
      // Search across all entity types
      Array.from(this.entityIndex.entries()).forEach(([key, docIds]) => {
        if (key.includes(searchKey)) {
          docIds.forEach((docId) => {
            results.push(this.documents.get(docId)!);
          });
        }
      });
    }

    return results;
  }

  findDocumentsByDate(date: string): Document[] {
    const dateKey = new Date(date).toISOString().split('T')[0];
    const results: Document[] = [];

    if (this.dateIndex.has(dateKey)) {
      this.dateIndex.get(dateKey)!.forEach((docId) => {
        results.push(this.documents.get(docId)!);
      });
    }

    return results;
  }

  getEntityNetwork(entityName: string): {
    entity: Entity | null;
    connections: Array<{ entity: Entity; strength: number; sharedDocuments: string[] }>;
  } {
    const entity = this.entities.get(entityName);
    if (!entity) return { entity: null, connections: [] };

    const connections = new Map<
      string,
      { entity: Entity; strength: number; sharedDocuments: string[] }
    >();

    // Find all documents containing this entity
    const entityDocs = this.findDocumentsByEntity(entityName, entity.type);

    entityDocs.forEach((doc) => {
      doc.entities?.forEach((otherEntity) => {
        if (otherEntity.name !== entityName) {
          const key = otherEntity.name;
          if (!connections.has(key)) {
            connections.set(key, {
              entity: otherEntity,
              strength: 0,
              sharedDocuments: [],
            });
          }

          const connection = connections.get(key)!;
          connection.strength += 1;
          connection.sharedDocuments.push(doc.id);
        }
      });
    });

    return {
      entity,
      connections: Array.from(connections.values())
        .sort((a, b) => b.strength - a.strength)
        .slice(0, 20),
    };
  }

  getStatistics() {
    const collection = this.getDocumentCollection();
    const totalEntities = Array.from(this.entities.values()).length;
    const avgRedFlagScore =
      collection.documents.reduce((sum, doc) => sum + (doc.redFlagScore || 0), 0) /
      collection.totalFiles;

    return {
      totalDocuments: collection.totalFiles,
      totalEntities,
      totalSize: collection.totalSize,
      averageRedFlagScore: Math.round(avgRedFlagScore * 100) / 100,
      fileTypes: Array.from(collection.fileTypes.entries()),
      topEntities: this.getAllEntities().slice(0, 10),
      dateRange: collection.dateRange,
    };
  }

  // Load documents from an external source (e.g., API)
  async loadDocuments(documents: Document[]): Promise<void> {
    // console.log(`DocumentProcessor: Loading ${documents.length} documents...`);

    const BATCH_SIZE = 50;

    for (let i = 0; i < documents.length; i += BATCH_SIZE) {
      const batch = documents.slice(i, i + BATCH_SIZE);

      // Process batch synchronously
      for (const doc of batch) {
        // Store document in the Map
        this.documents.set(doc.id, doc);

        // Build all indexes for this document
        this.buildSearchIndex(doc);
        this.buildInvertedIndex(doc);
        this.buildEntityIndex(doc);
        this.buildDateIndex(doc);
        this.buildCategoryIndex(doc);

        // Update entity index if document has entities
        if (doc.entities && doc.entities.length > 0) {
          this.updateEntityIndex(doc.entities);
        }

        // Store passages if available
        if (doc.passages && doc.passages.length > 0) {
          this.passages.set(doc.id, doc.passages);
        }
      }

      // Yield to main thread to allow UI updates
      if (i + BATCH_SIZE < documents.length) {
        await new Promise((resolve) => setTimeout(resolve, 0));
      }
    }

    // console.log(`DocumentProcessor: Loaded ${this.documents.size} total documents`);
  }
}
