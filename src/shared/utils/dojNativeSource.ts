/** Accept only a native EFTA file on the official DOJ archive host. */
export function getDojNativeSourceUrl(
  metadata: Record<string, unknown> | null | undefined,
): string | null {
  if (typeof metadata?.doj_url !== 'string') return null;
  try {
    const url = new URL(metadata.doj_url);
    if (
      url.protocol !== 'https:' ||
      url.hostname !== 'www.justice.gov' ||
      url.port ||
      url.username ||
      url.password ||
      url.search ||
      url.hash
    )
      return null;
    const match = decodeURIComponent(url.pathname).match(
      /^\/epstein\/files\/DataSet \d+\/(EFTA\d{8})\.(mp4|m4v|mov|avi|wmv|mpeg|mpg|ts|3gp|mp3|m4a|wav|ogg|aac|flac|xls|xlsx|csv|vob|opus|amr)$/i,
    );
    if (!match || (metadata.source_id && metadata.source_id !== match[1])) return null;
    return url.href;
  } catch {
    return null;
  }
}
