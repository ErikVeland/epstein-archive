import React from 'react';
import DOMPurify from 'isomorphic-dompurify';
import Icon from '@client/components/common/Icon';
import { Surface, Flex, Box, Stack, LqText, Badge, Button } from '@client/design-system/lib';
import styles from './EvidenceDocSnippets.module.css';

interface DocSnippet {
  id: number;
  title: string;
  redFlagRating: number;
  snippet?: string;
}

interface EvidenceDocSnippetsProps {
  snippets: DocSnippet[];
  searchTerm: string;
  onDocumentClick?: (documentId: string) => void;
}

export const EvidenceDocSnippets: React.FC<EvidenceDocSnippetsProps> = ({
  snippets,
  searchTerm,
  onDocumentClick,
}) => {
  if (snippets.length === 0) return null;

  return (
    <Surface variant="glass" className={styles.container}>
      <Stack gap="xl">
        <Flex justify="between" align="center">
          <Flex align="center" gap="md">
            <Box className={styles.headerIcon}>
              <Icon name="FileText" size="md" />
            </Box>
            <Stack gap="0">
              <LqText variant="h3" weight="bold">
                Matched Documents
              </LqText>
              <LqText variant="xs" color="muted">
                {snippets.length} correlated sources containing &quot;{searchTerm}&quot;
              </LqText>
            </Stack>
          </Flex>
          <Badge tone="accent">{snippets.length} Results</Badge>
        </Flex>

        <Stack gap="md">
          {snippets.map((doc) => (
            <Surface key={doc.id} variant="panel" p="md" className={styles.docCard}>
              <Stack gap="md">
                <Flex justify="between" align="start">
                  <Stack gap="none">
                    <Button
                      variant="ghost"
                      unstyled
                      className={styles.titleButton}
                      onClick={() => onDocumentClick?.(String(doc.id))}
                    >
                      <LqText
                        variant="small"
                        weight="bold"
                        color="accent"
                        className={styles.docTitle}
                      >
                        {doc.title}
                      </LqText>
                    </Button>
                    <Flex align="center" gap="xs">
                      <Icon name="File" size="xs" className={styles.iconMuted} />
                      <LqText variant="xs" color="muted">
                        {(doc.title || '').split('.').pop()?.toUpperCase() || 'FILE'}
                      </LqText>
                    </Flex>
                  </Stack>
                  <Badge
                    tone={
                      doc.redFlagRating >= 4
                        ? 'accent'
                        : doc.redFlagRating >= 2
                          ? 'success'
                          : 'neutral'
                    }
                  >
                    RISK INDEX: {doc.redFlagRating}
                  </Badge>
                </Flex>

                {doc.snippet && (
                  <Box className={styles.snippetWrapper}>
                    <LqText
                      variant="xs"
                      color="secondary"
                      className={styles.snippet}
                      dangerouslySetInnerHTML={{
                        __html: DOMPurify.sanitize(doc.snippet, {
                          ALLOWED_TAGS: ['mark'],
                          ALLOWED_ATTR: ['class'],
                        }),
                      }}
                    />
                  </Box>
                )}
              </Stack>
            </Surface>
          ))}
        </Stack>
      </Stack>
    </Surface>
  );
};
