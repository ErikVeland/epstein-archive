import React from 'react';
import { Folder, ChevronUp, ChevronDown } from 'lucide-react';
import { Surface, Button, Flex, Box, LqText, Stack, Badge } from '../../design-system/lib';
import type { MediaAlbum } from '../../hooks/useMediaBrowser';
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

  return (
    <Box className={styles.root}>
      <Button variant="glass" onClick={onToggle} className={styles.trigger}>
        <Flex justify="between" align="center" grow>
          <Flex align="center" gap="sm">
            <Folder size={16} />
            <LqText variant="small" weight="bold">
              {displayName}
            </LqText>
          </Flex>
          {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </Flex>
      </Button>

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
            {albums.map((album) => (
              <Button
                key={album.id}
                variant={selectedAlbum === album.id ? 'primary' : 'ghost'}
                size="sm"
                onClick={() => handleSelect(album.id)}
              >
                <Flex justify="between" align="center" grow>
                  <LqText variant="small">{album.name}</LqText>
                  <Badge variant="muted" label={album.itemCount || 0} />
                </Flex>
              </Button>
            ))}
          </Stack>
        </Surface>
      )}
    </Box>
  );
};

export default MobileAlbumDropdown;
