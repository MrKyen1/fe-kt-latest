import { ApiEnvelope } from "../types/api";
import { AuditLog, LogQuery, RequestLog } from "../types/backend";
import { apiClient, unwrapData, unwrapList } from "./apiClient";

function logService<TLog>(path: string) {
  return {
    async list(params?: LogQuery) {
      return unwrapList(await apiClient.get<ApiEnvelope<TLog[]>>(path, { params }));
    },

    async get(id: string) {
      return unwrapData(await apiClient.get<ApiEnvelope<TLog>>(`${path}/${id}`));
    },
  };
}

export const observabilityService = {
  requestLogs: logService<RequestLog>("/request-logs"),
  auditLogs: logService<AuditLog>("/audit-logs"),
};
