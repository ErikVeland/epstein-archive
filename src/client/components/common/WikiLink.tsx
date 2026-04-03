import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { LqText } from '../../design-system/components/typography/Text';

interface WikiLinkProps {
  text: string;
  entities: Array<{ id: string; name: string }>;
}

/**
 * WikiLink Component
 *
 * Automatically identifies entity names in text and wraps them in links.
 * Uses a longest-match strategy to ensure "Jeffrey Epstein" is linked before "Epstein".
 */
export const WikiLink: React.FC<WikiLinkProps> = React.memo(({ text, entities }) => {
  const linkedContent = useMemo(() => {
    if (!text || !entities || entities.length === 0) return text;

    // 1. Pre-filter entities to only those present in the current text block
    // This dramatically improves performance for large entity lists
    const presentEntities = entities
      .filter((e) => e.name && e.name.length > 2 && text.includes(e.name))
      .sort((a, b) => b.name.length - a.name.length);

    if (presentEntities.length === 0) return text;

    // 2. Segmented scanning approach
    type Segment = { content: string; entityId?: string };
    let segments: Segment[] = [{ content: text }];

    presentEntities.forEach((entity) => {
      const nextSegments: Segment[] = [];

      segments.forEach((segment) => {
        // Skip already-linked segments
        if (segment.entityId) {
          nextSegments.push(segment);
          return;
        }

        // Split current unlinked segment by the entity name
        // Use a simple split/join logic to find all occurrences
        const parts = segment.content.split(entity.name);

        parts.forEach((part, i) => {
          if (part) {
            nextSegments.push({ content: part });
          }
          if (i < parts.length - 1) {
            nextSegments.push({ content: entity.name, entityId: entity.id });
          }
        });
      });

      segments = nextSegments;
    });

    // 3. Map segments to React elements
    return segments.map((seg, i) =>
      seg.entityId ? (
        <Link
          key={`${seg.entityId}-${i}`}
          to={`/entities/${seg.entityId}`}
          className="inline group"
          title={`View profile for ${seg.content}`}
        >
          <LqText
            as="span"
            variant="body"
            color="accent"
            className="inline font-medium underline underline-offset-4 decoration-[color:color-mix(in_srgb,var(--accent)_30%,transparent)] group-hover:decoration-[var(--accent)] transition-all duration-200"
          >
            {seg.content}
          </LqText>
        </Link>
      ) : (
        seg.content
      ),
    );
  }, [text, entities]);

  return <>{linkedContent}</>;
});
