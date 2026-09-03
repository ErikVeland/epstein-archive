import React from 'react';
import Icon from '@client/components/common/Icon';
import { Surface, Button, Flex, Box, LqText, Stack, Badge } from '@client/design-system/lib';
import type { MediaAlbum } from '@client/hooks/useMediaBrowser';
import { groupMediaAlbums } from './mediaAlbumPresentation';
import styles from './MobileAlbumDropdown.module.css';

interface MobileAlbumDropdownProps {
  albums: MediaAlbum[];
  selectedAlbum: number | null;
  onSelectAlbum: (albumId: number | null) => void;
  isOpen: boolean;
  onToggle: () => void;
  totalItemCount: number;
  allLabel: string;
  currentAlbumName?: string;
}

export const MobileAlbumDropdown: React.FC<MobileAlbumDropdownProps> = ({
  albums,
  selectedAlbum,
  onSelectAlbum,
  isOpen,
  onToggle,
  totalItemCount,
  allLabel,
  currentAlbumName,
}) => {
  const handleSelect = (albumId: number | null): void => {
    onSelectAlbum(albumId);
    onToggle();
  };

  const displayName = currentAlbumName || allLabel;
  const currentAlbum = albums.find((album) => album.id === selectedAlbum);
  const albumGroups = groupMediaAlbums(albums);

  return (
    <Box className={styles.root}>
      <Stack gap="xs">
        <Button variant="glass" onClick={onToggle} className={styles.trigger}>
          <Flex justify="between" align="center" grow>
            <Flex align="center" gap="sm" className={styles.triggerMain}>
              <Icon name="Folder" size="sm" />
              <LqText variant="small" weight="bold" className={styles.triggerTitle}>
                {displayName}
              </LqText>
            </Flex>
            {isOpen ? <Icon name="ChevronUp" size="sm" /> : <Icon name="ChevronDown" size="sm" />}
          </Flex>
        </Button>
        {currentAlbum?.description ? (
          <LqText variant="xxs" color="muted" className={styles.currentContext}>
            {currentAlbum.description}
          </LqText>
        ) : null}
      </Stack>

      {isOpen && (
        <Surface variant="glass-highlight" className={styles.dropdown}>
          <Stack gap="xs" p="xs">
            <Button
              variant={selectedAlbum === null ? 'primary' : 'ghost'}
              size="sm"
              onClick={() => handleSelect(null)}
            >
              <Flex justify="between" align="center" grow>
                <LqText variant="small">{allLabel}</LqText>
                <Badge variant="muted" label={totalItemCount} />
              </Flex>
            </Button>
            {albumGroups.map((group) => (
              <Stack gap="xs" key={group.key} className={styles.optionGroup}>
                <LqText variant="xxxs" weight="bold" color="muted" className={styles.groupLabel}>
                  {group.label}
                </LqText>
                {group.albums.map((album) => (
                  <Button
                    key={album.id}
                    variant={selectedAlbum === album.id ? 'primary' : 'ghost'}
                    size="sm"
                    onClick={() => handleSelect(album.id)}
                    title={album.description}
                  >
                    <Flex justify="between" align="center" grow className={styles.optionContent}>
                      <LqText variant="small" className={styles.optionName}>
                        {album.name}
                      </LqText>
                      <Badge variant="muted" label={album.itemCount || 0} />
                    </Flex>
                  </Button>
                ))}
              </Stack>
            ))}
          </Stack>
        </Surface>
      )}
    </Box>
  );
};

export default MobileAlbumDropdown;
