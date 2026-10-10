type CachedPage = { data: any[]; total: number; meta?: Record<string, any>; expiresAt: number; endpoint: string; actor: string };
export const pageCache = new Map<string, CachedPage>();
const versions = new Map<string, number>();
const listeners = new Set<{ endpoint: string; notify: () => void }>();
let sequence = 0;
const matches = (endpoint: string, prefix: string) => endpoint === prefix || endpoint.startsWith(prefix + "/");

export function getQueryVersion(endpoint: string) {
  let version = 0;
  for (const [prefix, stamp] of versions) if (matches(endpoint, prefix)) version = Math.max(version, stamp);
  return version;
}

export function subscribeQueryInvalidation(endpoint: string, notify: () => void) {
  const listener = { endpoint, notify };
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

/** Invalidate every page/filter variant, including currently unmounted queries. */
export function invalidateQueries(prefixes: string[]) {
  const stamp = ++sequence;
  prefixes.forEach(prefix => versions.set(prefix, stamp));
  for (const [key, value] of pageCache) if (prefixes.some(prefix => matches(value.endpoint, prefix))) pageCache.delete(key);
  for (const listener of listeners) if (prefixes.some(prefix => matches(listener.endpoint, prefix))) listener.notify();
}

/** Successful writes invalidate the resource and its derived lists/counts. */
export function invalidateAfterMutation(url: string, method: string) {
  if (!["post", "put", "patch", "delete"].includes(method.toLowerCase())) return;
  const path = new URL(url, "http://query.local").pathname.replace(/^\/api\/v\d+/, "");
  if (path.startsWith("/auth/") && path !== "/auth/me") return;
  if (path.endsWith("/random-questions")) return; // Read-only preview POST.
  const resource = path.startsWith("/learning/") ? path.split("/").slice(0, 3).join("/") : "/" + path.split("/")[1];
  const prefixes = new Set([resource]);
  const add = (...items: string[]) => items.forEach(item => prefixes.add(item));
  if (["/users", "/centers", "/classes", "/specializations"].includes(resource) || path === "/auth/me") {
    add("/users", "/classes", "/centers", "/specializations", "/homepage/teachers", "/learning/teacher", "/learning/student", "/learning/leaderboard");
  }
  if (resource === "/specializations") add("/learning/cms-summary");
  if (path.startsWith("/learning/teacher/")) add("/learning/teacher", "/learning/student", "/classes", "/learning/leaderboard");
  else if (path.startsWith("/learning/student/")) add("/learning/student", "/learning/teacher", "/learning/leaderboard");
  else if (path.startsWith("/learning/")) {
    add("/learning/cms-summary", "/learning/questions", "/learning/exams", "/learning/curriculums", "/learning/teacher", "/learning/student", "/classes");
  }
  if (path.startsWith("/admin/homepage")) add("/admin/homepage", "/homepage");
  invalidateQueries([...prefixes]);
}
