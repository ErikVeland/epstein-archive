import React from 'react';
import { Shield, Network, Eye, AlertTriangle } from 'lucide-react';
import styles from './SignalAnalysis.module.css';

interface SignalAnalysisProps {
  description: string;
  rating: number;
}

export const SignalAnalysis: React.FC<SignalAnalysisProps> = ({ description, rating }) => {
  // Parse the signal string: "Signal Analysis: High exposure (7727 mentions); Direct network link to high-risk figures (12 connections); Associated visual evidence (4 items)."
  const parseSignals = () => {
    const signals = {
      exposure: {
        value: 0,
        label: 'Exposure',
        icon: Eye,
        color: styles.accent,
        barColor: styles.fillAccent,
      },
      network: {
        value: 0,
        label: 'Network',
        icon: Network,
        color: styles.accentSecondary,
        barColor: styles.fillAccentSecondary,
      },
      evidence: {
        value: 0,
        label: 'Evidence',
        icon: Shield,
        color: styles.accent,
        barColor: styles.fillAccent,
      },
      risk: {
        value: rating * 20,
        label: 'Risk Index',
        icon: AlertTriangle,
        color: styles.danger,
        barColor: styles.fillDanger,
      },
    };

    // Extract mentions
    const mentionsMatch = description.match(/(\d+)\s+mentions/);
    if (mentionsMatch) {
      const mentions = parseInt(mentionsMatch[1]);
      signals.exposure.value = Math.min(100, (Math.log10(mentions + 1) / 5) * 100);
    }

    // Extract connections
    const connectionsMatch = description.match(/(\d+)\s+connections/);
    if (connectionsMatch) {
      const per = parseInt(connectionsMatch[1]);
      signals.network.value = Math.min(100, (per / 20) * 100);
    }

    // Extract items (media)
    const itemsMatch = description.match(/(\d+)\s+items/);
    if (itemsMatch) {
      const items = parseInt(itemsMatch[1]);
      signals.evidence.value = Math.min(100, (items / 10) * 100);
    }

    return Object.values(signals);
  };

  const signals = parseSignals();

  return (
    <div className={styles.root}>
      <div className={styles.header}>
        <h3 className={styles.title}>
          <Activity className={styles.titleIcon} />
          Forensic Signal Analysis
        </h3>
        <div className={styles.rating}>
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className={`${styles.ratingBar} ${i < rating ? styles.ratingBarActive : ''}`}
            />
          ))}
        </div>
      </div>

      <div className={styles.signals}>
        {signals.map((signal, i) => (
          <div key={i} className={styles.signal}>
            <div className={styles.signalRow}>
              <div className={`${styles.signalLabel} ${signal.color}`}>
                <signal.icon className={styles.signalIcon} />
                {signal.label}
              </div>
              <span className={styles.signalValue}>{Math.round(signal.value)}%</span>
            </div>
            <div className={styles.track}>
              <div
                className={`${styles.fill} ${signal.barColor}`}
                style={{ width: `${signal.value}%` }}
              />
            </div>
          </div>
        ))}
      </div>

      <div className={styles.footer}>
        <p className={styles.description}>
          &ldquo;{description.replace('Signal Analysis: ', '')}&rdquo;
        </p>
      </div>
    </div>
  );
};

const Activity = ({ className }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
  </svg>
);
