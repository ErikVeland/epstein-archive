import React, { useState, useRef, useCallback } from 'react';
import { useSharedIntersectionObserver } from '../../hooks/useSharedIntersectionObserver';
import s from './LazyImage.module.css';

// Global cache to track which images have been loaded this session
const loadedImageCache = new Set<string>();

interface LazyImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  placeholderSrc?: string;
  threshold?: number;
}

export const LazyImage: React.FC<LazyImageProps> = ({
  src,
  alt,
  placeholderSrc = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiB2aWV3Qm94PSIwIDAgMSAxIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjxyZWN0IHdpZHRoPSIxIiBoZWlnaHQ9IjEiIGZpbGw9IiMwMjA2MTciIC8+PC9zdmc+', // Slate-950 placeholder
  threshold = 0.1,
  className,
  ...props
}) => {
  // Check if this image was already loaded (prevents flicker on re-render)
  const wasAlreadyLoaded = src ? loadedImageCache.has(src) : false;
  const [isLoaded, setIsLoaded] = useState(wasAlreadyLoaded);
  const [isInView, setIsInView] = useState(wasAlreadyLoaded);
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

  // If src changes and it's already cached, immediately show it
  const [shouldAnimate] = useState(!wasAlreadyLoaded);
  const resolvedSrc = isInView || wasAlreadyLoaded ? src : placeholderSrc;
  const resolvedLoaded = isLoaded || wasAlreadyLoaded;

  return (
    <img
      ref={imgRef}
      src={resolvedSrc}
      alt={alt}
      loading="lazy"
      decoding="async"
      onLoad={handleLoad}
      className={`${s.img} ${resolvedLoaded ? s.loaded : s.loading} ${className || ''}`}
      style={{
        transition: shouldAnimate ? 'opacity 0.4s ease-out' : 'none',
        backgroundColor: '#020617', // slate-950, darker background for less visual gap
      }}
      {...props}
    />
  );
};

export default LazyImage;
