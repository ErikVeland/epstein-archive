import React, { useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { AudioBrowser } from './AudioBrowser';
import styles from '@client/App.module.css';

const AudioTab: React.FC = () => {
  const location = useLocation();

  const { initialAlbumId, initialAudioId, initialTimestamp, quickStart } = useMemo(() => {
    const params = new URLSearchParams(location.search);
    const albumId = params.get('albumId');
    const audioId = params.get('id');
    const timestamp = params.get('t'); // Support 't' like YouTube
    const quick = params.get('quickstart') === '1';

    return {
      initialAlbumId: albumId ? parseInt(albumId, 10) : undefined,
      initialAudioId: audioId ? parseInt(audioId, 10) : undefined,
      initialTimestamp: timestamp ? parseInt(timestamp, 10) : undefined,
      quickStart: quick,
    };
  }, [location.search]);

  return (
    <div className={styles.hFull}>
      <AudioBrowser
        initialAlbumId={initialAlbumId}
        initialAudioId={initialAudioId}
        initialTimestamp={initialTimestamp}
        quickStart={quickStart}
      />
    </div>
  );
};

export default AudioTab;
