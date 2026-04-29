import React from 'react';
import { MediaAndArticlesTab } from '@client/components/media/MediaAndArticlesTab';
import ScopedErrorBoundary from '@client/components/common/ScopedErrorBoundary';

export const MediaPage: React.FC = () => {
  return (
    <ScopedErrorBoundary>
      <MediaAndArticlesTab />
    </ScopedErrorBoundary>
  );
};
