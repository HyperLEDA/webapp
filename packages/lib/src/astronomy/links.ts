export function getSourceLink(bibcode: string): string {
  return `https://ui.adsabs.harvard.edu/abs/${bibcode}/abstract`;
}

export function sqlQueryLink(sql: string): string {
  return `/sql?q=${encodeURIComponent(sql)}`;
}
