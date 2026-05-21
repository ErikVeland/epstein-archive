import React from 'react';
import { MediaAndArticlesTab } from '@client/features/media/MediaAndArticlesTab';
import ScopedErrorBoundary from '@client/components/common/ScopedErrorBoundary';

export const MediaPage: React.FC = () => {
  return (
    <ScopedErrorBoundary>
      <MediaAndArticlesTab />
    </ScopedErrorBoundary>
  );
};
