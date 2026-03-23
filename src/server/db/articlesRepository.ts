import { articlesQueries } from '@epstein/db';
import { getApiPool } from './connection.js';
import { logger } from '../services/Logger.js';

export interface Article {
  id: string;
  title: string;
  link?: string;
  url?: string;
  source?: string;
  publication?: string;
  pubDate?: string;
  description?: string;
  summary?: string;
  tags?: string;
  redFlagRating?: number;
  imageUrl?: string;
  readingTime?: string;
}

interface InsertArticleInput {
  title: string;
  link: string;
  description?: string;
  content?: string;
  pubDate?: string | null;
  author?: string;
  source?: string;
  imageUrl?: string | null;
  guid?: string;
  redFlagRating?: number;
}

export class ArticlesRepository {
  /**
   * Get paginated articles with optional filters
   */
  async getArticles(
    limit: number = 50,
    offset: number = 0,
    search?: string,
    publication?: string,
    sort: 'date' | 'redFlag' = 'redFlag',
  ): Promise<{ articles: Article[]; total: number }> {
    const [articles, countResult] = await Promise.all([
      articlesQueries.getArticles.run(
        {
          limit: BigInt(limit),
          offset: BigInt(offset),
          search: search ? `%${search}%` : null,
          publication: publication || null,
          sortBy: sort,
        },
        getApiPool(),
      ),
      articlesQueries.countArticles.run(
        {
          search: search ? `%${search}%` : null,
          publication: publication || null,
        },
        getApiPool(),
      ),
    ]);

    return {
      articles: articles.map((a) => ({
        ...a,
        id: String(a.id),
      })),
      total: Number(countResult[0]?.total || 0),
    };
  }

  async getArticleById(id: number | string): Promise<Article | undefined> {
    const rows = await articlesQueries.getArticleById.run({ id: BigInt(id) }, getApiPool());
    if (!rows[0]) return undefined;
    return {
      ...rows[0],
      id: String(rows[0].id),
    };
  }

  /**
   * Insert or update an article (Consolidated from legacy articleRepository)
   */
  async insertArticle(article: InsertArticleInput): Promise<void> {
    try {
      await articlesQueries.insertArticle.run(
        {
          title: article.title,
          link: article.link,
          description: article.description || '',
          content: article.content || '',
          pubDate: article.pubDate || null,
          author: article.author || 'Unknown',
          source: article.source || 'rss',
          imageUrl: article.imageUrl || null,
          guid: article.guid || article.link,
          redFlagRating: article.redFlagRating || 0,
        },
        getApiPool(),
      );
    } catch (error) {
      logger.error({ err: error }, '[ArticlesRepository] Error inserting article');
      throw error;
    }
  }
}

export const articlesRepository = new ArticlesRepository();
