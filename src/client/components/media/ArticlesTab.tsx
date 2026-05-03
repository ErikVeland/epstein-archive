import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Icon from '@client/components/common/Icon';
import { useBackLinkState } from '@client/hooks/useReliableBackNavigation';
import { Article } from './ArticleCard';
import {
  Badge,
  Box,
  Button,
  Flex,
  Grid,
  LqText,
  SearchField,
  Select,
  Stack,
  Surface,
} from '@client/design-system/lib';
import { EmptyCorpus } from '../common/EmptyCorpus';
import styles from './ArticlesTab.module.css';

interface PublicationStats {
  name: string;
  count: number;
  avgRedFlag: number;
}

type ArticleApiItem = Record<string, unknown>;

type ArticleContent = Article & {
  content: string;
};

const asString = (value: unknown, fallback = ''): string =>
  typeof value === 'string' ? value : fallback;

const asNumber = (value: unknown, fallback = 0): number =>
  typeof value === 'number'
    ? value
    : typeof value === 'string' && value.trim().length > 0 && Number.isFinite(Number(value))
      ? Number(value)
      : fallback;

export const ArticlesTab: React.FC = () => {
  const navigate = useNavigate();
  const backLinkState = useBackLinkState();
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPublication, setSelectedPublication] = useState<string | null>(null);
  const [showPublicationDropdown, setShowPublicationDropdown] = useState(false);
  const [sortOrder, setSortOrder] = useState<'date' | 'redFlag'>('redFlag');

  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [apiUnavailable, setApiUnavailable] = useState(false);

  const fetchArticles = useCallback(
    async (pageNum: number, isReset: boolean = false) => {
      try {
        setLoading(true);
        const params = new URLSearchParams({
          page: pageNum.toString(),
          limit: '12',
          sort: sortOrder,
        });

        if (searchTerm) params.append('search', searchTerm);
        if (selectedPublication) params.append('publication', selectedPublication);

        const response = await fetch(`/api/articles?${params.toString()}`);

        if (!response.ok) {
          if (isReset) {
            setArticles([]);
            setApiUnavailable(true);
          }
          return;
        }

        const { data, pagination } = await response.json();

        if (Array.isArray(data)) {
          const normalized: ArticleContent[] = data.map((item: ArticleApiItem) => ({
            id: asNumber(item.id),
            title: asString(item.title),
            url: asString(item.link ?? item.url),
            author: asString(item.author, 'Unknown'),
            publication: asString(item.source ?? item.publication, 'Unknown'),
            published_date: asString(item.pub_date ?? item.published_date),
            summary: asString(item.description ?? item.summary),
            content: asString(item.content ?? item.description ?? item.summary),
            tags: asString(item.tags),
            redFlagRating: asNumber(item.redFlagRating, 0),
            imageUrl:
              item.image_url == null && item.imageUrl == null
                ? null
                : asString(item.image_url ?? item.imageUrl),
            reading_time:
              item.reading_time == null && item.readingTime == null
                ? undefined
                : asString(item.reading_time ?? item.readingTime),
          }));

          setArticles((prev) => (isReset ? normalized : [...prev, ...normalized]));
          setHasMore(Math.ceil(pagination.total / pagination.limit) > pageNum);
        } else {
          if (isReset) setArticles([]);
        }
      } catch (error) {
        console.error('Error fetching articles:', error);
        if (isReset) setArticles([]);
      } finally {
        setLoading(false);
      }
    },
    [searchTerm, selectedPublication, sortOrder],
  );

  useEffect(() => {
    setArticles([]);
    setPage(1);
    fetchArticles(1, true);
  }, [searchTerm, selectedPublication, sortOrder, fetchArticles]);

  const handleLoadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchArticles(nextPage);
  };

  const publications = useMemo((): PublicationStats[] => {
    const pubMap = new Map<string, { count: number; totalRedFlag: number }>();
    for (const article of articles) {
      const pub = article.publication || 'Unknown';
      const existing = pubMap.get(pub) || { count: 0, totalRedFlag: 0 };
      pubMap.set(pub, {
        count: existing.count + 1,
        totalRedFlag: existing.totalRedFlag + (article.redFlagRating || 0),
      });
    }
    return Array.from(pubMap.entries())
      .map(([name, stats]) => ({
        name,
        count: stats.count,
        avgRedFlag: stats.count > 0 ? stats.totalRedFlag / stats.count : 0,
      }))
      .sort((a, b) => b.count - a.count);
  }, [articles]);

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return '';
      return d.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return '';
    }
  };

  return (
    <Box className={styles.wrapper}>
      {/* Header */}
      <Surface variant="glass" className={styles.header}>
        <Flex justify="between" align="center" gap="md" fullWidth>
          <Flex align="center" gap="md">
            <Box className={styles.iconBox}>
              <Icon name="Newspaper" size="lg" />
            </Box>
            <Stack gap="none">
              <LqText variant="h2" weight="bold">
                Press Archive
              </LqText>
              <LqText variant="xs" color="muted" style={{ textTransform: 'uppercase' }}>
                Media Monitoring • Forensic Verification
              </LqText>
            </Stack>
          </Flex>

          <Flex align="center" gap="sm" className={styles.headerControls}>
            <SearchField
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search articles..."
              rootClassName={styles.searchField}
              density="compact"
            />
            <LqText variant="xs" weight="bold" color="muted" className={styles.sortLabel}>
              SORT
            </LqText>
            <Select
              size="sm"
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value as 'date' | 'redFlag')}
              options={[
                { value: 'redFlag', label: 'Red Flag Rating' },
                { value: 'date', label: 'Date Published' },
              ]}
              rootClassName={styles.sortField}
            />
          </Flex>
        </Flex>

        {/* Mobile Nav */}
        <Box className={styles.mobileNav}>
          <Button
            variant="glass"
            onClick={() => setShowPublicationDropdown(!showPublicationDropdown)}
          >
            <Flex justify="between" align="center" grow>
              <Flex align="center" gap="sm">
                <Icon name="Filter" size="sm" />
                <LqText variant="small" weight="bold">
                  {selectedPublication || 'All Publications'}
                </LqText>
              </Flex>
              {showPublicationDropdown ? (
                <Icon name="ChevronUp" size="sm" />
              ) : (
                <Icon name="ChevronDown" size="sm" />
              )}
            </Flex>
          </Button>
          {showPublicationDropdown && (
            <Surface variant="glass-highlight" className={styles.mobileDropdown}>
              <Stack gap="xs" p="xs">
                <Button
                  variant={!selectedPublication ? 'primary' : 'ghost'}
                  size="sm"
                  onClick={() => {
                    setSelectedPublication(null);
                    setShowPublicationDropdown(false);
                  }}
                >
                  <Flex justify="between" align="center" grow>
                    <LqText variant="small">All Publications</LqText>
                    <Badge variant="muted" label={articles.length} />
                  </Flex>
                </Button>
                {publications.map((pub) => (
                  <Button
                    key={pub.name}
                    variant={selectedPublication === pub.name ? 'primary' : 'ghost'}
                    size="sm"
                    onClick={() => {
                      setSelectedPublication(pub.name);
                      setShowPublicationDropdown(false);
                    }}
                  >
                    <Flex justify="between" align="center" grow>
                      <LqText variant="small">{pub.name}</LqText>
                      <Badge variant="muted" label={pub.count} />
                    </Flex>
                  </Button>
                ))}
              </Stack>
            </Surface>
          )}
        </Box>
      </Surface>

      <Flex className={styles.body} grow>
        {/* Sidebar */}
        <Box className={styles.sidebarWrapper}>
          <Stack gap="md">
            <Flex align="center" gap="sm" px="sm">
              <LqText
                variant="xs"
                weight="bold"
                color="muted"
                style={{ textTransform: 'uppercase' }}
              >
                Publications
              </LqText>
            </Flex>
            <Stack gap="xs">
              <Button
                variant={!selectedPublication ? 'glass-highlight' : 'ghost'}
                size="sm"
                onClick={() => setSelectedPublication(null)}
              >
                <Flex justify="between" align="center" grow>
                  <LqText variant="small" weight={!selectedPublication ? 'bold' : 'medium'}>
                    All Publications
                  </LqText>
                  <Badge variant="muted" label={articles.length} />
                </Flex>
              </Button>
              {publications.map((pub) => (
                <Button
                  key={pub.name}
                  variant={selectedPublication === pub.name ? 'glass-highlight' : 'ghost'}
                  size="sm"
                  onClick={() => setSelectedPublication(pub.name)}
                >
                  <Flex justify="between" align="center" grow>
                    <LqText
                      variant="small"
                      weight={selectedPublication === pub.name ? 'bold' : 'medium'}
                    >
                      {pub.name}
                    </LqText>
                    <Badge variant="muted" label={pub.count} />
                  </Flex>
                </Button>
              ))}
            </Stack>
          </Stack>
        </Box>

        {/* Main Content */}
        <Box className={styles.mainContent} style={{ flex: 1 }}>
          {loading && articles.length === 0 ? (
            <Flex align="center" justify="center" fullHeight>
              <div className={styles.spinner} />
            </Flex>
          ) : (
            <Stack gap="xl" p="xl">
              {articles.length === 0 ? (
                <EmptyCorpus
                  icon="Newspaper"
                  title={apiUnavailable ? 'Articles Not Available' : 'No Articles Found'}
                  body={
                    apiUnavailable
                      ? 'The articles API is not responding. News articles and press coverage are scraped and ingested separately — run the articles ingestion pipeline to populate this section.'
                      : searchTerm || selectedPublication
                        ? 'No articles match the current search or publication filter. Try clearing the filters to see all indexed articles.'
                        : 'No news articles have been indexed yet. Run the articles ingestion pipeline to load press coverage into the corpus.'
                  }
                />
              ) : (
                <Grid cols={{ sm: 1, md: 2, lg: 3 }} gap="xl">
                  {articles.map((article) => (
                    <Surface
                      key={article.id}
                      variant="glass"
                      className={styles.articleCard}
                      onClick={() =>
                        navigate(`/media/article/${article.id}`, { state: backLinkState })
                      }
                    >
                      <Box className={styles.hero}>
                        {article.imageUrl ? (
                          <img src={article.imageUrl} alt="" className={styles.heroImage} />
                        ) : (
                          <Flex align="center" justify="center" className={styles.heroFallback}>
                            <Icon name="Newspaper" size="xl" className={styles.iconMuted} />
                          </Flex>
                        )}
                        <Box className={styles.heroOverlay} />
                        {article.redFlagRating > 0 && (
                          <Box className={styles.redFlagContainer}>
                            <Flex gap="xs">
                              {Array.from({ length: Math.min(article.redFlagRating, 5) }).map(
                                (_, i) => (
                                  <Box key={i} className={styles.redFlag}>
                                    🚩
                                  </Box>
                                ),
                              )}
                            </Flex>
                          </Box>
                        )}
                        <Box className={styles.pubBadge}>
                          <Badge variant="accent" label={article.publication} />
                        </Box>
                      </Box>

                      <Stack p="md" gap="md">
                        <Stack gap="xs">
                          <LqText variant="small" weight="bold">
                            {article.title}
                          </LqText>
                          <LqText variant="xs" color="muted">
                            {article.summary || 'Analytical summary pending...'}
                          </LqText>
                        </Stack>

                        <Flex align="center" justify="between" mt="auto">
                          <Flex align="center" gap="sm">
                            <Box className={styles.avatar}>
                              {article.author?.slice(0, 1) || 'U'}
                            </Box>
                            <Stack gap="none">
                              <LqText variant="xs" weight="bold">
                                {article.author || 'Unknown'}
                              </LqText>
                              <Flex align="center" gap="xs">
                                <Icon name="Calendar" size="xs" className={styles.iconMuted} />
                                <LqText variant="xs" color="muted">
                                  {formatDate(article.published_date)}
                                </LqText>
                              </Flex>
                            </Stack>
                          </Flex>
                          {article.reading_time && (
                            <Flex align="center" gap="xs">
                              <Icon name="Clock" size="xs" className={styles.iconMuted} />
                              <LqText variant="xs" color="muted">
                                {article.reading_time}
                              </LqText>
                            </Flex>
                          )}
                        </Flex>

                        {article.tags && (
                          <Flex gap="xs" wrap="wrap">
                            {article.tags
                              .split(',')
                              .slice(0, 3)
                              .map((tag, i) => (
                                <Badge key={i} variant="muted" label={tag.trim()} />
                              ))}
                          </Flex>
                        )}
                      </Stack>
                    </Surface>
                  ))}
                </Grid>
              )}

              {hasMore && (
                <Flex justify="center" pt="xl">
                  <Button variant="glass" size="lg" onClick={handleLoadMore} loading={loading}>
                    Load More Intelligence
                  </Button>
                </Flex>
              )}
            </Stack>
          )}
        </Box>
      </Flex>
    </Box>
  );
};

export default ArticlesTab;
