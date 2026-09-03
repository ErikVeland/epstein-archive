import React from 'react';
import { Box, Flex, LqText, Stack, HIGStackRow } from '@client/design-system/lib';
import type { MediaAlbum } from '@client/hooks/useMediaBrowser';
import { groupMediaAlbums } from './mediaAlbumPresentation';
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
  const albumGroups = groupMediaAlbums(albums);
  const activeAlbum = albums.find((album) => album.id === selectedAlbum);

  return (
    <Box className={styles.sidebar}>
      <Flex align="center" gap="sm" px="sm" className={styles.sidebarHeader}>
        <LqText variant="xs" weight="bold" color="muted" style={{ textTransform: 'uppercase' }}>
          Collections
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

        {activeAlbum?.description ? (
          <LqText variant="xxs" color="muted" className={styles.activeContext}>
            {activeAlbum.description}
          </LqText>
        ) : null}

        {albumGroups.map((group) => (
          <Stack gap="xs" className={styles.albumGroup} key={group.key}>
            <LqText
              variant="xxxs"
              weight="bold"
              color="muted"
              className={styles.groupLabel}
              title={group.description}
            >
              {group.label}
            </LqText>
            {group.albums.map((album) => (
              <Box key={album.id} title={album.description}>
                <HIGStackRow
                  icon="Folder"
                  title={album.name}
                  subtitle={`${album.itemCount || 0} Items`}
                  onClick={() => onSelectAlbum(album.id)}
                  isActive={selectedAlbum === album.id}
                />
              </Box>
            ))}
          </Stack>
        ))}
      </Stack>
    </Box>
  );
};

export default AlbumSidebar;
