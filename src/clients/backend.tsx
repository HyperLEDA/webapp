import axios from "axios";

export const API_BASE_URL = "http://89.169.133.242";

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

export interface QueryParams {
  page?: number;
  pageSize?: number;
}

export interface QueryResponse {
  objects: PGCObject[];
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

  private constructor() {}

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
  }): Promise<QueryResponse> {
    try {
      const response = await this.axiosInstance.get<APIResponse<QueryResponse>>(
        "/api/v1/query/simple",
        { params }
      );
      return {
        objects: response.data.data.objects || [],
      };
    } catch (error) {
      console.error("Error in querySimple:", error);
      throw error;
    }
  }
}

export const backendClient = HyperLEDAClient.getInstance();
