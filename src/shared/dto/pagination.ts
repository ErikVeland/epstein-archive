export interface CursorMeta {
  total: number;
  limit: number;
  hasMore: boolean;
  nextCursor: string | null;
}

export interface CursorPaginatedResponse<T> {
  data: T[];
  meta: CursorMeta;
}
