import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Image as ImageIcon } from 'lucide-react';
import { apiClient } from '../../../services/apiClient';
import { MediaImage } from '../../../types/media.types';
import LazyImage from '../../common/LazyImage';
import { SensitiveContent } from '../../common/SensitiveContent';
import { Surface, Flex, Box, Stack, LqText } from '../../../design-system/lib';
import styles from './DocumentAssetsTab.module.css';

interface Props {
  documentId: string | number;
  onImageClick?: (image: MediaImage) => void;
}

export const DocumentAssetsTab: React.FC<Props> = ({ documentId, onImageClick }) => {
  const { data: assets = [], isLoading } = useQuery({
    queryKey: ['documentAssets', documentId],
    queryFn: () => apiClient.getMediaByDocumentId(documentId),
    staleTime: 60_000,
  });

  if (isLoading) {
    return (
      <Flex align="center" justify="center" className={styles.loadingState}>
        <div className={styles.spinner} />
        <LqText variant="small" color="muted">
          Loading extracted assets...
        </LqText>
      </Flex>
    );
  }

  if (assets.length === 0) {
    return (
      <Flex direction="column" align="center" justify="center" className={styles.emptyState}>
        <Box className={styles.iconBox}>
          <ImageIcon size={48} className={styles.mutedIcon} />
        </Box>
        <LqText variant="h3" weight="bold">
          No Extracted Assets
        </LqText>
        <LqText variant="body" color="muted" align="center" className={styles.emptyBody}>
          No photographic or visual assets were detected in this document during the extraction
          pass.
        </LqText>
      </Flex>
    );
  }

  return (
    <Box className={styles.container}>
      <Flex justify="between" align="center" className={styles.header}>
        <Stack gap="none">
          <LqText variant="h3" weight="bold">
            Extracted Assets
          </LqText>
          <LqText variant="xs" color="muted">
            {assets.length} forensic item{assets.length !== 1 ? 's' : ''} recovered from this
            document
          </LqText>
        </Stack>
      </Flex>

      <div className={styles.grid}>
        {assets.map((asset) => (
          <Surface
            key={asset.id}
            variant="glass-strong"
            className={styles.card}
            onClick={() => onImageClick?.(asset)}
          >
            <SensitiveContent isSensitive={asset.isSensitive} className={styles.mediaFrame}>
              <LazyImage
                src={`/api/media/images/${asset.id}/thumbnail`}
                alt={asset.title || 'Extracted asset'}
                className={styles.image}
              />
            </SensitiveContent>

            <Box className={styles.cardContent}>
              <Stack gap="xs">
                <LqText variant="xs" weight="bold" className={styles.assetTitle}>
                  {asset.title || asset.filename}
                </LqText>
                <Flex justify="between" align="center">
                  <LqText variant="xxs" color="muted">
                    {asset.width} × {asset.height}
                  </LqText>
                  {asset.metadata?.is_text_only === 'true' && (
                    <Surface variant="glass-highlight" className={styles.textBadge}>
                      <LqText variant="xxxs" weight="bold">
                        DOCUMENT EXTRACT
                      </LqText>
                    </Surface>
                  )}
                </Flex>
              </Stack>
            </Box>
          </Surface>
        ))}
      </div>
    </Box>
  );
};
