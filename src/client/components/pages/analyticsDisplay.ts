export function analyticsBarWidth(value: number, maximum: number, logarithmic: boolean): number {
  if (!Number.isFinite(value) || !Number.isFinite(maximum) || maximum <= 0 || value <= 0) return 0;
  return Math.min(
    100,
    100 * (logarithmic ? Math.log1p(value) / Math.log1p(maximum) : value / maximum),
  );
}

export function annualDocumentCounts(rows: { period: string; total: number }[]) {
  const years = new Map<string, number>();
  for (const row of rows) {
    const year = /^\d{4}-\d{2}$/.test(row.period) ? row.period.slice(0, 4) : 'Unknown';
    years.set(year, (years.get(year) ?? 0) + row.total);
  }
  return [...years]
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => a.label.localeCompare(b.label));
}

export function decadeDocumentCounts(rows: { label: string; count: number }[]) {
  const decades = new Map<string, number>();
  for (const row of rows) {
    const label = /^\d{4}$/.test(row.label)
      ? `${Math.floor(Number(row.label) / 10) * 10}s`
      : 'Unknown';
    decades.set(label, (decades.get(label) ?? 0) + row.count);
  }
  return [...decades]
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => a.label.localeCompare(b.label));
}
