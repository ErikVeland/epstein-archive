import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import sharp from 'sharp';
import { execSync } from 'child_process';
import { MediaService } from './MediaService.js';
import { logger } from './Logger.js';

export class MediaExtractionService {
  private mediaService: MediaService;
  private extractedDir: string;
  private tempDir: string;
  private pdfImagesPath: string;

  constructor(mediaService: MediaService) {
    this.mediaService = mediaService;
    this.extractedDir = path.join(process.cwd(), 'data/media/extracted');
    this.tempDir = path.join(process.cwd(), 'data/temp/extraction');
    this.pdfImagesPath = '/usr/local/bin/pdfimages';

    if (!fs.existsSync(this.extractedDir)) {
      fs.mkdirSync(this.extractedDir, { recursive: true });
    }
    if (!fs.existsSync(this.tempDir)) {
      fs.mkdirSync(this.tempDir, { recursive: true });
    }
  }

  private getDatasetAlbumName(sourceCollection?: string): string {
    const cleanSource = String(sourceCollection || '').trim();
    return cleanSource || 'Extracted Media';
  }

  /**
   * Extract images from a PDF and register them in the media library
   */
  async extractFromPdf(
    documentId: string | number,
    filePath: string,
    docName: string,
    sourceCollection?: string,
  ): Promise<number> {
    const absPath = path.isAbsolute(filePath) ? filePath : path.join(process.cwd(), filePath);
    if (!fs.existsSync(absPath)) {
      logger.error({ filePath: absPath }, 'PDF file not found for extraction');
      return 0;
    }

    const docTempDir = path.join(this.tempDir, `doc_${documentId}_${Date.now()}`);
    fs.mkdirSync(docTempDir, { recursive: true });

    let extractedCount = 0;

    try {
      // Run pdfimages -all to extract everything
      const cmd = `export PATH="/usr/local/bin:$PATH" && "${this.pdfImagesPath}" -all "${absPath}" "${docTempDir}/img"`;
      execSync(cmd, { stdio: 'pipe' });

      // Scan the temp directory for output files
      const files = fs.readdirSync(docTempDir).sort();
      for (const file of files) {
        const tempPath = path.join(docTempDir, file);
        const stats = fs.statSync(tempPath);

        // Skip tiny files (likely masks or noise)
        if (stats.size < 5000) continue;

        const success = await this.processExtractedFile(
          tempPath,
          documentId,
          docName,
          extractedCount + 1,
          sourceCollection,
        );

        if (success) extractedCount++;
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      logger.error({ err: message, docId: documentId }, 'Failed to extract images via pdfimages');
    } finally {
      // Cleanup temp files
      try {
        fs.rmSync(docTempDir, { recursive: true, force: true });
      } catch (_e) {
        void 0;
      }
    }

    return extractedCount;
  }

  private async processExtractedFile(
    tempPath: string,
    documentId: string | number,
    docName: string,
    index: number,
    sourceCollection?: string,
  ): Promise<boolean> {
    try {
      const buffer = fs.readFileSync(tempPath);
      const hash = crypto.createHash('sha256').update(buffer).digest('hex');

      // Deduplication: Skip if already exists
      if (await this.mediaService.imageByHashExists(hash)) {
        return false;
      }

      // Standardize to JPG
      const docSubDir = path.join(this.extractedDir, String(documentId));
      if (!fs.existsSync(docSubDir)) {
        fs.mkdirSync(docSubDir, { recursive: true });
      }

      // Naming format: [DocumentName]_img_[Index].jpg
      const cleanDocName = docName.replace(/\.[^/.]+$/, '').replace(/[^a-zA-Z0-9_-]/g, '_');
      const filename = `${cleanDocName}_img_${index}.jpg`;
      const savePath = path.join(docSubDir, filename);

      const sharpImg = sharp(buffer);
      const [metadata, stats] = await Promise.all([sharpImg.metadata(), sharpImg.stats()]);

      // Filter out non-image assets or extremely low-res graphics
      if (!metadata.width || !metadata.height || (metadata.width < 50 && metadata.height < 50)) {
        return false;
      }

      // Heuristic: Scanned text pages usually have low stdev (lots of white/black) and lower entropy.
      // Photos usually have stdev > 40 and entropy > 7.
      const avgStdev = stats.channels.reduce((sum, c) => sum + c.stdev, 0) / stats.channels.length;
      const isTextOnly = stats.entropy < 6.8 && avgStdev < 35;

      await sharpImg.jpeg({ quality: 90 }).toFile(savePath);

      const albumName = this.getDatasetAlbumName(sourceCollection);
      const album = await this.mediaService.getOrCreateAlbum(
        albumName,
        `Extracted media assets from the ${albumName} dataset.`,
      );

      // Register in database
      const relativePath = path.relative(process.cwd(), savePath);
      const image = await this.mediaService.createImage({
        filename,
        originalFilename: filename,
        path: relativePath,
        file_path: relativePath,
        title: `Asset from ${docName} (#${index})`,
        description: `Archival asset extracted from document ID ${documentId}.`,
        albumId: album.id,
        documentId: documentId,
        width: metadata.width,
        height: metadata.height,
        fileSize: fs.statSync(savePath).size,
        format: 'image/jpeg',
        hasText: isTextOnly,
        metadata: {
          sha256: hash,
          source_document: docName,
          source_document_id: String(documentId),
          source_collection: sourceCollection,
          extraction_engine: 'pdfimages-cli',
          is_document_extract: true,
          is_text_only: isTextOnly,
          stdev: avgStdev,
          entropy: stats.entropy,
        },
      });

      const baseTags = [
        await this.mediaService.getOrCreateTag('extracted-media', 'system'),
        await this.mediaService.getOrCreateTag(`dataset:${albumName}`, 'dataset'),
      ];
      if (isTextOnly) {
        baseTags.push(await this.mediaService.getOrCreateTag('text-only-extraction', 'system'));
      }
      await Promise.all(baseTags.map((tag) => this.mediaService.addTagToImage(image.id, tag.id)));

      return true;
    } catch (err) {
      logger.error(
        { err: err instanceof Error ? err.message : String(err), tempPath },
        'Error processing extracted asset',
      );
      return false;
    }
  }
}
