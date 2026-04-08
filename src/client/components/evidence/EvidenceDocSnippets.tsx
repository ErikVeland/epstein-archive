// NOTE: dangerouslySetInnerHTML is used here intentionally and safely — all HTML is
// sanitized via DOMPurify before rendering (only <mark> tags with class attr are allowed).
import DOMPurify from 'isomorphic-dompurify';
import { FileText, Info, File } from 'lucide-react';
import { Surface } from '../../design-system/components/surfaces/Surface';
import { Box } from '../../design-system/components/layout/Box';
import { Flex } from '../../design-system/components/layout/Flex';
import { LqText } from '../../design-system/components/typography/Text';
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

function getRiskBadgeClass(rating: number): string {
  if (rating >= 4) return styles.riskBadgeHigh;
  if (rating >= 2) return styles.riskBadgeMedium;
  return styles.riskBadgeLow;
}

export function EvidenceDocSnippets({ snippets, searchTerm }: EvidenceDocSnippetsProps) {
  if (snippets.length === 0) {
    return null;
  }

  return (
    <Surface variant="glass" className={styles.container}>
      <Box className={styles.header}>
        <Flex align="center" gap={8}>
          <FileText size={18} className="text-[var(--accent)]" />
          <LqText variant="h3" weight="bold">
            Matched Documents
          </LqText>
          <LqText variant="small" color="muted" className={styles.countLabel}>
            ({snippets.length})
          </LqText>
        </Flex>
      </Box>

      <Box className={styles.body}>
        <Flex align="start" gap={8} className={styles.infoRow}>
          <Info size={14} className={styles.infoIcon} />
          <LqText variant="xs">Documents containing &quot;{searchTerm}&quot;</LqText>
        </Flex>

        {snippets.map((d) => (
          <Surface key={d.id} variant="glass" className={styles.docCard}>
            <Flex justify="between" align="start" className={styles.docCardHeader}>
              <LqText variant="small" weight="bold" color="accent" className={styles.docTitle}>
                {d.title}
              </LqText>
              <Box className={`${styles.riskBadge} ${getRiskBadgeClass(d.redFlagRating)}`}>
                RISK: {d.redFlagRating}
              </Box>
            </Flex>

            {d.snippet && (
              <Box
                className={styles.snippet}
                dangerouslySetInnerHTML={{
                  __html: DOMPurify.sanitize(d.snippet, {
                    ALLOWED_TAGS: ['mark'],
                    ALLOWED_ATTR: ['class'],
                  }),
                }}
              />
            )}

            <Flex align="center" gap={12} className={styles.docMeta}>
              <Flex align="center" gap={6}>
                <File size={12} />
                <LqText variant="xs" weight="medium">
                  {(d.title || '').split('.').pop()?.toUpperCase() || 'FILE'}
                </LqText>
              </Flex>
            </Flex>
          </Surface>
        ))}
      </Box>
    </Surface>
  );
}
