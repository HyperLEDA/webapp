export const API_BASE_URL = "http://89.169.133.242/api/v1/query/simple";

export interface PGCObject {
  pgc: number;
  catalogs: Catalogs;
}

export interface Catalogs {
  designation: Designation;
  icrs: ICRS;
  redshift: Redshift;
}

export interface Designation {
  design: string;
}

export interface ICRS {
  ra: number;
  dec: number;
  e_ra: number;
  e_dec: number;
}

export interface Redshift {
  cz: number;
  e_cz: number;
}
