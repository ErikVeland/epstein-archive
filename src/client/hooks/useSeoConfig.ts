import { useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import type { SeoConfig } from '../types/api';

export const useSeoConfig = (): SeoConfig => {
  const location = useLocation();

  return useMemo<SeoConfig>(() => {
    const origin = 'https://epstein.academy';
    const canonical = `${origin}${location.pathname}`;
    const commonKeywords = ['Epstein Files', 'Epstein documents', 'Jeffrey Epstein archive'];

    if (location.pathname.startsWith('/documents')) {
      return {
        title: 'Epstein Documents',
        description:
          'Search Epstein files by document title, source, OCR text, and linked entities in the document browser.',
        url: canonical,
        canonical,
        type: 'CollectionPage',
        keywords: [...commonKeywords, 'court documents', 'depositions', 'evidence files'],
        schema: {
          '@context': 'https://schema.org',
          '@type': 'Dataset',
          name: 'Epstein Documents Dataset',
          description:
            'Searchable collection of documents, OCR text, and metadata from the Epstein files archive.',
          url: canonical,
          inLanguage: 'en',
          isAccessibleForFree: true,
        },
      };
    }

    if (location.pathname.startsWith('/people')) {
      return {
        title: 'Epstein People Index',
        description:
          'Browse entities, mention context, and supporting references across the Epstein files archive.',
        url: canonical,
        canonical,
        type: 'CollectionPage',
        keywords: [...commonKeywords, 'Epstein people', 'entity index', 'named entities'],
        schema: {
          '@context': 'https://schema.org',
          '@type': 'CollectionPage',
          name: 'Epstein People Index',
          description: 'Entity index and relationship navigation for people linked in the archive.',
          url: canonical,
        },
      };
    }

    if (location.pathname.startsWith('/media')) {
      const hasShareParams =
        location.search.includes('id=') || location.search.includes('albumId=');
      const mediaCanonical = hasShareParams ? `${canonical}${location.search}` : canonical;
      return {
        title: 'Epstein Media Archive',
        description:
          'Explore photos, audio, and video connected to the Epstein files with album and document context.',
        url: mediaCanonical,
        canonical: mediaCanonical,
        type: 'CollectionPage',
        keywords: [...commonKeywords, 'epstein media', 'epstein photos', 'epstein audio'],
        schema: {
          '@context': 'https://schema.org',
          '@type': 'CollectionPage',
          name: 'Epstein Media Archive',
          description:
            'Image, audio, and video records linked to entities and documents in the Epstein archive.',
          url: mediaCanonical,
        },
      };
    }

    if (location.pathname.startsWith('/timeline')) {
      return {
        title: 'Epstein Timeline',
        description:
          'Trace key events and evidence chronology in the Epstein files timeline with linked source records.',
        url: canonical,
        canonical,
        type: 'CollectionPage',
        keywords: [...commonKeywords, 'epstein timeline', 'chronology', 'event sequence'],
        schema: {
          '@context': 'https://schema.org',
          '@type': 'CollectionPage',
          name: 'Epstein Timeline',
          description: 'Chronological view of archive events linked to documents and entities.',
          url: canonical,
        },
      };
    }

    if (location.pathname.startsWith('/flights')) {
      return {
        title: 'Epstein Flight Logs',
        description:
          'Analyze Epstein flight records, routes, and travel patterns with searchable evidence context.',
        url: canonical,
        canonical,
        type: 'CollectionPage',
        keywords: [...commonKeywords, 'epstein flight logs', 'flight records', 'travel routes'],
        schema: {
          '@context': 'https://schema.org',
          '@type': 'Dataset',
          name: 'Epstein Flight Logs',
          description: 'Structured flight records linked to entities and documents.',
          url: canonical,
          isAccessibleForFree: true,
        },
      };
    }

    if (location.pathname === '/the-epstein-files' || location.pathname.startsWith('/epstein-')) {
      return {
        title: 'The Epstein Files',
        description:
          'Primary archive landing page for searching the Epstein files across documents, media, entities, flights, and timelines.',
        url: canonical,
        canonical,
        type: 'CollectionPage',
        keywords: [...commonKeywords, 'the epstein files', 'epstein files archive', 'epstein data'],
        schema: [
          {
            '@context': 'https://schema.org',
            '@type': 'CollectionPage',
            name: 'The Epstein Files',
            description:
              'Public-facing archive for browsing documents, entities, and evidence linked to the Epstein files.',
            url: canonical,
          },
          {
            '@context': 'https://schema.org',
            '@type': 'Dataset',
            name: 'Epstein Files Archive Dataset',
            description:
              'Searchable structured archive of records, OCR text, media, and entities tied to the Epstein files.',
            url: canonical,
            isAccessibleForFree: true,
          },
          {
            '@context': 'https://schema.org',
            '@type': 'NewsArticle',
            headline: 'The Epstein Files Archive: public search access',
            dateModified: new Date().toISOString(),
            mainEntityOfPage: canonical,
            publisher: {
              '@type': 'Organization',
              name: 'Glass Academy',
              url: 'https://epstein.academy',
            },
          },
        ],
      };
    }

    if (location.pathname.startsWith('/about')) {
      return {
        title: 'About the Epstein Files Archive',
        description:
          'Methodology, source provenance, and ingestion status for the Epstein Files Archive.',
        url: canonical,
        canonical,
        type: 'article',
        keywords: [...commonKeywords, 'methodology', 'archive status', 'data provenance'],
      };
    }

    if (location.pathname.startsWith('/emails')) {
      return {
        title: 'Epstein Email Archive',
        description:
          'Search and analyze mailbox threads, participants, and linked evidence across the Epstein files email archive.',
        url: canonical,
        canonical,
        type: 'CollectionPage',
        keywords: [...commonKeywords, 'epstein emails', 'email threads', 'mailbox archive'],
      };
    }

    if (location.pathname.startsWith('/analytics')) {
      return {
        title: 'Epstein Analytics',
        description:
          'Explore risk distributions, entity signals, and investigative trends across the Epstein files dataset.',
        url: canonical,
        canonical,
        type: 'CollectionPage',
        keywords: [...commonKeywords, 'epstein analytics', 'risk analysis', 'entity insights'],
      };
    }

    if (location.pathname.startsWith('/blackbook')) {
      return {
        title: 'Epstein Black Book',
        description:
          'Browse contact entries, phone numbers, and linked entities from Epstein black book records.',
        url: canonical,
        canonical,
        type: 'CollectionPage',
        keywords: [...commonKeywords, 'black book', 'contact records', 'address book'],
      };
    }

    if (location.pathname.startsWith('/properties')) {
      return {
        title: 'Epstein Property Records',
        description:
          'Review properties, ownership relationships, and location-linked evidence in the archive.',
        url: canonical,
        canonical,
        type: 'CollectionPage',
        keywords: [...commonKeywords, 'properties', 'ownership', 'locations'],
      };
    }

    if (
      location.pathname.startsWith('/investigations') ||
      location.pathname.startsWith('/investigate')
    ) {
      return {
        title: 'Epstein Investigations Workspace',
        description:
          'Create investigations, chain evidence, test hypotheses, and track investigative findings.',
        url: canonical,
        canonical,
        type: 'CollectionPage',
        keywords: [...commonKeywords, 'investigations', 'evidence chaining', 'case workspace'],
      };
    }
    if (location.pathname.startsWith('/guide')) {
      return {
        title: 'Investigation System Guide',
        description:
          'Learn how to use the Epstein Archive workspace to organize evidence and build cases.',
        url: canonical,
        canonical,
        type: 'article',
        keywords: [...commonKeywords, 'guide', 'tutorial', 'investigation manual'],
      };
    }

    return {
      title: 'Epstein Files Archive',
      description:
        'Search and analyze the Epstein Files archive: documents, emails, media, entities, timelines, and flights.',
      url: canonical,
      canonical,
      type: 'website',
      keywords: commonKeywords,
    };
  }, [location.pathname, location.search]);
};
