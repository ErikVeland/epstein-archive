import fs from 'fs';
import path from 'path';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { logger } from './Logger.js';
import { dataPath } from '../utils/pathResolver.js';

const execFileAsync = promisify(execFile);

export class ThumbnailService {
  static async generateVideoThumbnail(videoPath: string, videoId: number): Promise<string | null> {
    try {
      const cacheDir = dataPath('thumbnails', 'video');
      if (!fs.existsSync(cacheDir)) {
        fs.mkdirSync(cacheDir, { recursive: true });
      }

      const outPath = path.join(cacheDir, `video_${videoId}.jpg`);

      if (fs.existsSync(outPath)) return outPath;

      await execFileAsync('ffmpeg', [
        '-hide_banner',
        '-loglevel',
        'error',
        '-y',
        '-ss',
        '00:00:00.500',
        '-i',
        videoPath,
        '-frames:v',
        '1',
        '-vf',
        'scale=640:-1:force_original_aspect_ratio=decrease',
        outPath,
      ]);

      return fs.existsSync(outPath) ? outPath : null;
    } catch (error) {
      logger.warn({ err: error, videoId }, '[Thumbnail] Failed to generate video thumbnail');
      return null;
    }
  }
}
