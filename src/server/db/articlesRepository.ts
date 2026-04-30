import { articlesQueries } from '@epstein/db';
import { getApiPool } from './connection.js';
import { logger } from '../services/Logger.js';

export interface Article {
  id: string;
  title: string;
  link?: string | null;
  url?: string | null;
  source?: string | null;
  publication?: string | null;
  pubDate?: string | null;
  description?: string | null;
  summary?: string | null;
  tags?: string | null;
  redFlagRating?: number | null;
  imageUrl?: string | null;
  readingTime?: string | null;
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

interface ArticleListRow extends Omit<Article, 'id' | 'pubDate'> {
  id: string | number;
  pubDate?: Date | string | null;
}

const dateToIso = (value: Date | string | null | undefined): string | null => {
  if (!value) return null;
  return value instanceof Date ? value.toISOString() : value;
};

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
          limit: limit,
          offset: offset,
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
      articles: (articles as ArticleListRow[]).map((a) => ({
        ...a,
        id: String(a.id),
        pubDate: dateToIso(a.pubDate),
      })),
      total: Number(countResult[0]?.total || 0),
    };
  }

  async getArticleById(id: number | string): Promise<Article | undefined> {
    const rows = await articlesQueries.getArticleById.run({ id: String(id) }, getApiPool());
    if (!rows[0]) return undefined;
    return {
      ...rows[0],
      id: String(rows[0].id),
      imageUrl: rows[0].image_url as string | null,
      pubDate: rows[0].pub_date ? rows[0].pub_date.toISOString() : null,
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
