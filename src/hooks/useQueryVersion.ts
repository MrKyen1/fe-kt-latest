import { useEffect, useState } from "react";
import { getQueryVersion, subscribeQueryInvalidation } from "../services/queryCache";

/** Refresh mounted consumers of individual records after dependent writes. */
export function useQueryVersion(endpoint: string) {
  const [revision, setRevision] = useState(0);
  useEffect(() => subscribeQueryInvalidation(endpoint, () => setRevision(value => value + 1)), [endpoint]);
  return `${revision}:${getQueryVersion(endpoint)}`;
}
