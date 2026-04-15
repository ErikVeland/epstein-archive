import React from 'react';
import { Link } from 'react-router-dom';
import { Surface } from '../design-system/components/surfaces/Surface';
import { Flex } from '../design-system/components/layout/Flex';
import { Box } from '../design-system/components/layout/Box';
import { Grid } from '../design-system/components/layout/Grid';
import { LqText } from '../design-system/components/typography/Text';
import styles from './TheEpsteinFilesPage.module.css';

const css = <T,>(style: T) => style;

type LandingVariant = 'overview' | 'documents' | 'people' | 'media' | 'timeline' | 'flights';

interface TheEpsteinFilesPageProps {
  variant: LandingVariant;
}

const copyByVariant: Record<
  LandingVariant,
  { title: string; description: string; points: string[]; ctaLabel: string; ctaHref: string }
> = {
  overview: {
    title: 'The Epstein Files',
    description:
      'Explore a searchable archive of documents, entities, media, timelines, and travel records connected to the Epstein files.',
    points: [
      'Cross-reference people, organizations, and document evidence.',
      'Trace events over time with linked timeline context.',
      'Inspect source documents, media, and related entities from one system.',
    ],
    ctaLabel: 'Open Document Browser',
    ctaHref: '/documents',
  },
  documents: {
    title: 'Epstein Documents',
    description:
      'Browse and filter original documents, OCR text, provenance metadata, and linked evidence relationships.',
    points: [
      'Search by document ID, title, source, and extracted text.',
      'Inspect original document variants and OCR outputs.',
      'Jump from documents to linked entities and related evidence.',
    ],
    ctaLabel: 'Browse Documents',
    ctaHref: '/documents',
  },
  people: {
    title: 'Epstein People Index',
    description:
      'Review entities, relationship context, mention counts, and supporting records across the archive.',
    points: [
      'Entity profiles include role context and mention density.',
      'Navigate from people to documents, media, and investigations.',
      'Prioritize by risk and evidence linkage depth.',
    ],
    ctaLabel: 'Browse People',
    ctaHref: '/people',
  },
  media: {
    title: 'Epstein Media Archive',
    description:
      'Access image, audio, and video material with album context, source links, and related document references.',
    points: [
      'Open photos, audio, and video from a unified media browser.',
      'Share media and albums with preview metadata.',
      'Connect media items to evidence records and entities.',
    ],
    ctaLabel: 'Open Media Browser',
    ctaHref: '/media/photos',
  },
  timeline: {
    title: 'Epstein Timeline',
    description:
      'Track key events with linked evidence and relationship context in chronological order.',
    points: [
      'View event chronology with document-linked context.',
      'Pivot from timeline entries into source records.',
      'Correlate event windows with entities and communications.',
    ],
    ctaLabel: 'Open Timeline',
    ctaHref: '/timeline',
  },
  flights: {
    title: 'Epstein Flight Logs',
    description:
      'Review flight routes, movement patterns, and related records tied to the Epstein files.',
    points: [
      'Search and filter known flight records.',
      'Inspect recurring routes and movement clusters.',
      'Correlate travel records with entities and timeline events.',
    ],
    ctaLabel: 'Open Flight Records',
    ctaHref: '/flights',
  },
};

const discoveryLinks = [
  { href: '/the-epstein-files', label: 'The Epstein Files Overview' },
  { href: '/epstein-documents', label: 'Epstein Documents' },
  { href: '/epstein-people', label: 'Epstein People Index' },
  { href: '/epstein-media', label: 'Epstein Media Archive' },
  { href: '/epstein-timeline', label: 'Epstein Timeline' },
  { href: '/epstein-flights', label: 'Epstein Flight Logs' },
];

export const TheEpsteinFilesPage: React.FC<TheEpsteinFilesPageProps> = ({ variant }) => {
  const copy = copyByVariant[variant];

  return (
    <Box className={styles.page}>
      <Flex direction="column" gap={8}>
        <header>
          <Flex direction="column" gap={4}>
            <LqText as="h1" variant="h1" color="primary">
              {copy.title}
            </LqText>
            <LqText as="p" variant="body" color="primary" className={styles.description}>
              {copy.description}
            </LqText>
          </Flex>
        </header>

        <Surface variant="glass" className={styles.section}>
          <LqText as="h2" variant="h3" color="primary" className={styles.sectionTitleAccent}>
            What You Can Do Here
          </LqText>
          <Box as="ul" className={styles.pointList}>
            {copy.points.map((point) => (
              <LqText
                key={point}
                as="li"
                variant="body"
                color="primary"
                className={styles.pointItem}
              >
                {point}
              </LqText>
            ))}
          </Box>
        </Surface>

        <Surface variant="glass" className={styles.section}>
          <LqText as="h2" variant="h3" color="primary" className={styles.sectionTitle}>
            Explore Archive Sections
          </LqText>
          <Grid cols={{ base: 1, sm: 2 }} gap={3}>
            {discoveryLinks.map((item) => (
              <Surface
                key={item.href}
                variant="glass"
                className={styles.discoveryCard}
                style={css({ padding: 0 })}
              >
                <Link to={item.href} className={styles.discoveryLink}>
                  {item.label}
                </Link>
              </Surface>
            ))}
          </Grid>
        </Surface>

        <Box className={styles.ctaWrap}>
          <Link to={copy.ctaHref} className={styles.ctaLink}>
            {copy.ctaLabel}
          </Link>
        </Box>
      </Flex>
    </Box>
  );
};

export default TheEpsteinFilesPage;
