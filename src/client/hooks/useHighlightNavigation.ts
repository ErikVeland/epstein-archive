import { useCallback, useState, useLayoutEffect, useEffect, useRef } from 'react';

/**
 * Hook for navigating between search highlights with keyboard shortcuts
 * CTO Priority: HIGH #5 - Jump-to navigation for search highlights
 */
export function useHighlightNavigation(
  searchTerm: string | undefined,
  containerRef: React.RefObject<HTMLElement>,
) {
  const [currentHighlightIndex, setCurrentHighlightIndex] = useState(0);
  const [totalHighlights, setTotalHighlights] = useState(0);
  const highlightCountRef = useRef(0);

  const updateHighlights = useCallback(() => {
    if (!searchTerm || !containerRef.current) {
      setTotalHighlights(0);
      highlightCountRef.current = 0;
      setCurrentHighlightIndex(0);
      return;
    }

    const marks = containerRef.current.querySelectorAll('mark');
    highlightCountRef.current = marks.length;
    setTotalHighlights(marks.length);
    setCurrentHighlightIndex(0);
    if (marks.length > 0) {
      marks[0].scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [searchTerm, containerRef]);

  // Update highlight count when search term or container changes
  // This effect intentionally updates state for DOM synchronization
  // The setState calls are necessary for tracking highlight state
  useLayoutEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    updateHighlights();
  }, [updateHighlights]);

  // Navigate to next highlight
  const nextHighlight = useCallback(() => {
    if (!containerRef.current || totalHighlights === 0) return;

    const marks = containerRef.current.querySelectorAll('mark');
    const newIndex = (currentHighlightIndex + 1) % totalHighlights;
    setCurrentHighlightIndex(newIndex);

    // Scroll to the highlight
    marks[newIndex]?.scrollIntoView({ behavior: 'smooth', block: 'center' });

    // Add visual feedback - temporarily highlight the active mark
    marks.forEach((mark, i) => {
      if (i === newIndex) {
        mark.classList.add('ring-[2px]', 'ring-[var(--accent)]', 'ring-offset-1');
        setTimeout(
          () => mark.classList.remove('ring-[2px]', 'ring-[var(--accent)]', 'ring-offset-1'),
          1000,
        );
      }
    });
  }, [containerRef, currentHighlightIndex, totalHighlights]);

  // Navigate to previous highlight
  const prevHighlight = useCallback(() => {
    if (!containerRef.current || totalHighlights === 0) return;

    const marks = containerRef.current.querySelectorAll('mark');
    const newIndex = currentHighlightIndex === 0 ? totalHighlights - 1 : currentHighlightIndex - 1;
    setCurrentHighlightIndex(newIndex);

    // Scroll to the highlight
    marks[newIndex]?.scrollIntoView({ behavior: 'smooth', block: 'center' });

    // Add visual feedback
    marks.forEach((mark, i) => {
      if (i === newIndex) {
        mark.classList.add('ring-[2px]', 'ring-[var(--accent)]', 'ring-offset-1');
        setTimeout(
          () => mark.classList.remove('ring-[2px]', 'ring-[var(--accent)]', 'ring-offset-1'),
          1000,
        );
      }
    });
  }, [containerRef, currentHighlightIndex, totalHighlights]);

  // Keyboard shortcuts: Ctrl/Cmd + G for next, Ctrl/Cmd + Shift + G for previous
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'g') {
        e.preventDefault();
        if (e.shiftKey) {
          prevHighlight();
        } else {
          nextHighlight();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [nextHighlight, prevHighlight]);

  return {
    currentHighlightIndex: totalHighlights > 0 ? currentHighlightIndex + 1 : 0,
    totalHighlights,
    nextHighlight,
    prevHighlight,
    hasHighlights: totalHighlights > 0,
  };
}
