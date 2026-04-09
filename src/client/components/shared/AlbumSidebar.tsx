import React from 'react';
import { Button, Flex, Box, LqText, Stack, Badge, cn } from '../../design-system/lib';
import type { MediaAlbum } from '../../hooks/useMediaBrowser';
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
      <Stack gap="md">
        <Flex align="center" gap="sm" px="sm">
          <LqText variant="xs" weight="bold" color="muted" style={{ textTransform: 'uppercase' }}>
            Archive Tranches
          </LqText>
        </Flex>

        <Stack gap="xs">
          <Button
            variant={selectedAlbum === null ? 'glass-highlight' : 'ghost'}
            size="sm"
            onClick={() => onSelectAlbum(null)}
            className={cn(styles.albumBtn, selectedAlbum === null && styles.albumBtnActive)}
          >
            <Flex justify="between" align="center" grow>
              <LqText variant="small" weight={selectedAlbum === null ? 'bold' : 'medium'}>
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
              <Flex justify="between" align="center" grow>
                <LqText variant="small" weight={selectedAlbum === album.id ? 'bold' : 'medium'}>
                  {album.name}
                </LqText>
                <Badge variant="muted" label={album.itemCount || 0} />
              </Flex>
            </Button>
          ))}
        </Stack>
      </Stack>
    </Box>
  );
};

export default AlbumSidebar;
