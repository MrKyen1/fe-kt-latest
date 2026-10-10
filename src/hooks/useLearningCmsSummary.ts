import { useEffect, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { apiClient, unwrapData } from "../services/apiClient";
import type { ApiEnvelope } from "../types/api";
import { getQueryVersion } from "../services/queryCache";
import { useQueryVersion } from "./useQueryVersion";

type CmsSummary = Record<"levels" | "skills" | "topics" | "tags" | "mediaAssets" | "readingPassages" | "questions" | "exams" | "curriculums" | "draftExams", number>;
const endpoint = "/learning/cms-summary";
const cache = new Map<string, { data: CmsSummary; expiresAt: number }>();

/** Counts are independent of the active tab, list filters and pagination. */
export function useLearningCmsSummary(specializationId?: string, enabled = true) {
  const actor = useAuth().user?.id ?? "public";
  const revision = useQueryVersion(endpoint);
  const generation = getQueryVersion(endpoint);
  const key = JSON.stringify([actor, specializationId, generation]);
  const [result, setResult] = useState<{ key: string; data: CmsSummary }>();
  const [failure, setFailure] = useState<string>();
  useEffect(() => {
    if (!enabled || !specializationId) return;
    let current = true;
    const controller = new AbortController();
    const cached = cache.get(key);
    setFailure(undefined);
    if (cached && cached.expiresAt > Date.now()) {
      setResult({ key, data: cached.data });
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const data = unwrapData(await apiClient.get<ApiEnvelope<CmsSummary>>(endpoint, {
          params: { specializationId }, signal: controller.signal,
        }));
        if (!current || generation !== getQueryVersion(endpoint)) return;
        if (cache.size >= 50) cache.delete(cache.keys().next().value!);
        cache.set(key, { data, expiresAt: Date.now() + 15_000 });
        setResult({ key, data });
      } catch {
        if (current && !controller.signal.aborted) setFailure(key);
      }
    }, 150);
    return () => { current = false; clearTimeout(timer); controller.abort(); };
  }, [key, revision, specializationId, generation, enabled]);
  const data = enabled && result?.key === key ? result.data : undefined;
  return { data, error: failure === key, loading: enabled && !data && failure !== key };
}
