export function originalDataCatalogLink(sql: string): string {
  return `/data-catalog/query?q=${encodeURIComponent(sql)}`;
}
