import { getApiPool } from './connection.js';
import { logger } from '../services/Logger.js';

export const articleRepository = {
  // Insert an article into the database
  insertArticle: async (article: Record<string, unknown>) => {
    const pool = getApiPool();
    const sql = `
      INSERT INTO articles (
        title, link, description, content, pub_date, author, source, image_url, guid, red_flag_rating
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10
      )
      ON CONFLICT(link) DO UPDATE SET
        title = EXCLUDED.title,
        description = EXCLUDED.description,
        content = EXCLUDED.content,
        updated_at = CURRENT_TIMESTAMP
    `;

    try {
      await pool.query(sql, [
        article.title,
        article.link,
        article.description || '',
        article.content || '',
        article.pubDate,
        article.author || 'Unknown',
        article.source || 'rss',
        article.imageUrl || null,
        article.guid || article.link,
        article.redFlagRating || 0,
      ]);
    } catch (error) {
      logger.error({ err: error }, 'Error inserting article');
    }
  },

  // Get all articles
  getArticles: async () => {
    const pool = getApiPool();
    const res = await pool.query(`
      SELECT * FROM articles 
      ORDER BY red_flag_rating DESC, pub_date DESC
    `);

    const articles = res.rows;

    return articles.map((a) => ({
      id: a.id,
      title: a.title,
      url: a.link,
      author: a.author,
      publication: a.source, // Map source -> publication
      published_date: a.pub_date, // Map pub_date -> published_date
      summary: a.description, // Map description -> summary
      content: a.content,
      tags: '', // Articles from RSS don't have tags column yet, return empty
      redFlagRating: a.red_flag_rating,
      created_at: a.created_at,
    }));
  },
};
