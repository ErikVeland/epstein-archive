// ============================================================================
// MIME TYPE DETECTION — extracted to break circular dependencies
// ============================================================================

import { extname } from 'path';
import { execFile } from 'child_process';

export async function detectMimeType(filePath: string): Promise<string> {
  return new Promise((resolve) => {
    execFile('file', ['--mime-type', '-b', filePath], (err, stdout) => {
      if (err) {
        // Fallback to extension-based if 'file' fails
        const ext = extname(filePath).toLowerCase();
        const map: Record<string, string> = {
          '.pdf': 'application/pdf',
          '.jpg': 'image/jpeg',
          '.jpeg': 'image/jpeg',
          '.png': 'image/png',
          '.eml': 'message/rfc822',
          '.txt': 'text/plain',
          '.rtf': 'application/rtf',
          '.mp4': 'video/mp4',
          '.mov': 'video/quicktime',
          '.avi': 'video/x-msvideo',
          '.mkv': 'video/x-matroska',
          '.m4v': 'video/mp4',
          '.mp3': 'audio/mpeg',
          '.wav': 'audio/wav',
          '.m4a': 'audio/mp4',
          '.aac': 'audio/aac',
          '.flac': 'audio/flac',
        };
        return resolve(map[ext] || 'application/octet-stream');
      }
      resolve(stdout.trim());
    });
  });
}
