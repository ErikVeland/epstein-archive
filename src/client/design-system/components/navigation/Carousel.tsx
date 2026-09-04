import React, { useId, useRef } from 'react';
import { Button } from '../Button';
import { Flex } from '../layout/Flex';
import { LqText } from '../typography/Text';
import styles from './Carousel.module.css';

interface CarouselProps {
  title: string;
  description?: string;
  children: React.ReactNode;
}

export function Carousel({ title, description, children }: CarouselProps) {
  const id = useId();
  const track = useRef<HTMLDivElement>(null);
  const move = (direction: number) => {
    const element = track.current;
    if (!element) return;
    element.scrollBy({
      left: direction * element.clientWidth,
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
    });
  };
  return (
    <section aria-labelledby={id} aria-roledescription="carousel" className={styles.carousel}>
      <Flex align="center" justify="between" gap="md">
        <div>
          <LqText as="h2" variant="h3" id={id}>
            {title}
          </LqText>
          {description && (
            <LqText variant="small" color="secondary">
              {description}
            </LqText>
          )}
        </div>
        <Flex gap="sm">
          <Button
            variant="glass"
            size="sm"
            aria-label={`Previous ${title.toLowerCase()}`}
            aria-controls={`${id}-track`}
            onClick={() => move(-1)}
          >
            ←
          </Button>
          <Button
            variant="glass"
            size="sm"
            aria-label={`Next ${title.toLowerCase()}`}
            aria-controls={`${id}-track`}
            onClick={() => move(1)}
          >
            →
          </Button>
        </Flex>
      </Flex>
      <div
        ref={track}
        id={`${id}-track`}
        className={styles.track}
        tabIndex={0}
        aria-label={`${title}, scroll to browse`}
      >
        {React.Children.map(children, (child, index) => (
          <div
            className={styles.slide}
            role="group"
            aria-roledescription="slide"
            aria-label={`${index + 1} of ${React.Children.count(children)}`}
          >
            {child}
          </div>
        ))}
      </div>
    </section>
  );
}
