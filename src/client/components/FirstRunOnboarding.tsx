import React from 'react';
import Icon from '@client/components/common/Icon';
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  Flex,
  LqText,
  Stack,
  Surface,
} from '@client/design-system/lib';

interface FirstRunOnboardingProps {
  onComplete: () => void;
  onSkip: () => void;
}

const STARTING_POINTS = [
  {
    icon: 'Search' as const,
    title: 'Search the archive',
    description: 'Find people, documents, dates, and source records.',
  },
  {
    icon: 'FileText' as const,
    title: 'Check the source',
    description: 'Open the original record before you draw a conclusion.',
  },
  {
    icon: 'Target' as const,
    title: 'Build a public case',
    description: 'Investigators can collect evidence and test a focused question.',
  },
];

export const FirstRunOnboarding: React.FC<FirstRunOnboardingProps> = ({ onComplete, onSkip }) => (
  <Dialog
    open
    onOpenChange={(open) => {
      if (!open) onSkip();
    }}
  >
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Welcome to the Epstein Archive</DialogTitle>
        <DialogDescription>
          Search public records, verify the source, and organize findings without losing context.
        </DialogDescription>
      </DialogHeader>
      <Stack gap="sm">
        {STARTING_POINTS.map((item) => (
          <Surface key={item.title} variant="glass-highlight" p="md">
            <Flex gap="md" align="start">
              <Icon name={item.icon} size="md" aria-hidden="true" />
              <Stack gap="xs">
                <LqText variant="body" weight="bold">
                  {item.title}
                </LqText>
                <LqText variant="small" color="muted">
                  {item.description}
                </LqText>
              </Stack>
            </Flex>
          </Surface>
        ))}
      </Stack>
      <Flex justify="end" gap="sm" wrap="wrap">
        <Button variant="ghost" onClick={onSkip}>
          Not now
        </Button>
        <Button variant="primary" onClick={onComplete} autoFocus>
          Explore the archive
        </Button>
      </Flex>
    </DialogContent>
  </Dialog>
);
