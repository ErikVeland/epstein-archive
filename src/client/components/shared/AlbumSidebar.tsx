import React from 'react';
import { Button, Flex, Box, LqText, Stack, Badge, cn } from '@client/design-system/lib';
import type { MediaAlbum } from '@client/hooks/useMediaBrowser';
import styles from './AlbumSidebar.module.css';

interface AlbumSidebarProps {
  albums: MediaAlbum[];
  selectedAlbum: number | null;
  onSelectAlbum: (albumId: number | null) => void;
  totalItemCount: number;
  allLabel: string;
}

export const AlbumSidebar: React.FC<AlbumSidebarProps> = ({
  albums,
  selectedAlbum,
  onSelectAlbum,
  totalItemCount,
  allLabel,
}) => {
  return (
    <Box className={styles.sidebar}>
      <Flex align="center" gap="sm" px="sm" className={styles.sidebarHeader}>
        <LqText variant="xs" weight="bold" color="muted" style={{ textTransform: 'uppercase' }}>
          Archive Tranches
        </LqText>
      </Flex>

      <Stack gap="xs" className={styles.sidebarList}>
        <Button
          variant={selectedAlbum === null ? 'glass-highlight' : 'ghost'}
          size="sm"
          onClick={() => onSelectAlbum(null)}
          className={cn(styles.albumBtn, selectedAlbum === null && styles.albumBtnActive)}
          title={allLabel}
        >
          <Flex justify="between" align="center" grow className={styles.albumRow}>
            <LqText
              variant="small"
              weight={selectedAlbum === null ? 'bold' : 'medium'}
              className={styles.albumName}
            >
              {allLabel}
            </LqText>
            <Badge variant="muted" label={totalItemCount} />
          </Flex>
        </Button>

        {albums.map((album) => (
          <Button
            key={album.id}
            variant={selectedAlbum === album.id ? 'glass-highlight' : 'ghost'}
            size="sm"
            onClick={() => onSelectAlbum(album.id)}
            className={cn(styles.albumBtn, selectedAlbum === album.id && styles.albumBtnActive)}
            title={album.name}
          >
            <Flex justify="between" align="center" grow className={styles.albumRow}>
              <LqText
                variant="small"
                weight={selectedAlbum === album.id ? 'bold' : 'medium'}
                className={styles.albumName}
              >
                {album.name}
              </LqText>
              <Badge variant="muted" label={album.itemCount || 0} />
            </Flex>
          </Button>
        ))}
      </Stack>
    </Box>
  );
};

export default AlbumSidebar;
