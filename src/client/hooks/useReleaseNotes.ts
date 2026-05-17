import { useState, useCallback, useMemo } from 'react';
import { parseReleaseNotes } from '../utils/releaseNotes';
import type { ParsedReleaseNote } from '../utils/releaseNotes';

export interface UseReleaseNotesReturn {
  showReleaseNotes: boolean;
  setShowReleaseNotes: (show: boolean) => void;
  releaseNotes: ParsedReleaseNote[];
  hasUnseenNotes: boolean;
  markNotesSeen: () => void;
}

const RELEASE_NOTES_KEY = 'epstein_release_notes_seen';

function getSeenVersion(): string | null {
  try {
    return localStorage.getItem(RELEASE_NOTES_KEY);
  } catch {
    return null;
  }
}

export function useReleaseNotes(releaseNotesRaw: string): UseReleaseNotesReturn {
  const [showReleaseNotes, setShowReleaseNotes] = useState<boolean>(false);
  const seenVersion = useMemo(() => getSeenVersion(), []);
  const releaseNotes = parseReleaseNotes(releaseNotesRaw);
  const hasUnseenNotes = releaseNotes.length > 0 && seenVersion !== releaseNotes[0]?.version;

  const markNotesSeen = useCallback(() => {
    if (releaseNotes.length > 0) {
      try {
        localStorage.setItem(RELEASE_NOTES_KEY, releaseNotes[0].version);
      } catch {
        // Ignore localStorage errors
      }
    }
  }, [releaseNotes]);

  return {
    showReleaseNotes,
    setShowReleaseNotes,
    releaseNotes,
    hasUnseenNotes,
    markNotesSeen,
  };
}
