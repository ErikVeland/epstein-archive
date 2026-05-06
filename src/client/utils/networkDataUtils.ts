import { Entity, Relationship } from '../components/entities/EntityRelationshipMapper';

export interface RawPerson {
  id: string;
  name: string;
  role?: string;
  affiliations?: string[];
  documents?: string[]; // IDs of documents they appear in
}

export interface RawDocument {
  id: string;
  title: string;
  date?: string;
  mentionedEntities?: string[]; // IDs of people mentioned
}

/**
 * Transforms raw application data into a network graph format
 */
export const transformToNetwork = (
  people: RawPerson[],
  documents: RawDocument[],
): { entities: Entity[]; relationships: Relationship[] } => {
  const entities: Entity[] = [];
  const relationships: Relationship[] = [];
  const entityMap = new Map<string, Entity>();

  // 1. Create Person Entities
  people.forEach((person) => {
    const entity: Entity = {
      id: person.id,
      type: 'person',
      label: person.name,
      properties: {
        role: person.role,
        affiliations: person.affiliations,
      },
      confidence: 1.0, // Base confidence
      sources: [], // To be populated
    };
    entities.push(entity);
    entityMap.set(person.id, entity);
  });

  // 2. Create Document Entities
  documents.forEach((doc) => {
    const entity: Entity = {
      id: doc.id,
      type: 'document',
      label: doc.title,
      properties: {
        date: doc.date,
      },
      confidence: 1.0,
      sources: [],
    };
    entities.push(entity);
    entityMap.set(doc.id, entity);
  });

  // 3. Create Relationships (Person -> Document)
  documents.forEach((doc) => {
    if (doc.mentionedEntities) {
      doc.mentionedEntities.forEach((personId) => {
        if (entityMap.has(personId)) {
          relationships.push({
            id: `rel-${doc.id}-${personId}`,
            from: personId,
            to: doc.id,
            type: 'appears_in',
            strength: 1,
            confidence: 0.9,
            evidence: [doc.id],
            properties: {},
          });
        }
      });
    }
  });

  // 4. Infer Person -> Person Relationships (Co-occurrence)
  // If two people appear in the same document, create a link
  const coOccurrenceMap = new Map<string, { count: number; docs: string[] }>();

  documents.forEach((doc) => {
    const mentioned = doc.mentionedEntities || [];
    for (let i = 0; i < mentioned.length; i++) {
      for (let j = i + 1; j < mentioned.length; j++) {
        const p1 = mentioned[i];
        const p2 = mentioned[j];
        // Sort IDs to ensure consistent key
        const key = [p1, p2].sort().join('-');

        if (!coOccurrenceMap.has(key)) {
          coOccurrenceMap.set(key, { count: 0, docs: [] });
        }
        const entry = coOccurrenceMap.get(key)!;
        entry.count++;
        entry.docs.push(doc.id);
      }
    }
  });

  coOccurrenceMap.forEach((value, key) => {
    const [p1, p2] = key.split('-');
    if (entityMap.has(p1) && entityMap.has(p2)) {
      relationships.push({
        id: `rel-${p1}-${p2}`,
        from: p1,
        to: p2,
        type: 'co_occurrence',
        strength: Math.min(value.count, 5), // Cap strength visually
        confidence: 0.8 + value.count * 0.05, // Increase confidence with more co-occurrences
        evidence: value.docs,
        properties: {
          sharedDocuments: value.count,
        },
      });
    }
  });

  return { entities, relationships };
};
