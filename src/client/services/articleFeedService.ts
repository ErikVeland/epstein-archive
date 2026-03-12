export interface Article {
  title: string;
  link: string;
  description: string;
  pubDate: string;
  author: string;
  categories: string[];
  content: string;
  guid: string;
}

export class ArticleFeedService {
  private cache: Map<string, { articles: Article[]; timestamp: number }> = new Map();
  private readonly CACHE_TTL = 30 * 60 * 1000; // 30 minutes

  async fetchArticles(feedUrl: string, tagFilter?: string): Promise<Article[]> {
    const cacheKey = `${feedUrl}:${tagFilter || 'all'}`;
    const cached = this.cache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      console.log('Returning cached articles:', cached.articles.length);
      return cached.articles;
    }

    // List of CORS proxies to try
    const proxies = [
      `https://api.allorigins.win/get?url=${encodeURIComponent(feedUrl)}`,
      `https://corsproxy.io/?${encodeURIComponent(feedUrl)}`,
      `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(feedUrl)}`,
    ];

    for (let i = 0; i < proxies.length; i++) {
      try {
        console.log(`Fetching articles from: ${feedUrl} with proxy ${i + 1}: ${proxies[i]}`);

        const response = await fetch(proxies[i], {
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; EpsteinArchive/1.0; +http://example.com/bot)',
          },
        });

        console.log(`Proxy ${i + 1} response status:`, response.status);

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        let xmlText: string;
        if (proxies[i].includes('allorigins')) {
          const data = await response.json();
          xmlText = data.contents;
        } else {
          xmlText = await response.text();
        }

        console.log(`Proxy ${i + 1} data received, length:`, xmlText?.length);

        if (!xmlText || xmlText.length < 100) {
          throw new Error('Invalid or empty response from proxy');
        }

        const articles = this.parseRSS(xmlText, tagFilter);
        console.log(`Parsed articles from proxy ${i + 1}:`, articles.length);

        if (articles.length > 0) {
          this.cache.set(cacheKey, { articles, timestamp: Date.now() });
          return articles;
        }
      } catch (error) {
        console.error(`Error fetching articles with proxy ${i + 1}:`, error);
        // Continue to next proxy
      }
    }

    // Fallback to direct fetch if all proxies fail
    try {
      console.log('Trying direct fetch as final fallback...');
      const response = await fetch(feedUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; EpsteinArchive/1.0; +http://example.com/bot)',
        },
      });
      console.log('Direct fetch response status:', response.status);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const xmlText = await response.text();
      console.log('Direct fetch XML length:', xmlText.length);

      const articles = this.parseRSS(xmlText, tagFilter);
      console.log('Parsed articles from direct fetch:', articles.length);

      if (articles.length > 0) {
        this.cache.set(cacheKey, { articles, timestamp: Date.now() });
        return articles;
      }
    } catch (fallbackError) {
      console.error('All fetch methods failed:', fallbackError);
    }

    return [];
  }

  private parseRSS(xmlText: string, tagFilter?: string): Article[] {
    try {
      // Validate input
      if (!xmlText || xmlText.length < 50) {
        console.warn('RSS XML text is too short or empty');
        return [];
      }

      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(xmlText, 'text/xml');

      // Check for parsing errors
      const parserError = xmlDoc.getElementsByTagName('parsererror');
      if (parserError.length > 0) {
        console.error('RSS parsing error:', parserError[0].textContent);
        return [];
      }

      // Try different RSS/Atom formats
      let items: HTMLCollectionOf<Element>;

      // RSS 2.0 format
      items = xmlDoc.getElementsByTagName('item');
      if (items.length === 0) {
        // Atom format
        items = xmlDoc.getElementsByTagName('entry');
      }

      if (items.length === 0) {
        console.warn('No RSS items found in feed');
        return [];
      }

      const articles: Article[] = [];

      for (let i = 0; i < Math.min(items.length, 50); i++) {
        // Limit to 50 articles
        const item = items[i];
        let title, link, description, pubDate, author, guid, content;

        // Handle RSS 2.0 format
        if (item.tagName === 'item') {
          title = this.getElementText(item, 'title') || 'Untitled';
          link = this.getElementText(item, 'link') || '';
          description = this.getElementText(item, 'description') || '';
          pubDate =
            this.getElementText(item, 'pubDate') || this.getElementText(item, 'dc:date') || '';
          author =
            this.getElementText(item, 'author') ||
            this.getElementText(item, 'dc:creator') ||
            'Unknown';
          guid = this.getElementText(item, 'guid') || link;
          content = this.getElementText(item, 'content:encoded') || description;
        }
        // Handle Atom format
        else if (item.tagName === 'entry') {
          title = this.getElementText(item, 'title') || 'Untitled';
          const linkElement = item.getElementsByTagName('link')[0];
          link = linkElement ? linkElement.getAttribute('href') || '' : '';
          description = this.getElementText(item, 'summary') || '';
          const publishedElement = item.getElementsByTagName('published')[0];
          const updatedElement = item.getElementsByTagName('updated')[0];
          pubDate =
            (publishedElement ? publishedElement.textContent : '') ||
            (updatedElement ? updatedElement.textContent : '') ||
            '';
          const authorElement = item.getElementsByTagName('author')[0];
          const nameElement = authorElement ? authorElement.getElementsByTagName('name')[0] : null;
          author = nameElement ? nameElement.textContent || 'Unknown' : 'Unknown';
          guid = this.getElementText(item, 'id') || link;
          content = this.getElementText(item, 'content') || description;
        }

        // Extract categories/tags
        const categoryElements = item.getElementsByTagName('category');
        const categories: string[] = [];
        for (let j = 0; j < Math.min(categoryElements.length, 10); j++) {
          // Limit categories
          const category =
            categoryElements[j].textContent?.trim() ||
            categoryElements[j].getAttribute('term')?.trim();
          if (category) {
            categories.push(category);
          }
        }

        // Apply tag filter if specified (case-insensitive)
        // Search in title, description, and categories
        if (tagFilter) {
          const searchTerm = tagFilter.toLowerCase();
          const hasTag =
            title?.toLowerCase().includes(searchTerm) ||
            description?.toLowerCase().includes(searchTerm) ||
            content?.toLowerCase().includes(searchTerm) ||
            categories.some((cat) => cat.toLowerCase().includes(searchTerm));

          if (!hasTag) {
            continue;
          }
        }

        // Validate required fields
        if (!title || !link) {
          continue;
        }

        articles.push({
          title: this.cleanText(title),
          link,
          description: this.cleanText(description || ''),
          pubDate: pubDate || new Date().toISOString(),
          author: this.cleanText(author || ''),
          categories,
          content: this.cleanText(content || ''),
          guid: guid || link,
        });
      }

      // Sort by publication date (newest first)
      return articles.sort((a, b) => {
        const dateA = new Date(a.pubDate).getTime() || 0;
        const dateB = new Date(b.pubDate).getTime() || 0;
        return dateB - dateA;
      });
    } catch (error) {
      console.error('Error parsing RSS feed:', error);
      return [];
    }
  }

  private getElementText(parent: Element, tagName: string): string | null {
    const elements = parent.getElementsByTagName(tagName);
    if (elements.length > 0 && elements[0].textContent) {
      return elements[0].textContent.trim();
    }
    return null;
  }

  private cleanText(text: string): string {
    // Strip HTML tags and decode common HTML entities without executing scripts
    return text
      .replace(/<[^>]*>/g, '')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#039;/g, "'")
      .replace(/&apos;/g, "'")
      .replace(/&nbsp;/g, ' ')
      .replace(/&#(\d+);/g, (_m, n) => String.fromCharCode(Number(n)))
      .replace(/&#x([0-9a-f]+);/gi, (_m, h) => String.fromCharCode(parseInt(h, 16)));
  }

  formatPubDate(dateString: string): string {
    if (!dateString) return 'Unknown date';

    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

      if (diffDays === 0) {
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
        if (diffHours === 0) {
          const diffMinutes = Math.floor(diffMs / (1000 * 60));
          return diffMinutes <= 1 ? 'Just now' : `${diffMinutes} minutes ago`;
        }
        return diffHours === 1 ? '1 hour ago' : `${diffHours} hours ago`;
      } else if (diffDays === 1) {
        return 'Yesterday';
      } else if (diffDays < 7) {
        return `${diffDays} days ago`;
      } else if (diffDays < 30) {
        const weeks = Math.floor(diffDays / 7);
        return weeks === 1 ? '1 week ago' : `${weeks} weeks ago`;
      } else {
        return date.toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
        });
      }
    } catch {
      return dateString;
    }
  }

  truncateText(text: string, maxLength: number = 200): string {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength).trim() + '...';
  }
}
