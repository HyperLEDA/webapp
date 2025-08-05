import axios from "axios";

export const API_BASE_URL = "http://dm2.sao.ru:81";

export interface SearchPGCObject {
  pgc: number;
  catalogs: SearchCatalogs;
}

export interface SearchCatalogs {
  designation: SearchDesignation;
  icrs: EquatorialCoordinates;
  redshift: Redshift;
}

export interface SearchDesignation {
  design: string;
}

export interface PGCObject {
  pgc: number;
  catalogs: Catalogs;
}

export interface Catalogs {
  designation: Designation;
  coordinates: Coordinates;
  velocity: Velocity;
}

export interface Designation {
  name: string;
}

export interface Coordinates {
  equatorial: EquatorialCoordinates;
  galactic: GalacticCoordinates;
}

export interface EquatorialCoordinates {
  ra: number;
  dec: number;
  e_ra: number;
  e_dec: number;
}

export interface GalacticCoordinates {
  lon: number;
  lat: number;
  e_lon: number;
  e_lat: number;
}

export interface Velocity {
  heliocentric: HeliocentricVelocity;
  redshift: Redshift;
}

export interface HeliocentricVelocity {
  v: number;
  e_v: number;
}

export interface Redshift {
  z: number;
  e_z: number;
}

export interface QueryParams {
  page?: number;
  pageSize?: number;
}

export interface QueryResponse {
  objects: SearchPGCObject[];
}

export interface QuerySimpleResponse {
  objects: PGCObject[];
  schema: Schema;
}

export interface Schema {
  units: Units;
}

export interface Units {
  coordinates: CoordinateUnits;
  velocity: VelocityUnits;
}

export interface CoordinateUnits {
  equatorial: EquatorialUnits;
  galactic: GalacticUnits;
}

export interface EquatorialUnits {
  ra: string;
  dec: string;
  e_ra: string;
  e_dec: string;
}

export interface GalacticUnits {
  lon: string;
  lat: string;
  e_lon: string;
  e_lat: string;
}

export interface VelocityUnits {
  heliocentric: HeliocentricVelocityUnits;
}

export interface HeliocentricVelocityUnits {
  v: string;
  e_v: string;
}

export interface APIResponse<T> {
  data: T;
}

export class HyperLEDAClient {
  private static instance: HyperLEDAClient;
  private axiosInstance = axios.create({
    baseURL: API_BASE_URL,
    paramsSerializer: {
      indexes: null,
    },
  });

  private constructor() { }

  public static getInstance(): HyperLEDAClient {
    if (!HyperLEDAClient.instance) {
      HyperLEDAClient.instance = new HyperLEDAClient();
    }
    return HyperLEDAClient.instance;
  }

  public async query(
    queryString: string,
    page: number = 0,
    pageSize: number = 25
  ): Promise<QueryResponse> {
    try {
      const response = await this.axiosInstance.get<APIResponse<QueryResponse>>(
        "/api/v1/query",
        {
          params: {
            q: queryString,
            page: page,
            page_size: pageSize,
          },
        }
      );
      return {
        objects: response.data.data.objects || [],
      };
    } catch (error) {
      console.error("Error in query:", error);
      throw error;
    }
  }

  public async querySimple(params: {
    pgcs?: number[];
    ra?: number;
    dec?: number;
    radius?: number;
    name?: string;
    cz?: number;
    cz_err_percent?: number;
    page?: number;
    page_size?: number;
  }): Promise<QuerySimpleResponse> {
    try {
      const response = await this.axiosInstance.get<APIResponse<QuerySimpleResponse>>(
        "/api/v1/query/simple",
        { params }
      );
      return response.data.data;
    } catch (error) {
      console.error("Error in querySimple:", error);
      throw error;
    }
  }

  public async queryByPGC(
    pgcNumbers: number[],
    page: number = 0,
    pageSize: number = 25
  ): Promise<QuerySimpleResponse> {
    try {
      const response = await this.axiosInstance.get<APIResponse<QuerySimpleResponse>>(
        "/api/v1/query/simple",
        {
          params: {
            pgcs: pgcNumbers,
            page: page,
            page_size: pageSize,
          },
        }
      );
      return response.data.data;
    } catch (error) {
      console.error("Error in queryByPGC:", error);
      throw error;
    }
  }
}

export const backendClient = HyperLEDAClient.getInstance();
