import { useCallback, useState, useLayoutEffect, useEffect } from 'react';

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

  // Update highlight count when search term or container changes
  useLayoutEffect(() => {
    if (!searchTerm || !containerRef.current) {
      setTotalHighlights(0);
      setCurrentHighlightIndex(0);
      return;
    }

    // Count all <mark> elements (highlights) in the container
    const marks = containerRef.current.querySelectorAll('mark');
    setTotalHighlights(marks.length);
    if (marks.length > 0) {
      setCurrentHighlightIndex(0);
      // Scroll to first highlight
      marks[0].scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [searchTerm, containerRef]);

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
