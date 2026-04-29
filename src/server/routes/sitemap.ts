import express from 'express';
import type { Request, Response } from 'express';
import { getApiPool } from '../db/connection.js';

const router = express.Router();

const ORIGIN = 'https://epstein.academy';

interface CollectionEntry {
  loc: string;
  changefreq: string;
  priority: string;
}

const COLLECTION_URLS: CollectionEntry[] = [
  { loc: `${ORIGIN}/`, changefreq: 'hourly', priority: '1.0' },
  { loc: `${ORIGIN}/search`, changefreq: 'hourly', priority: '0.9' },
  { loc: `${ORIGIN}/the-epstein-files`, changefreq: 'daily', priority: '0.95' },
  { loc: `${ORIGIN}/epstein-documents`, changefreq: 'daily', priority: '0.9' },
  { loc: `${ORIGIN}/epstein-people`, changefreq: 'daily', priority: '0.85' },
  { loc: `${ORIGIN}/epstein-media`, changefreq: 'daily', priority: '0.85' },
  { loc: `${ORIGIN}/epstein-timeline`, changefreq: 'daily', priority: '0.8' },
  { loc: `${ORIGIN}/epstein-flights`, changefreq: 'daily', priority: '0.8' },
  { loc: `${ORIGIN}/documents`, changefreq: 'hourly', priority: '0.9' },
  { loc: `${ORIGIN}/people`, changefreq: 'daily', priority: '0.8' },
  { loc: `${ORIGIN}/media`, changefreq: 'daily', priority: '0.8' },
  { loc: `${ORIGIN}/emails`, changefreq: 'daily', priority: '0.8' },
  { loc: `${ORIGIN}/timeline`, changefreq: 'daily', priority: '0.7' },
  { loc: `${ORIGIN}/flights`, changefreq: 'daily', priority: '0.7' },
  { loc: `${ORIGIN}/properties`, changefreq: 'weekly', priority: '0.6' },
  { loc: `${ORIGIN}/blackbook`, changefreq: 'weekly', priority: '0.6' },
  { loc: `${ORIGIN}/analytics`, changefreq: 'daily', priority: '0.7' },
  { loc: `${ORIGIN}/about`, changefreq: 'weekly', priority: '0.5' },
  { loc: `${ORIGIN}/faq`, changefreq: 'weekly', priority: '0.5' },
];

function escapeLoc(url: string): string {
  return url.replace(/&/g, '&amp;');
}

function urlEntry(loc: string, changefreq: string, priority: string, lastmod?: string): string {
  const lastmodLine = lastmod ? `\n    <lastmod>${lastmod}</lastmod>` : '';
  return `  <url>\n    <loc>${escapeLoc(loc)}</loc>${lastmodLine}\n    <changefreq>${changefreq}</changefreq>\n    <priority>${priority}</priority>\n  </url>`;
}

router.get('/', async (_req: Request, res: Response) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const pool = getApiPool();
    const result = await pool.query<{ id: number }>('SELECT id FROM entities ORDER BY id');
    const entityIds = result.rows.map((r) => r.id);

    const collectionXml = COLLECTION_URLS.map(({ loc, changefreq, priority }) =>
      urlEntry(loc, changefreq, priority, today),
    ).join('\n');

    const entityXml = entityIds
      .map((id) => urlEntry(`${ORIGIN}/entity/${id}`, 'weekly', '0.6'))
      .join('\n');

    const xml = [
      '<?xml version="1.0" encoding="UTF-8"?>',
      '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
      collectionXml,
      entityXml,
      '</urlset>',
    ].join('\n');

    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.status(200).send(xml);
  } catch (err) {
    console.error('[sitemap] Failed to generate sitemap:', err);
    res.status(500).type('text').send('Error generating sitemap');
  }
});

export default router;
