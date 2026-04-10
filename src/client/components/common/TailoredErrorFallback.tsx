import React from 'react';
import { AlertTriangle, WifiOff, Database, FileText, RefreshCw, Home } from 'lucide-react';
import { Surface, Stack, Flex, LqText, Button } from '../../design-system/lib';

interface TailoredErrorFallbackProps {
  errorType: 'network' | 'database' | 'document' | 'generic';
  onRetry?: () => void;
  onGoHome?: () => void;
}

export const TailoredErrorFallback: React.FC<TailoredErrorFallbackProps> = ({
  errorType,
  onRetry,
  onGoHome,
}) => {
  const getErrorDetails = () => {
    switch (errorType) {
      case 'network':
        return {
          icon: <WifiOff size={32} color="var(--accent-warning)" />,
          title: 'Network Connection Lost',
          message: 'Unable to connect to the server. Please check your internet connection.',
          nextSteps: 'Verify your network connection and try again.',
          showRetry: true,
          showHome: true,
        };
      case 'database':
        return {
          icon: <Database size={32} color="var(--accent-danger)" />,
          title: 'Database Unavailable',
          message: 'The database is temporarily unavailable. Our team has been notified.',
          nextSteps: 'Please try again in a few minutes.',
          showRetry: true,
          showHome: true,
        };
      case 'document':
        return {
          icon: <FileText size={32} color="var(--accent)" />,
          title: 'Document Not Found',
          message: 'The requested document could not be found or is unavailable.',
          nextSteps: 'Try selecting a different document or check back later.',
          showRetry: false,
          showHome: true,
        };
      default:
        return {
          icon: <AlertTriangle size={32} color="var(--accent-warning)" />,
          title: 'Something Went Wrong',
          message: 'An unexpected error occurred while loading this content.',
          nextSteps: 'Please try again or return to the home page.',
          showRetry: true,
          showHome: true,
        };
    }
  };

  const { icon, title, message, nextSteps, showRetry, showHome } = getErrorDetails();

  return (
    <Surface variant="glass-strong" p="xl" style={{ maxWidth: '42rem', margin: '2rem auto' }}>
      <Stack gap="xl">
        <Flex align="center" gap="lg">
          <Surface variant="glass-highlight" p="md" style={{ borderRadius: '50%' }}>
            {icon}
          </Surface>
          <Stack gap="xs">
            <LqText variant="h3" weight="bold">
              {title}
            </LqText>
            <LqText variant="small" color="secondary">
              SYSTEM_FAULT_DETECTED
            </LqText>
          </Stack>
        </Flex>

        <Stack gap="md">
          <LqText variant="subtitle" color="foreground">
            {message}
          </LqText>
          <LqText variant="small" color="muted" italic>
            {nextSteps}
          </LqText>
        </Stack>

        <Flex gap="md">
          {showRetry && onRetry && (
            <Button onClick={onRetry} variant="glass" leftIcon={<RefreshCw size={16} />}>
              Try Again
            </Button>
          )}

          {showHome && onGoHome && (
            <Button onClick={onGoHome} variant="primary" leftIcon={<Home size={16} />}>
              Home
            </Button>
          )}
        </Flex>
      </Stack>
    </Surface>
  );
};
