import React from 'react';
import { Box, Flex, LqText, Stack, HIGStackRow } from '@client/design-system/lib';
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
        <HIGStackRow
          icon="FolderOpen"
          title={allLabel}
          subtitle={`${totalItemCount} Items`}
          onClick={() => onSelectAlbum(null)}
          isActive={selectedAlbum === null}
        />

        {albums.map((album) => (
          <HIGStackRow
            key={album.id}
            icon="Folder"
            title={album.name}
            subtitle={`${album.itemCount || 0} Items`}
            onClick={() => onSelectAlbum(album.id)}
            isActive={selectedAlbum === album.id}
          />
        ))}
      </Stack>
    </Box>
  );
};

export default AlbumSidebar;
