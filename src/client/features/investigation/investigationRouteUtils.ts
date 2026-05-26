export function getCaseFolderEvidenceReturnPath(pathname: string, search: string): string | null {
  const pathMatch =
    pathname.match(/^\/investigate\/case\/([^/]+)\/evidence\/[^/?#]+/) ||
    pathname.match(/^\/investigations\/([^/]+)\/evidence\/[^/?#]+/);

  if (pathMatch?.[1]) {
    return `/investigations/${encodeURIComponent(pathMatch[1])}?tab=casefolder`;
  }

  const params = new URLSearchParams(search);
  if (!params.has('evidenceId')) return null;

  params.delete('evidenceId');
  params.set('tab', 'casefolder');
  const query = params.toString();
  return `${pathname}${query ? `?${query}` : ''}`;
}
