import { lazy, type ComponentType } from "react";
import { isApiReady, showMaintenance } from "../services/apiClient";

const RELOAD_KEY = "kata:page-chunk-reload";

function storage(action: (store: Storage) => string | null | void) {
  try {
    return action(window.sessionStorage);
  } catch {
    return null; // private mode / blocked storage: skip the reload guard
  }
}

const pending = () => new Promise<never>(() => {});

/**
 * React.lazy for pages, recovering from chunk load failures: during a deploy
 * Nginx blocks /assets (show the maintenance overlay, reload when back), and
 * after an FE release old hashed chunk names are gone (reload once).
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function lazyPage<T extends ComponentType<any>>(
  load: () => Promise<{ default: T }>,
) {
  return lazy(async () => {
    try {
      const page = await load();
      storage((store) => store.removeItem(RELOAD_KEY));
      return page;
    } catch (error) {
      if (!(await isApiReady())) {
        showMaintenance(true);
        return pending();
      }
      if (storage((store) => store.getItem(RELOAD_KEY)) === null) {
        storage((store) => store.setItem(RELOAD_KEY, "1"));
        window.location.reload();
        return pending();
      }
      throw error; // already reloaded once: let the error boundary explain it
    }
  });
}
