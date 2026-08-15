export function getSourceLink(bibcode: string): string {
  return `https://ui.adsabs.harvard.edu/abs/${bibcode}/abstract`;
}

export function originalDataCatalogLink(sql: string): string {
  return `/data-catalog/query?q=${encodeURIComponent(sql)}`;
}
