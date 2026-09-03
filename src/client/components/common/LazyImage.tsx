import React, { useState, useRef, useCallback } from 'react';
import { useSharedIntersectionObserver } from '@client/hooks/useSharedIntersectionObserver';
import s from './LazyImage.module.css';

// Global cache to track which images have been loaded this session
const loadedImageCache = new Set<string>();

interface LazyImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  placeholderSrc?: string;
  threshold?: number;
  eager?: boolean;
}

export const LazyImage: React.FC<LazyImageProps> = ({
  src,
  alt,
  placeholderSrc = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==',
  threshold = 0.1,
  eager = false,
  className,
  onError,
  ...props
}) => {
  // Check if this image was already loaded (prevents flicker on re-render)
  const wasAlreadyLoaded = src ? loadedImageCache.has(src) : false;
  const [isLoaded, setIsLoaded] = useState(wasAlreadyLoaded);
  const [isInView, setIsInView] = useState(wasAlreadyLoaded || eager);
  const imgRef = useRef<HTMLImageElement>(null);

  // Use shared IntersectionObserver instead of creating one per image
  const handleIntersection = useCallback((intersecting: boolean) => {
    if (intersecting) {
      setIsInView(true);
    }
  }, []);

  useSharedIntersectionObserver(imgRef, handleIntersection, {
    threshold,
    rootMargin: '50px', // Reduced from 200px to load images closer to viewport
  });

  const handleLoad = useCallback(() => {
    // Cache the loaded state and update
    if (src) {
      loadedImageCache.add(src);
    }
    // Use requestAnimationFrame to defer state update and prevent blocking
    requestAnimationFrame(() => {
      setIsLoaded(true);
    });
  }, [src]);

  const handleError = useCallback(
    (event: React.SyntheticEvent<HTMLImageElement, Event>) => {
      requestAnimationFrame(() => {
        setIsLoaded(true);
      });
      onError?.(event);
    },
    [onError],
  );

  // If src changes and it's already cached, immediately show it
  const [shouldAnimate] = useState(!wasAlreadyLoaded);
  const resolvedSrc = eager || isInView || wasAlreadyLoaded ? src : placeholderSrc;
  const resolvedLoaded = isLoaded || wasAlreadyLoaded;

  return (
    <img
      ref={imgRef}
      src={resolvedSrc}
      alt={alt}
      loading={eager ? 'eager' : 'lazy'}
      fetchPriority={eager ? 'high' : 'auto'}
      decoding="async"
      onLoad={handleLoad}
      onError={handleError}
      className={`${s.img} ${resolvedLoaded ? s.loaded : s.loading} ${className || ''}`}
      data-animate={shouldAnimate || undefined}
      {...props}
    />
  );
};

export default LazyImage;
