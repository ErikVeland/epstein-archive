import fs from 'fs';
import crypto from 'crypto';
import { logger } from './Logger.js';
import { dataPath } from '../utils/pathResolver.js';

const OG_SCREENSHOT_CACHE_DIR = dataPath('og-route-cache');

interface BrowserPage {
  goto(url: string, options: { waitUntil: 'networkidle'; timeout: number }): Promise<void>;
  screenshot(options: { path: string; type: 'png' }): Promise<void>;
}

interface BrowserInstance {
  newPage(options: { viewport: { width: number; height: number } }): Promise<BrowserPage>;
  close(): Promise<void>;
}

interface ChromiumLike {
  launch(options: { headless: boolean }): Promise<BrowserInstance>;
}

export class OgService {
  static ogRouteCacheKey(routePath: string, searchParams: URLSearchParams): string {
    const params = new URLSearchParams(searchParams);
    params.delete('__og_shot');
    const canonical = `${routePath}?${params.toString()}`;
    return crypto.createHash('sha1').update(canonical).digest('hex');
  }

  static async ensureRouteOgScreenshot(
    baseUrl: string,
    routePath: string,
    searchParams: URLSearchParams,
  ): Promise<string | null> {
    try {
      if (!fs.existsSync(OG_SCREENSHOT_CACHE_DIR)) {
        fs.mkdirSync(OG_SCREENSHOT_CACHE_DIR, { recursive: true });
      }

      const key = this.ogRouteCacheKey(routePath, searchParams);
      const filename = `${key}.png`;
      const absPath = path.join(OG_SCREENSHOT_CACHE_DIR, filename);

      if (fs.existsSync(absPath)) return absPath;

      let chromium: ChromiumLike | undefined;
      try {
        const pw = await import('@playwright/test');
        chromium = (pw as Record<string, unknown>).chromium as ChromiumLike | undefined;
      } catch {
        return null;
      }
      if (!chromium) return null;

      const targetUrl = new URL(routePath, baseUrl);
      const params = new URLSearchParams(searchParams);
      params.set('__og_shot', '1');
      targetUrl.search = params.toString();

      const browser = await chromium.launch({ headless: true });
      try {
        const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });
        await page.goto(targetUrl.toString(), {
          waitUntil: 'networkidle',
          timeout: 15000,
        });
        await page.screenshot({
          path: absPath,
          type: 'png',
        });
      } finally {
        await browser.close();
      }

      return fs.existsSync(absPath) ? absPath : null;
    } catch (error) {
      logger.warn({ err: error }, '[OG screenshot] generation failed');
      return null;
    }
  }
}
