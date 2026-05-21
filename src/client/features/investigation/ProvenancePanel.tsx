import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Icon from '@client/components/common/Icon';
import { Stack, Flex, Text, Box, cn } from '@client/design-system/lib';
import styles from './ProvenancePanel.module.css';

interface ProvenanceSignal {
  id: string;
  type: string;
  confidence: number;
  riskScore: number;
  description: string;
  sourceType: 'document' | 'flight' | 'media' | 'manual';
  evidenceSnippet?: string;
  timestamp: string;
}

interface ProvenancePanelProps {
  entityName: string;
  totalRisk: number;
  signals: ProvenanceSignal[];
}

export const ProvenancePanel: React.FC<ProvenancePanelProps> = ({
  entityName,
  totalRisk,
  signals,
}) => {
  const sortedSignals = [...signals].sort((a, b) => b.riskScore - a.riskScore);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      className={styles.root}
    >
      <Box className={styles.header}>
        <Flex align="center" justify="between">
          <Flex align="center" gap="sm">
            <Icon name="Shield" size="sm" className={styles.textAccent} />
            <Text
              variant="xs"
              weight="black"
              color="accent"
              className="text-uppercase tracking-widest"
            >
              Forensic Provenance
            </Text>
          </Flex>
          <div
            className={cn(
              styles.scoreBadge,
              totalRisk > 0.7 ? styles.scoreHigh : styles.scoreMedium,
            )}
          >
            Risk Index: {Math.round(totalRisk * 100)}
          </div>
        </Flex>
        <Text variant="h3" weight="bold" color="primary" mt="xs">
          {entityName}
        </Text>
      </Box>

      <Stack gap="md" py="sm">
        <AnimatePresence>
          {sortedSignals.map((signal, idx) => (
            <motion.div
              key={signal.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.05 }}
              className={styles.item}
            >
              <div className={styles.connector} />
              <Flex align="center" justify="between">
                <Flex align="center" gap="xs">
                  {signal.sourceType === 'document' ? (
                    <Icon name="FileText" size="xs" className="text-muted" />
                  ) : null}
                  {signal.sourceType === 'flight' && (
                    <Icon name="Activity" size="xs" className="text-muted" />
                  )}
                  {signal.sourceType === 'media' && (
                    <Icon name="User" size="xs" className="text-muted" />
                  )}
                  <Text variant="xs" weight="bold" color="primary">
                    {signal.type.replace(/_/g, ' ')}
                  </Text>
                </Flex>
                <Text variant="xxs" color="muted">
                  {Math.round(signal.confidence * 100)}% Conf.
                </Text>
              </Flex>

              <Text variant="xs" color="secondary" mt="xxs">
                {signal.description}
              </Text>

              {signal.evidenceSnippet && (
                <Box className={styles.evidenceSnippet}>
                  <Flex gap="xs" align="start">
                    <Icon name="CornerDownRight" size="xs" style={{ marginTop: '0.25rem' }} />
                    <span>{signal.evidenceSnippet}</span>
                  </Flex>
                </Box>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
      </Stack>

      {signals.length === 0 && (
        <Flex direction="column" align="center" justify="center" p="xl">
          <Text variant="xs" color="muted" italic>
            No forensic signals detected for this entity.
          </Text>
        </Flex>
      )}
    </motion.div>
  );
};
