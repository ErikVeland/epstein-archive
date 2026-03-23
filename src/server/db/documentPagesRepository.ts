import { join } from 'path';
import { statSync } from 'fs';
import { documentsRepository } from './documentsRepository.js';

export const documentPagesRepository = {
  getDocumentPages: async (id: string) => {
    const doc = await documentsRepository.getDocumentById(id);
    const filePath = typeof doc?.filePath === 'string' ? doc.filePath : null;
    const fileName = typeof doc?.fileName === 'string' ? doc.fileName : null;
    if (!doc || !filePath || !fileName) return { pages: [] };

    // Extract filename without extension
    const filename = fileName.replace(/\.[^/.]+$/, '');

    // Try to find the page number in the filename
    // Format is usually NAME_OF_DOC_PageNumber
    // e.g. HOUSE_OVERSIGHT_010477
    const match = filename.match(/_(\d+)$/);
    if (!match) return { pages: [] };

    const startPage = parseInt(match[1], 10);

    if (!filePath.includes('Epstein Estate Documents - Seventh Production')) {
      return { pages: [] };
    }

    const baseDirParts = filePath.split('Epstein Estate Documents - Seventh Production/');
    if (baseDirParts.length < 2) return { pages: [] };

    const relativePath = baseDirParts[1].replace('TEXT/', 'IMAGES/');
    const baseDir = relativePath.split('/').slice(0, -1).join('/');

    const corpusBasePath = process.env.RAW_CORPUS_BASE_PATH || '';
    if (!corpusBasePath) return { pages: [] }; // Can't find pages without corpus path
    const absoluteBaseDir = join(corpusBasePath, baseDir);

    const pages: string[] = [];
    let currentPage = startPage;
    let pageFound = true;

    // Limit to 100 pages to prevent infinite loops if logic fails
    while (pageFound && pages.length < 100) {
      // Reconstruct filename with current page number
      const prefix = filename.substring(0, filename.lastIndexOf('_'));
      const pageStr = currentPage.toString().padStart(match[1].length, '0');
      const currentFilename = `${prefix}_${pageStr}.jpg`;
      const absolutePath = join(absoluteBaseDir, currentFilename);

      try {
        statSync(absolutePath);
        // File exists
        pages.push(`/files/${baseDir}/${currentFilename}`);
        currentPage++;
      } catch (_e) {
        pageFound = false;
      }
    }

    return { pages };
  },
};
