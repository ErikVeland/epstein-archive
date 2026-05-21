import React from 'react';
import Icon from '@client/components/common/Icon';
import { ProvenanceBadge } from '@client/components/common/ProvenanceBadge';
import { Person } from '@client/types';
import { RedFlagIndex } from '@client/components/visualizations/RedFlagIndex';
import { AddToInvestigationButton } from '@client/components/common/AddToInvestigationButton';
import { Surface, Flex, Box, Stack, LqText, Button, Badge } from '@client/design-system/lib';
import styles from './EvidenceResultCard.module.css';

interface SearchResult {
  person: Person;
  matchingContexts: Person['contexts'];
  matchingPassages: NonNullable<Person['significantPassages']>;
  score: number;
}

interface EvidenceResultCardProps {
  result: SearchResult;
  onPersonClick: (person: Person, searchTerm: string) => void;
  onDocumentClick?: (documentId: string) => void;
  searchTerm?: string;
}

export const EvidenceResultCard: React.FC<EvidenceResultCardProps> = ({
  result,
  onPersonClick,
  onDocumentClick,
  searchTerm = '',
}) => {
  const parseDocumentId = (value: unknown): number | null => {
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value === 'string' && value.trim()) {
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : null;
    }
    return null;
  };

  const getLikelihoodTone = (score: string | undefined): 'accent' | 'success' | 'neutral' => {
    if (score === 'HIGH') return 'accent';
    if (score === 'MEDIUM') return 'success';
    return 'neutral';
  };

  return (
    <Surface variant="glass" className={styles.card}>
      <Stack gap="md">
        <Flex justify="between" align="start">
          <Stack gap="xs">
            <Button
              variant="ghost"
              onClick={() => onPersonClick(result.person, searchTerm)}
              className={styles.nameAction}
            >
              <LqText variant="h3" weight="bold">
                {result.person.name}
              </LqText>
            </Button>
            <LqText variant="xs" color="muted">
              {result.person.role || 'Uncategorized Entity'}
            </LqText>
          </Stack>

          <Flex align="center" gap="sm">
            <Badge tone={getLikelihoodTone(result.person.likelihoodScore)}>
              {result.person.likelihoodScore || 'LOW'}
            </Badge>
            {result.person.redFlagRating !== undefined && (
              <RedFlagIndex
                value={result.person.redFlagRating}
                size="sm"
                variant="combined"
                showTextLabel={false}
              />
            )}
          </Flex>
        </Flex>

        <Flex align="center" gap="md" className={styles.statsBar}>
          <ProvenanceBadge
            sourceDocumentId={result.person.sourceDocumentId}
            sourceHash={result.person.sourceHash}
            reviewState={result.person.reviewState}
            confidence={result.person.confidence}
            extractionMethod={result.person.extractionMethod}
            showLabel={false}
          />
          <Box className={styles.dot} />
          <Flex align="center" gap="xs">
            <Icon name="ShieldCheck" size="sm" className={styles.iconMuted} />
            <LqText variant="xs" color="muted">
              {result.person.mentions?.toLocaleString()} Mentions
            </LqText>
          </Flex>
          <Box className={styles.dot} />
          <Flex align="center" gap="xs">
            <Icon name="FileText" size="sm" className={styles.iconMuted} />
            <LqText variant="xs" color="muted">
              {result.person.files} Files
            </LqText>
          </Flex>
          <Box style={{ flex: 1 }} />
          <AddToInvestigationButton
            item={{
              id: result.person.id?.toString() || '',
              title: result.person.name,
              description: result.person.role || 'Person of interest',
              type: 'entity',
              sourceId: result.person.id?.toString() || '',
            }}
            variant="quick"
          />
        </Flex>

        <Flex gap="xs" wrap="wrap">
          {result.person.evidenceTypes.map((type, i) => (
            <Surface key={i} variant="glass-highlight" className={styles.typeTag}>
              <LqText variant="xs" weight="bold">
                {type.replace('_', ' ')}
              </LqText>
            </Surface>
          ))}
        </Flex>

        {result.matchingContexts.length > 0 && (
          <Stack gap="sm" className={styles.section}>
            <Flex align="center" gap="sm">
              <Box className={styles.sectionIcon}>
                <Icon name="FileText" size="xs" />
              </Box>
              <LqText variant="xs" weight="bold" color="muted">
                Spatial Contexts ({result.matchingContexts.length})
              </LqText>
            </Flex>
            <Stack gap="xs">
              {result.matchingContexts.map((context, i) => (
                <Surface key={i} variant="panel" p="sm" className={styles.item}>
                  <LqText variant="xs" color="primary">
                    &quot;{context.context}&quot;
                  </LqText>
                  <Flex justify="between" align="center" mt="xs">
                    <Flex align="center" gap="xs">
                      <Icon name="FileText" size="xs" />
                      <Button
                        variant="ghost"
                        unstyled
                        className={styles.fileLink}
                        onClick={() => context.source && onDocumentClick?.(String(context.source))}
                      >
                        <LqText variant="xs" color="muted">
                          {context.file}
                        </LqText>
                      </Button>
                      <ProvenanceBadge
                        sourceDocumentId={parseDocumentId(context.source)}
                        reviewState="unreviewed"
                        showLabel={false}
                      />
                    </Flex>
                    {context.date !== 'Unknown' && (
                      <Flex align="center" gap="xs">
                        <Icon name="Calendar" size="xs" />
                        <LqText variant="xs" color="muted">
                          {context.date}
                        </LqText>
                      </Flex>
                    )}
                  </Flex>
                </Surface>
              ))}
            </Stack>
          </Stack>
        )}

        {result.matchingPassages.length > 0 && (
          <Stack gap="sm" className={styles.section}>
            <Flex align="center" gap="sm">
              <Box className={styles.sectionIconAccent}>
                <Icon name="AlertTriangle" size="xs" />
              </Box>
              <LqText variant="xs" weight="bold" color="muted">
                Culpability Passages ({result.matchingPassages.length})
              </LqText>
            </Flex>
            <Stack gap="xs">
              {result.matchingPassages.map((passage, i) => (
                <Surface key={i} variant="panel" p="sm" className={styles.item}>
                  <LqText variant="xs" color="secondary">
                    &quot;{passage.passage}&quot;
                  </LqText>
                  <Flex align="center" gap="sm" mt="xs">
                    <Badge tone="accent">{passage.keyword}</Badge>
                    <ProvenanceBadge
                      sourceDocumentId={parseDocumentId(passage.documentId)}
                      reviewState="unreviewed"
                      showLabel={false}
                    />
                    <Button
                      variant="ghost"
                      unstyled
                      className={styles.fileLink}
                      onClick={() =>
                        passage.documentId && onDocumentClick?.(String(passage.documentId))
                      }
                    >
                      <LqText variant="xs" color="muted">
                        {passage.filename}
                      </LqText>
                    </Button>
                  </Flex>
                </Surface>
              ))}
            </Stack>
          </Stack>
        )}
      </Stack>
    </Surface>
  );
};
