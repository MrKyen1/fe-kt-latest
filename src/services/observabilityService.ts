import { ApiEnvelope, PaginationQuery } from "../types/api";
import { apiClient, unwrapData, unwrapList } from "./apiClient";

export interface LogQuery extends PaginationQuery {
  requestId?: string;
  method?: string;
  statusCode?: number;
  path?: string;
  userId?: string;
  action?: string;
  resource?: string;
  resourceId?: string;
  from?: string;
  to?: string;
}

function logService(path: string) {
  return {
    async list(params?: LogQuery) {
      return unwrapList(await apiClient.get<ApiEnvelope<unknown[]>>(path, { params }));
    },

    async get(id: string) {
      return unwrapData(await apiClient.get<ApiEnvelope<unknown>>(`${path}/${id}`));
    },
  };
}

export const observabilityService = {
  requestLogs: logService("/request-logs"),
  auditLogs: logService("/audit-logs"),
};

