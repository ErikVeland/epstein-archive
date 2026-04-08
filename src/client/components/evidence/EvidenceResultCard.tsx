import { User, FileText, Calendar, AlertTriangle } from 'lucide-react';
import { Person } from '../../types';
import { RedFlagIndex } from '../visualizations/RedFlagIndex';
import { AddToInvestigationButton } from '../common/AddToInvestigationButton';
import { Surface } from '../../design-system/components/surfaces/Surface';
import { Box } from '../../design-system/components/layout/Box';
import { Flex } from '../../design-system/components/layout/Flex';
import { LqText } from '../../design-system/components/typography/Text';
import styles from './EvidenceResultCard.module.css';

interface SearchResult {
  person: Person;
  matchingContexts: Person['contexts'];
  matchingPassages: NonNullable<Person['significantPassages']>;
  score: number;
}

interface EvidenceResultCardProps {
  result: SearchResult;
  onPersonClick: (person: Person) => void;
}

function getLikelihoodClass(score: string | undefined): string {
  if (score === 'HIGH') return styles.likelihoodHigh;
  if (score === 'MEDIUM') return styles.likelihoodMedium;
  return styles.likelihoodLow;
}

export function EvidenceResultCard({ result, onPersonClick }: EvidenceResultCardProps) {
  return (
    <Surface variant="glass" className={styles.card}>
      {/* Person Header */}
      <Box className={styles.personHeader}>
        <button
          onClick={() => onPersonClick(result.person)}
          className={styles.nameButton}
          title="Click to view full profile"
        >
          <LqText variant="h3" weight="bold" className={styles.personName}>
            {result.person.name}
          </LqText>
        </button>

        <Flex direction="column" justify="between" gap={8} className={styles.flexRowMd}>
          <Flex align="center" gap={8} className={styles.flexWrap}>
            <User size={16} className={styles.userIconDesktop} />
            <Box
              className={`${styles.likelihoodBadge} ${getLikelihoodClass(result.person.likelihoodScore)}`}
            >
              <LqText variant="xs" weight="bold">
                {result.person.likelihoodScore}
              </LqText>
            </Box>
            {result.person.redFlagRating !== undefined && (
              <RedFlagIndex
                value={result.person.redFlagRating}
                size="sm"
                variant="combined"
                showTextLabel={false}
              />
            )}
          </Flex>

          <Flex align="center" gap={12}>
            <Flex align="center" gap={4} className={styles.statsRow}>
              <LqText variant="xs" color="muted">
                {result.person.mentions?.toLocaleString()} mentions
              </LqText>
              <Box className={styles.dotDivider} />
              <LqText variant="xs" color="muted">
                {result.person.files} files
              </LqText>
            </Flex>
            <AddToInvestigationButton
              item={{
                id: result.person.id?.toString() || '',
                title: result.person.name,
                description: result.person.role || 'Person of interest',
                type: 'entity',
                sourceId: result.person.id?.toString() || '',
              }}
              variant="quick"
              className={styles.addButtonHover}
            />
          </Flex>
        </Flex>
      </Box>

      {/* Evidence Types */}
      <Box className={styles.evidenceTypesSection}>
        <Flex gap={8} className={styles.flexWrap}>
          {result.person.evidenceTypes.map((type, i) => (
            <Box key={i} className={styles.evidenceTypeTag}>
              {type.replace('_', ' ')}
            </Box>
          ))}
        </Flex>
      </Box>

      {/* Matching Contexts */}
      {result.matchingContexts.length > 0 && (
        <Box className={styles.contextsSection}>
          <Flex align="center" gap={8} className={styles.contextsSectionHeader}>
            <FileText size={14} className={styles.sectionIcon} />
            <LqText variant="small" weight="bold" color="muted">
              CONTEXTS ({result.matchingContexts.length})
            </LqText>
          </Flex>

          <Box className={styles.contextsList}>
            {result.matchingContexts.map((context, i) => (
              <Surface key={i} variant="glass" className={styles.contextItem}>
                <LqText variant="small" color="primary" className={styles.contextQuote}>
                  &quot;{context.context}&quot;
                </LqText>
                <Flex align="center" gap={8} className={styles.contextMeta}>
                  <FileText size={12} className={styles.shrink0} />
                  <LqText variant="xs" className={styles.filenameTruncate}>
                    {context.file}
                  </LqText>
                  {context.date !== 'Unknown' && (
                    <>
                      <Box className={styles.contextMetaDot} />
                      <Calendar size={12} />
                      <LqText variant="xs">{context.date}</LqText>
                    </>
                  )}
                </Flex>
              </Surface>
            ))}
          </Box>
        </Box>
      )}

      {/* Matching Red Flag Passages */}
      {result.matchingPassages.length > 0 && (
        <Box className={styles.passagesSection}>
          <Flex align="center" gap={8} className={styles.passagesSectionHeader}>
            <AlertTriangle size={14} className={styles.passagesIcon} />
            <LqText variant="small" weight="bold" className={styles.passagesSectionTitle}>
              KEY PASSAGES ({result.matchingPassages.length})
            </LqText>
          </Flex>

          <Box className={styles.passagesList}>
            {result.matchingPassages.map((passage, i) => (
              <Surface key={i} variant="glass" className={styles.passageItem}>
                <LqText variant="small" className={styles.passageQuote}>
                  &quot;{passage.passage}&quot;
                </LqText>
                <Flex align="center" gap={8}>
                  <Box className={styles.passageKeyword}>{passage.keyword}</Box>
                  <Box className={styles.passageDot} />
                  <LqText variant="xs" className={styles.passageFilename}>
                    {passage.filename}
                  </LqText>
                </Flex>
              </Surface>
            ))}
          </Box>
        </Box>
      )}
    </Surface>
  );
}
