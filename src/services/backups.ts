import { apiClient } from "./apiClient";
import type { ApiEnvelope } from "../types/api";

export interface LocalBackup {
  id: string;
  createdAt: string;
  sizeBytes: number;
  sha256: string;
}

export interface BackupSyncKey {
  id: string;
  createdAt: string;
  expiresAt: string;
}

export async function getBackupSyncKeys() {
  return (
    await apiClient.get<ApiEnvelope<BackupSyncKey[]>>("/backups/sync-keys")
  ).data.data;
}

export async function createBackupSyncKey(currentPassword: string) {
  return (
    await apiClient.post<
      ApiEnvelope<{ id: string; token: string; expiresAt: string }>
    >("/backups/sync-keys", { currentPassword })
  ).data.data;
}

export async function revokeBackupSyncKey(id: string, currentPassword: string) {
  await apiClient.post(`/backups/sync-keys/${encodeURIComponent(id)}/revoke`, {
    currentPassword,
  });
}

export async function downloadWindowsBackupClient() {
  const response = await apiClient.get<Blob>("/backups/windows-client", {
    responseType: "blob",
  });
  const url = URL.createObjectURL(response.data);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "kata-backup-windows.ps1";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

export interface BackupOverview {
  enabled: boolean;
  backups: LocalBackup[];
  request: {
    state: "idle" | "queued" | "running" | "completed" | "failed";
    message?: string;
    updatedAt?: string;
  };
}

export interface BackupSettingsOverview {
  applied: {
    id: string | null;
    schedule: string;
    keepLast: number;
    source: "default" | "ui";
    installed: boolean;
    updatedAt?: string;
  };
  pending: { id: string; schedule: string; keepLast: number } | null;
  status: {
    state: "idle" | "pending" | "applying" | "applied" | "failed";
    message?: string;
    updatedAt?: string;
  };
}

export async function getBackupSettings() {
  return (
    await apiClient.get<ApiEnvelope<BackupSettingsOverview>>(
      "/backups/settings",
    )
  ).data.data;
}

export async function updateBackupSettings(
  schedule: string,
  keepLast: number,
  currentPassword: string,
) {
  return (
    await apiClient.post<ApiEnvelope<{ id: string; state: "pending" }>>(
      "/backups/settings",
      { schedule, keepLast, currentPassword },
    )
  ).data.data;
}

export async function getBackups(): Promise<BackupOverview> {
  const response = await apiClient.get<ApiEnvelope<BackupOverview>>("/backups");
  return response.data.data;
}

export async function createBackup(currentPassword: string) {
  await apiClient.post("/backups", { currentPassword });
}

export async function downloadBackup(
  backup: LocalBackup,
  currentPassword: string,
  onProgress: (percent: number) => void,
) {
  const response = await apiClient.post<Blob>(
    `/backups/${encodeURIComponent(backup.id)}/download`,
    { currentPassword },
    {
      responseType: "blob",
      onDownloadProgress: ({ loaded, total }) => {
        if (total)
          onProgress(Math.min(100, Math.round((loaded / total) * 100)));
      },
    },
  );
  const url = URL.createObjectURL(response.data);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `kata-${backup.id}.tar`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  // Give the browser time to hand the Blob to its download manager.
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
