import React from 'react';
import { Card } from '../common/Card';
import { AddToInvestigationButton } from '../common/AddToInvestigationButton';
import { IconName } from '../common/Icon';

interface MediaItem {
  id: string;
  title: string;
  thumbnail?: string;
  fileType: string;
  fileSize: string;
  linkedEntities: number;
  linkedDocument?: string;
}

interface MediaCardProps {
  media: MediaItem;
  onClick: () => void;
}

export const MediaCard: React.FC<MediaCardProps> = ({ media, onClick }) => {
  const metadata: { label: string; value: string | number; icon: IconName }[] = [
    { label: 'Linked Entities', value: media.linkedEntities, icon: 'Link' },
  ];

  if (media.linkedDocument) {
    metadata.push({ label: 'Document', value: media.linkedDocument, icon: 'FileText' });
  }

  const actionButtons = [
    {
      label: 'View in Timeline',
      onClick: () => console.log('View in timeline clicked for:', media.title),
      variant: 'secondary' as const,
    },
  ];

  return (
    <Card
      onClick={onClick}
      title={media.title}
      subtitle={`${media.fileType} • ${media.fileSize}`}
      icon={media.thumbnail ? undefined : 'Image'}
      iconColor="primary"
      redFlagRating={media.linkedEntities}
      metadata={metadata}
      actionButtons={actionButtons}
      className="group"
    >
      <div className="flex justify-end">
        <AddToInvestigationButton
          item={{
            id: media.id,
            title: media.title,
            description: `${media.fileType} media file`,
            type: 'evidence',
            sourceId: media.id,
          }}
          variant="quick"
          className="text-xs px-[var(--space-2)] py-[var(--space-1)]"
        />
      </div>
    </Card>
  );
};
