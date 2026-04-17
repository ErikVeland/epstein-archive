import React, { useState, useEffect, useCallback } from 'react';
import {
  Cpu,
  Search,
  ArrowUpRight,
  Trash2,
  ExternalLink,
  ShieldAlert,
  Plane,
  Camera,
  User,
  Zap,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { apiClient } from '../../services/apiClient';
import { InvestigationLead } from '../../types/investigation';
import { useToasts } from '../common/useToasts';

// UI Library
import { Box, Button, Flex, LqText, Stack } from '../../design-system/lib';

import styles from './AgenticDiscoveryBoard.module.css';

interface AgenticDiscoveryBoardProps {
  investigationId: string;
}

export const AgenticDiscoveryBoard: React.FC<AgenticDiscoveryBoardProps> = ({
  investigationId,
}) => {
  const [leads, setLeads] = useState<InvestigationLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { addToast } = useToasts();

  const loadLeads = useCallback(
    async (isSilent = false) => {
      if (!isSilent) setLoading(true);
      else setRefreshing(true);

      try {
        const data = await apiClient.get<InvestigationLead[]>(
          `/investigations/${investigationId}/leads`,
        );
        // Focus on agentic discoveries first
        const sorted = data.sort((a, b) => (b.riskScore || 0) - (a.riskScore || 0));
        setLeads(sorted);
      } catch {
        addToast({ text: 'Neural sync failed', type: 'error' });
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [investigationId, addToast],
  );

  useEffect(() => {
    void loadLeads();
  }, [loadLeads]);

  const handlePromote = async (lead: InvestigationLead) => {
    try {
      await apiClient.patch(`/investigations/${investigationId}/leads/${lead.id}`, {
        status: 'pursued',
        priority: 'critical',
      });
      addToast({ text: 'Signal promoted to Operation Lead', type: 'success' });
      void loadLeads(true);
    } catch {
      addToast({ text: 'Promotion failed', type: 'error' });
    }
  };

  const getSignalIcon = (type?: string | null) => {
    const t = (type || '').toLowerCase();
    if (t.includes('travel') || t.includes('flight')) return <Plane size={18} />;
    if (t.includes('presence')) return <Camera size={18} />;
    if (t.includes('identity')) return <User size={18} />;
    return <Zap size={18} />;
  };

  if (loading) {
    return (
      <Flex
        align="center"
        justify="center"
        direction="column"
        gap="md"
        style={{ height: '100%', width: '100%' }}
      >
        <Loader2 className="animate-spin text-accent" size={48} />
        <LqText variant="xs" color="muted" weight="black" className="tracking-widest uppercase">
          Neural Grid Initializing...
        </LqText>
      </Flex>
    );
  }

  return (
    <Box className={styles.root}>
      <header className={styles.header}>
        <div className={styles.headerTitleBox}>
          <Flex align="center" gap="sm">
            <Cpu size={24} className="text-accent" />
            <LqText variant="bombastic" className={styles.bombasticTitle}>
              Discovery Intelligence
            </LqText>
          </Flex>
          <LqText variant="xs" color="muted" weight="bold" className="tracking-wide">
            Autonomic Relational Graph • {leads.length} Active Signals Identified
          </LqText>
        </div>

        <Flex gap="md">
          <Button variant="glass" size="sm" onClick={() => loadLeads(true)} disabled={refreshing}>
            <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
            {refreshing ? 'Scanning...' : 'Sync Graph'}
          </Button>
          <Button variant="accent-solid" size="sm">
            <ArrowUpRight size={14} /> Intelligence Log
          </Button>
        </Flex>
      </header>

      {leads.length === 0 ? (
        <div className={styles.emptyState}>
          <Search size={80} className={`${styles.pulseIcon}`} />
          <LqText variant="h2" weight="bold">
            Monitoring Neural Stream
          </LqText>
          <LqText variant="xs" color="muted" align="center" style={{ maxWidth: 400 }}>
            The Forensic Agent is currently scanning the RELATIONAL GRAPH. New leads will manifest
            here as autonomous detections reach high-confidence thresholds.
          </LqText>
        </div>
      ) : (
        <div className={styles.discoveryGrid}>
          <AnimatePresence>
            {leads.map((lead) => (
              <motion.div
                key={lead.id}
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className={`${styles.signalCard} ${
                  lead.riskScore && lead.riskScore > 0.85 ? styles.liquidFire : ''
                }`}
              >
                <div className={styles.cardHeader}>
                  <div className={styles.signalTypeBox}>
                    <div className="text-accent">{getSignalIcon(lead.signalType)}</div>
                    <Stack gap="none">
                      <LqText
                        variant="xs"
                        weight="black"
                        color="primary"
                        className="uppercase tracking-wide"
                      >
                        {lead.signalType || 'Manual Lead'}
                      </LqText>
                      <LqText variant="tiny" color="muted">
                        Identified {new Date(lead.createdAt).toLocaleDateString()}
                      </LqText>
                    </Stack>
                  </div>

                  <div className={styles.riskIndicator}>
                    {lead.riskScore && (
                      <div
                        className={`${styles.riskBadge} ${
                          lead.riskScore > 0.85 ? styles.riskCritical : ''
                        }`}
                      >
                        <ShieldAlert size={10} style={{ marginRight: 4 }} />
                        Risk: {Math.round(lead.riskScore * 100)}%
                      </div>
                    )}
                    <LqText variant="tiny" color="muted">
                      Conf. {Math.round((lead.confidence || 0.5) * 100)}%
                    </LqText>
                  </div>
                </div>

                <div className={styles.cardBody}>
                  <LqText variant="body" weight="bold" color="primary">
                    {lead.title}
                  </LqText>
                  <div className={styles.description}>{lead.description}</div>

                  <div className={styles.entitiesBox}>
                    {lead.entityNames?.map((name, i) => (
                      <div key={i} className={styles.entityTag}>
                        {name}
                      </div>
                    ))}
                  </div>
                </div>

                <div className={styles.cardFooter}>
                  <div className={styles.confidenceBox}>
                    <div className={styles.gauge}>
                      <div
                        className={styles.gaugeFill}
                        style={{ width: `${(lead.confidence || 0.5) * 100}%` }}
                      />
                    </div>
                    <LqText variant="tiny" color="muted" weight="bold">
                      Neural Match
                    </LqText>
                  </div>

                  <Flex gap="sm">
                    <Button variant="ghost" size="xs">
                      <ExternalLink size={12} />
                    </Button>
                    <Button variant="ghost" size="xs">
                      <Trash2 size={12} />
                    </Button>
                    <Button
                      variant="glass-highlight"
                      size="xs"
                      onClick={() => handlePromote(lead)}
                      disabled={lead.status === 'pursued'}
                    >
                      {lead.status === 'pursued' ? 'Promoted' : 'Promote'}
                    </Button>
                  </Flex>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </Box>
  );
};
