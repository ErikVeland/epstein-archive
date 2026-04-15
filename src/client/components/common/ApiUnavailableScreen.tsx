import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { Button, Flex, LqText, Stack, Surface } from '../../design-system/lib';
import { useApiStatus } from '../../contexts/ApiStatusContext';
import styles from './ApiUnavailableScreen.module.css';

export const ApiUnavailableScreen: React.FC = () => {
  const { status, errorMessage, lastCheckedAt, recheck } = useApiStatus();
  const apiUrl = (import.meta as any).env?.VITE_API_URL || 'http://localhost:3012/api';
  const isDev = Boolean((import.meta as any).env?.DEV);

  return (
    <Surface variant="panel" p="xl">
      <Stack gap="lg">
        <Flex align="center" gap="md">
          <Surface variant="glass-highlight" p="md" className={styles.iconBubble}>
            <AlertTriangle size={18} />
          </Surface>
          <Stack gap="xs">
            <LqText variant="h3" weight="bold">
              API not available
            </LqText>
            <LqText variant="small" color="muted">
              This section needs the backend API to be running.
            </LqText>
          </Stack>
        </Flex>

        <Stack gap="sm">
          {isDev ? (
            <>
              <LqText variant="small" color="secondary">
                Status: {status}
              </LqText>
              <LqText variant="small" color="muted">
                Expected API base URL: <code>{apiUrl}</code>
              </LqText>
            </>
          ) : null}
          {errorMessage ? (
            <LqText variant="small" color="muted">
              {errorMessage}
            </LqText>
          ) : null}
          {isDev && lastCheckedAt ? (
            <LqText variant="xs" color="muted">
              Last checked: {new Date(lastCheckedAt).toLocaleTimeString()}
            </LqText>
          ) : null}
        </Stack>

        <Flex gap="md" wrap="wrap">
          <Button
            variant="primary"
            onClick={async () => {
              await recheck();
            }}
          >
            Retry connection
          </Button>
          <Button
            variant="glass"
            onClick={() => {
              window.open('/api/health/ready', '_blank', 'noopener,noreferrer');
            }}
          >
            Open /api/health/ready
          </Button>
        </Flex>

        {isDev ? (
          <Stack gap="xs">
            <LqText variant="xs" color="muted">
              Dev quickstart:
            </LqText>
            <LqText variant="xs" color="muted">
              1) <code>pnpm server</code> (API) &nbsp; 2) <code>pnpm dev:clean</code> (UI, clears
              Vite optimize cache)
            </LqText>
          </Stack>
        ) : null}
      </Stack>
    </Surface>
  );
};
