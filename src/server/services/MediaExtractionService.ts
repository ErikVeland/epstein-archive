import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import sharp from 'sharp';
import { execFileSync } from 'child_process';
import { MediaService } from './MediaService.js';
import { logger } from './Logger.js';
import { dataPath } from '../utils/pathResolver.js';
import {
  classifyExtractedVisual,
  outputNumberFromExtractedFilename,
  parsePdfImagesList,
  type PdfImageObject,
} from './mediaExtractionMetadata.js';

const EXTRACTION_CONTRACT_VERSION = 'pdf-object-v2';

export class MediaExtractionService {
  private mediaService: MediaService;
  private extractedDir: string;
  private tempDir: string;
  private pdfImagesPath: string;

  constructor(mediaService: MediaService) {
    this.mediaService = mediaService;
    this.extractedDir = dataPath('media', 'extracted');
    this.tempDir = dataPath('temp', 'extraction');
    this.pdfImagesPath = process.env.PDFIMAGES_BIN?.trim() || 'pdfimages';

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

  private async hashFile(filePath: string): Promise<string> {
    return await new Promise<string>((resolve, reject) => {
      const hash = crypto.createHash('sha256');
      const stream = fs.createReadStream(filePath);
      stream.on('error', reject);
      stream.on('data', (chunk) => hash.update(chunk));
      stream.on('end', () => resolve(hash.digest('hex')));
    });
  }

  /** Extract embedded image objects and preserve their exact PDF source location. */
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

    const safeDocumentId = String(documentId).replace(/[^a-zA-Z0-9_-]/g, '_');
    const docTempDir = path.join(this.tempDir, `doc_${safeDocumentId}_${Date.now()}`);
    fs.mkdirSync(docTempDir, { recursive: true });

    let extractedCount = 0;

    try {
      const listOutput = execFileSync(this.pdfImagesPath, ['-list', absPath], {
        encoding: 'utf8',
        maxBuffer: 64 * 1024 * 1024,
      });
      const objectManifest = parsePdfImagesList(listOutput);
      const sourceDocumentSha256 = await this.hashFile(absPath);

      execFileSync(this.pdfImagesPath, ['-all', absPath, path.join(docTempDir, 'img')], {
        stdio: 'pipe',
        maxBuffer: 64 * 1024 * 1024,
      });

      const files = fs.readdirSync(docTempDir).sort();
      for (const file of files) {
        const tempPath = path.join(docTempDir, file);
        const fileStats = fs.statSync(tempPath);
        if (!fileStats.isFile() || fileStats.size < 5000) continue;

        const outputNumber = outputNumberFromExtractedFilename(file);
        if (outputNumber == null) continue;
        const sourceObject = objectManifest.get(outputNumber);
        const success = await this.processExtractedFile({
          tempPath,
          documentId,
          docName,
          outputNumber,
          sourceObject,
          sourceDocumentSha256,
          sourceCollection,
        });

        if (success) extractedCount++;
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      logger.error(
        { err: message, docId: documentId, executable: this.pdfImagesPath },
        'Failed to extract images via pdfimages',
      );
    } finally {
      try {
        fs.rmSync(docTempDir, { recursive: true, force: true });
      } catch (_error) {
        void 0;
      }
    }

    return extractedCount;
  }

  private async processExtractedFile(params: {
    tempPath: string;
    documentId: string | number;
    docName: string;
    outputNumber: number;
    sourceObject?: PdfImageObject;
    sourceDocumentSha256: string;
    sourceCollection?: string;
  }): Promise<boolean> {
    const {
      tempPath,
      documentId,
      docName,
      outputNumber,
      sourceObject,
      sourceDocumentSha256,
      sourceCollection,
    } = params;

    try {
      const buffer = fs.readFileSync(tempPath);
      const extractedObjectSha256 = crypto.createHash('sha256').update(buffer).digest('hex');
      const sharpImage = sharp(buffer);
      const [imageMetadata, imageStats] = await Promise.all([
        sharpImage.metadata(),
        sharpImage.stats(),
      ]);

      if (
        !imageMetadata.width ||
        !imageMetadata.height ||
        (imageMetadata.width < 50 && imageMetadata.height < 50)
      ) {
        return false;
      }

      const classification = classifyExtractedVisual({
        width: imageMetadata.width,
        height: imageMetadata.height,
        entropy: imageStats.entropy,
        channelMeans: imageStats.channels.map((channel) => channel.mean),
        channelStdevs: imageStats.channels.map((channel) => channel.stdev),
      });
      const averageStdev =
        imageStats.channels.reduce((sum, channel) => sum + channel.stdev, 0) /
        imageStats.channels.length;
      const exactSourceMatch = Boolean(sourceObject && sourceDocumentSha256);
      const sourcePage = sourceObject?.page ?? 0;
      const objectNumber = sourceObject?.objectNumber ?? outputNumber;

      const existingImage = await this.mediaService.findExtractedImageOccurrence(
        documentId,
        sourcePage,
        objectNumber,
        extractedObjectSha256,
      );

      const docSubDir = path.join(this.extractedDir, String(documentId));
      if (!fs.existsSync(docSubDir)) {
        fs.mkdirSync(docSubDir, { recursive: true });
      }

      const cleanDocName = docName.replace(/\.[^/.]+$/, '').replace(/[^a-zA-Z0-9_-]/g, '_');
      const locationSuffix = sourceObject
        ? `p${sourceObject.page}_obj${sourceObject.objectNumber}`
        : `obj${outputNumber}`;
      const filename = `${cleanDocName}_${locationSuffix}.jpg`;
      const generatedSavePath = path.join(docSubDir, filename);
      const existingPath = existingImage?.path
        ? path.isAbsolute(existingImage.path)
          ? existingImage.path
          : path.join(process.cwd(), existingImage.path)
        : null;
      const savePath =
        existingPath && fs.existsSync(existingPath) ? existingPath : generatedSavePath;

      if (!fs.existsSync(savePath)) {
        await sharpImage.jpeg({ quality: 90 }).toFile(savePath);
      }

      const savedFileStats = fs.statSync(savePath);
      const derivedFileSha256 = await this.hashFile(savePath);
      const description = sourceObject
        ? `Source-verified extraction from page ${sourceObject.page}, PDF object ${sourceObject.objectNumber}. Visual type: ${classification.type.replaceAll('_', ' ')}.`
        : 'Extracted PDF image object. Its exact source page has not been verified.';
      const extractionMetadata: Record<string, unknown> = {
        sha256: extractedObjectSha256,
        extracted_object_sha256: extractedObjectSha256,
        derived_file_sha256: derivedFileSha256,
        source_document: docName,
        source_document_id: String(documentId),
        source_collection: sourceCollection,
        source_page: sourceObject?.page,
        source_pdf_object_number: sourceObject?.objectNumber,
        source_pdf_object_generation: sourceObject?.objectGeneration,
        source_pdf_object_type: sourceObject?.type,
        source_document_sha256: sourceDocumentSha256,
        extracted_object_format: imageMetadata.format,
        extraction_engine: 'poppler-pdfimages',
        extraction_contract_version: EXTRACTION_CONTRACT_VERSION,
        is_document_extract: true,
        is_text_only: classification.hasText,
        visual_classification: classification.type,
        visual_classification_confidence: classification.confidence,
        visual_classification_method: classification.method,
        stdev: averageStdev,
        entropy: imageStats.entropy,
        provenance: {
          status: exactSourceMatch ? 'exact_source_object' : 'source_location_missing',
          sourceDocumentId: String(documentId),
          sourcePage: sourceObject?.page,
          sourceObjectNumber: sourceObject?.objectNumber,
          sourceDocumentSha256,
          extractedObjectSha256,
          derivedFileSha256,
        },
      };

      let image = existingImage;
      if (image) {
        await this.mediaService.updateExtractedImageProvenance(image.id, {
          metadata: extractionMetadata,
          verificationStatus: exactSourceMatch ? 'source_verified' : 'unverified',
          hasText: classification.hasText,
          width: imageMetadata.width,
          height: imageMetadata.height,
          fileSize: savedFileStats.size,
          filePath: path.relative(process.cwd(), savePath),
          description,
        });
      } else {
        const albumName = this.getDatasetAlbumName(sourceCollection);
        const album = await this.mediaService.getOrCreateAlbum(
          albumName,
          `Extracted media assets from the ${albumName} dataset.`,
        );
        const relativePath = path.relative(process.cwd(), savePath);
        image = await this.mediaService.createImage({
          filename,
          originalFilename: filename,
          path: relativePath,
          file_path: relativePath,
          title: sourceObject
            ? `Asset from ${docName} (page ${sourceObject.page})`
            : `Asset from ${docName} (object ${outputNumber})`,
          description,
          albumId: album.id,
          documentId,
          width: imageMetadata.width,
          height: imageMetadata.height,
          fileSize: savedFileStats.size,
          format: 'image/jpeg',
          hasText: classification.hasText,
          verificationStatus: exactSourceMatch ? 'source_verified' : 'unverified',
          metadata: extractionMetadata,
        });
      }

      const albumName = this.getDatasetAlbumName(sourceCollection);
      const tagNames: Array<[string, string]> = [
        ['extracted-media', 'system'],
        [`dataset:${albumName}`, 'dataset'],
        [classification.type.replaceAll('_', '-'), 'visual-type'],
      ];
      if (exactSourceMatch) tagNames.push(['source-verified', 'provenance']);
      const tags = await Promise.all(
        tagNames.map(([name, category]) => this.mediaService.getOrCreateTag(name, category)),
      );
      await Promise.all(tags.map((tag) => this.mediaService.addTagToImage(image.id, tag.id)));

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
