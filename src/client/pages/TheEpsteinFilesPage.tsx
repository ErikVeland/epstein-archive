import React from 'react';
import { Link } from 'react-router-dom';
import { Surface } from '@client/design-system/components/surfaces/Surface';
import { Flex } from '@client/design-system/components/layout/Flex';
import { Box } from '@client/design-system/components/layout/Box';
import { Grid } from '@client/design-system/components/layout/Grid';
import { LqText } from '@client/design-system/components/typography/Text';
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
    ctaHref: '/media',
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

const evidenceSpotlights = [
  {
    searchHref: '/search?q=trust%20instruments',
    sourceHref: '/documents?id=1236014',
    label: 'Estate trust subpoena response',
    description:
      'A November 2019 response records production of three Epstein trust instruments and explains why investigators restricted circulation of the sensitive material.',
  },
  {
    searchHref: '/search?q=CBP%20encounter',
    sourceHref: '/documents?id=1236034',
    label: 'Maxwell border encounter history',
    description:
      'A five-page CBP encounter list provides a source record for repeated international travel and can be compared with the archive’s flight evidence.',
  },
  {
    searchHref: '/search?q=12%2C841%20files',
    sourceHref: '/documents?id=1235956',
    label: 'Maxwell discovery production index',
    description:
      'An August 2020 SDNY letter documents a 12,841-file discovery production, its protective-order controls, and the government’s disclosure obligations.',
  },
];

const evidenceHypertextFeatures = [
  {
    label: 'Search exact passages',
    description: 'Results lead with quoted source sentences instead of generated summaries.',
  },
  {
    label: 'Open text and scan',
    description: 'Move between the exact text address and the preserved original source file.',
  },
  {
    label: 'Copy durable citations',
    description:
      'Carry the page, sentence, release, citation ID, and source hashes with the quote.',
  },
  {
    label: 'Trace source families',
    description: 'Recognize repeated copies without counting duplicates as independent support.',
  },
  {
    label: 'Collate investigations',
    description:
      'Save the exact quotation, provenance, hashes, and source links as one evidence item.',
  },
  {
    label: 'Share the evidence',
    description: 'Send a textual citation, permanent evidence link, or original scan.',
  },
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

        {variant === 'overview' ? (
          <Surface variant="glass" className={`${styles.section} ${styles.evidenceShowcase}`}>
            <Flex direction="column" gap={5}>
              <Flex justify="between" align="start" gap={5} className={styles.showcaseHeader}>
                <Box>
                  <LqText as="p" variant="small" color="accent" className={styles.releaseEyebrow}>
                    New in v{__APP_VERSION__}
                  </LqText>
                  <LqText as="h2" variant="h2" color="primary" className={styles.showcaseTitle}>
                    Evidence Hypertext
                  </LqText>
                  <LqText as="p" variant="body" color="secondary" className={styles.description}>
                    Search the corpus as linked evidence. Start with exact language, verify it
                    against the original scan, copy a reproducible citation, and preserve the
                    complete source context in an investigation.
                  </LqText>
                </Box>
                <Link to="/search?q=protective%20order" className={styles.ctaLink}>
                  Open Evidence Search
                </Link>
              </Flex>

              <Grid cols={{ base: 1, sm: 2, lg: 3 }} gap={3}>
                {evidenceHypertextFeatures.map((feature, index) => (
                  <Surface key={feature.label} variant="glass" className={styles.featureCard}>
                    <span className={styles.featureNumber} aria-hidden="true">
                      {String(index + 1).padStart(2, '0')}
                    </span>
                    <LqText as="h3" variant="body" color="primary" className={styles.featureTitle}>
                      {feature.label}
                    </LqText>
                    <LqText as="p" variant="small" color="secondary">
                      {feature.description}
                    </LqText>
                  </Surface>
                ))}
              </Grid>

              <Box as="ol" className={styles.evidenceFlow} aria-label="Evidence research workflow">
                {[
                  'Search text',
                  'Open passage',
                  'Verify scan',
                  'Copy citation',
                  'Build a case',
                ].map((step) => (
                  <LqText as="li" variant="small" color="primary" key={step}>
                    {step}
                  </LqText>
                ))}
              </Box>
            </Flex>
          </Surface>
        ) : null}

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

        {variant === 'overview' ? (
          <Surface variant="glass" className={styles.section}>
            <LqText as="h2" variant="h3" color="primary" className={styles.sectionTitle}>
              Newly Searchable Evidence
            </LqText>
            <LqText as="p" variant="body" color="secondary" className={styles.description}>
              Selected source records surfaced by the completed text and summary backfill. AI
              summaries are research aids; open each record to review the underlying evidence.
            </LqText>
            <Grid cols={{ base: 1, sm: 3 }} gap={3}>
              {evidenceSpotlights.map((item) => (
                <Surface key={item.sourceHref} variant="glass" className={styles.spotlightCard}>
                  <Flex direction="column" gap={2}>
                    <Link to={item.searchHref} className={styles.spotlightTitleLink}>
                      {item.label}
                    </Link>
                    <LqText as="p" variant="body" color="secondary">
                      {item.description}
                    </LqText>
                    <Flex gap={3} className={styles.spotlightActions}>
                      <Link to={item.searchHref}>Search exact text</Link>
                      <Link to={item.sourceHref}>Open source record</Link>
                    </Flex>
                  </Flex>
                </Surface>
              ))}
            </Grid>
          </Surface>
        ) : null}

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
