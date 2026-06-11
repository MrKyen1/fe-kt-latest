export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface ApiEnvelope<T> {
  success: boolean;
  data: T;
  meta?: PaginationMeta;
  requestId: string;
  timestamp: string;
}

export interface ApiListResult<T> {
  data: T[];
  meta?: PaginationMeta;
}

export interface ApiErrorBody {
  success: false;
  statusCode: number;
  errorCode: string;
  message: string;
  details?: unknown[];
  fieldErrors?: Record<string, string | string[]>;
  path?: string;
  requestId?: string;
  timestamp?: string;
}

export class ApiError extends Error {
  statusCode?: number;
  errorCode?: string;
  details?: unknown[];
  fieldErrors?: Record<string, string | string[]>;
  requestId?: string;

  constructor(message: string, body?: Partial<ApiErrorBody>) {
    super(message);
    this.name = "ApiError";
    this.statusCode = body?.statusCode;
    this.errorCode = body?.errorCode;
    this.details = body?.details;
    this.fieldErrors = body?.fieldErrors;
    this.requestId = body?.requestId;
  }
}

export type SortOrder = "ASC" | "DESC" | "asc" | "desc";

export interface PaginationQuery {
  page?: number;
  limit?: number;
  search?: string;
  isActive?: boolean;
  sortBy?: string;
  sortOrder?: SortOrder;
}

