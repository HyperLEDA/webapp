export function buildPhotometryTotalSqlQuery(pgc: number): string {
  return `SELECT
  r.pgc
, pt.band
, cb.magsys
, pt.method
, b.waveref AS wavelength
, pt.mag
, pt.e_mag
, bib.code AS bibcode
FROM photometry.total AS pt
  JOIN layer0.records AS r ON pt.record_id = r.id
  JOIN layer0.tables AS t ON r.table_id = t.id
  JOIN common.bib AS bib ON t.bib = bib.id
  JOIN photometry.calib_bands AS cb ON pt.band = cb.id
  JOIN photometry.bands AS b ON cb.band = b.id
WHERE r.pgc = ${pgc}`;
}

export function buildEquatorialSqlQuery(pgc: number): string {
  return `SELECT
  r.pgc
, i.ra
, i.dec
, i.e_ra
, i.e_dec
, bib.code AS bibcode
FROM icrs.data AS i
  JOIN layer0.records AS r ON i.record_id = r.id
  JOIN layer0.tables AS t ON r.table_id = t.id
  JOIN common.bib AS bib ON t.bib = bib.id
WHERE r.pgc = ${pgc}`;
}

export function buildRedshiftSqlQuery(pgc: number): string {
  return `SELECT
  r.pgc
, c.cz
, c.e_cz
, bib.code AS bibcode
FROM cz.data AS c
  JOIN layer0.records AS r ON c.record_id = r.id
  JOIN layer0.tables AS t ON r.table_id = t.id
  JOIN common.bib AS bib ON t.bib = bib.id
WHERE r.pgc = ${pgc}`;
}
