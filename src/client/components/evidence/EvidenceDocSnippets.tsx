import React from 'react';
import DOMPurify from 'isomorphic-dompurify';
import { FileText, File } from 'lucide-react';
import { Surface, Flex, Box, Stack, LqText, Badge } from '../../design-system/lib';
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
}

export const EvidenceDocSnippets: React.FC<EvidenceDocSnippetsProps> = ({
  snippets,
  searchTerm,
}) => {
  if (snippets.length === 0) return null;

  return (
    <Surface variant="glass" className={styles.container}>
      <Stack gap="xl">
        <Flex justify="between" align="center">
          <Flex align="center" gap="md">
            <Box className={styles.headerIcon}>
              <FileText size={20} />
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
                    <LqText
                      variant="small"
                      weight="bold"
                      color="accent"
                      className={styles.docTitle}
                    >
                      {doc.title}
                    </LqText>
                    <Flex align="center" gap="xs">
                      <File size={12} className={styles.iconMuted} />
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
