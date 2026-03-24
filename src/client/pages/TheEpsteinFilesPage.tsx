import React from 'react';
import { Link } from 'react-router-dom';

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
    <div className="max-w-5xl mx-auto px-6 py-12 space-y-8">
      <header className="space-y-4">
        <h1 className="text-4xl font-bold text-[var(--text-primary)]">{copy.title}</h1>
        <p className="text-lg text-[var(--text-primary)] max-w-4xl">{copy.description}</p>
      </header>

      <section className="rounded-2xl border border-[var(--glass-border)] bg-[var(--glass-bg)] p-6">
        <h2 className="text-xl font-semibold text-cyan-300 mb-4">What You Can Do Here</h2>
        <ul className="space-y-3 text-[var(--text-primary)]">
          {copy.points.map((point) => (
            <li key={point} className="list-disc ml-6">
              {point}
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-2xl border border-[var(--glass-border)] bg-[var(--glass-bg)] p-6">
        <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-4">
          Explore Archive Sections
        </h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {discoveryLinks.map((item) => (
            <Link
              key={item.href}
              to={item.href}
              className="rounded-lg border border-[var(--glass-border)] bg-[var(--glass-bg)] px-4 py-3 text-[var(--text-primary)] hover:border-cyan-500/60 hover:text-cyan-200 transition-colors"
            >
              {item.label}
            </Link>
          ))}
        </div>
      </section>

      <section className="pt-2">
        <Link
          to={copy.ctaHref}
          className="inline-flex items-center rounded-lg border border-cyan-500/40 bg-cyan-500/10 px-5 py-3 text-cyan-200 hover:bg-cyan-500/20 transition-colors"
        >
          {copy.ctaLabel}
        </Link>
      </section>
    </div>
  );
};

export default TheEpsteinFilesPage;
