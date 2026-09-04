import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@client/services/apiClient';
import { mapApiDocumentToDocument } from '@client/hooks/useDocumentBrowserData';
import { selectDocumentHighlights } from '@client/utils/documentHighlights';
import type { Document } from '@client/types/documents';
import { Carousel } from '@client/design-system/components/navigation/Carousel';
import { Button, LqText, Surface, Flex } from '@client/design-system/lib';
import styles from './DocumentHighlights.module.css';

export function DocumentHighlights({ onOpen }: { onOpen: (document: Document) => void }) {
  const { data, isPending, isError, refetch } = useQuery({
    queryKey: ['documents', 'editorial-highlights'],
    queryFn: async () => {
      const sources = ['Maxwell Proffer', 'DOJ Phase 1'];
      const collections = await Promise.all(
        sources.map(async (source) => {
          const result = await apiClient.getDocuments(
            { source: [source], sortBy: 'title', sortOrder: 'asc' },
            1,
            100,
          );
          // Preserve the exact source filter because list responses omit collection names.
          return result.data.map((doc) =>
            mapApiDocumentToDocument({
              ...doc,
              metadata: { ...doc.metadata, source },
            }),
          );
        }),
      );
      return selectDocumentHighlights(collections.flat());
    },
    staleTime: 300_000,
  });
  if (isPending)
    return (
      <LqText role="status" color="secondary">
        Loading document highlights…
      </LqText>
    );
  if (isError)
    return (
      <Flex align="center" gap="md">
        <LqText color="secondary">Document highlights could not load.</LqText>
        <Button variant="glass" onClick={() => void refetch()}>
          Retry highlights
        </Button>
      </Flex>
    );
  if (!data?.length) return null;
  return (
    <Carousel
      title="Document highlights"
      description="Selected interviews, agreements and oversight records. Start with the original documents."
    >
      {data.map(({ document, title, category, reason }) => (
        <Surface
          key={document.id}
          variant="glass-highlight"
          accent="amber"
          p={4}
          className={styles.card}
        >
          <LqText variant="xs" color="accent" weight="semibold">
            {category}
          </LqText>
          <LqText as="h3" variant="h4">
            {title}
          </LqText>
          <LqText variant="small" color="secondary" className={styles.reason}>
            {reason}
          </LqText>
          <LqText variant="xs" color="muted">
            {document.metadata?.source}
          </LqText>
          <Button
            variant="glass"
            size="sm"
            onClick={() => onOpen(document)}
            aria-label={`Open ${title}`}
          >
            Open document →
          </Button>
        </Surface>
      ))}
    </Carousel>
  );
}
