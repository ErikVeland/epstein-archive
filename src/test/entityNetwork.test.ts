import { describe, expect, it } from 'vitest';
import { getNetworkRelationships } from '../client/utils/entityNetwork';

describe('entity network labels', () => {
  it('uses names in the relationship response without loading more profiles', () => {
    expect(
      getNetworkRelationships('1', [
        { related_entity_id: '2', related_entity_name: 'Synthetic neighbour' },
      ]),
    ).toEqual([
      {
        related_entity_id: '2',
        related_entity_name: 'Synthetic neighbour',
        name: 'Synthetic neighbour',
      },
    ]);
  });

  it('maps graph DTO fields and keeps indirect edges out of the direct network', () => {
    const relationships = getNetworkRelationships('1', [], {
      nodes: [
        { id: '1', label: 'Centre', type: 'person', risk: 0 },
        { id: '2', label: 'Direct', type: 'person', risk: 0 },
        { id: '3', label: 'Indirect', type: 'person', risk: 0 },
      ],
      edges: [
        {
          source: '1',
          target: '2',
          type: 'document',
          weight: 4,
          confidence: 0.8,
          classification: null,
        },
        {
          source: '2',
          target: '3',
          type: 'document',
          weight: 2,
          confidence: 0.7,
          classification: null,
        },
      ],
    });
    expect(relationships).toEqual([
      {
        related_entity_id: '2',
        name: 'Direct',
        relationship_type: 'document',
        strength: 4,
        confidence: 0.8,
      },
    ]);
  });
});
