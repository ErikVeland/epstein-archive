interface OriginalDocumentUrlOptions {
  assetSha256?: string | null;
  download?: boolean;
}

export function getOriginalDocumentUrl(
  documentId: string | number,
  options: OriginalDocumentUrlOptions = {},
): string {
  const params = new URLSearchParams({ variant: 'original' });
  if (options.assetSha256) params.set('assetSha256', options.assetSha256);
  if (options.download) params.set('download', '1');
  return `/api/documents/${encodeURIComponent(String(documentId))}/file?${params.toString()}`;
}

export function downloadOriginalDocument(
  documentId: string | number,
  filename?: string | null,
  assetSha256?: string | null,
): void {
  const link = document.createElement('a');
  link.href = getOriginalDocumentUrl(documentId, { assetSha256, download: true });
  if (filename) link.download = filename;
  link.rel = 'noopener';
  document.body.appendChild(link);
  link.click();
  link.remove();
}
