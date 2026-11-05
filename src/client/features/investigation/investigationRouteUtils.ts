const caseRoutePattern =
  /^\/(?:investigations\/|investigate\/case\/)([^/]+)(?:\/evidence\/([^/?#]+))?/;

export function getCanonicalInvestigationPath(pathname: string, shareId: string | number): string {
  const evidenceId = pathname.match(caseRoutePattern)?.[2];
  const base = `/investigations/${encodeURIComponent(String(shareId))}`;
  return evidenceId ? `${base}/evidence/${evidenceId}` : base;
}

export function getSelectedCaseEvidenceId(
  pathname: string,
  search: string,
  selectedId: string | null,
  selectedUuid?: string | null,
): string | null {
  if (!selectedId) return null;
  const match = pathname.match(caseRoutePattern);
  if (!match || (match[1] !== selectedId && match[1] !== selectedUuid)) return null;
  return match[2] || new URLSearchParams(search).get('evidenceId');
}

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
