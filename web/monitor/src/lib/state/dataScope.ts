import type { MonitorRequestContext } from '../api/client';

export type DataScope = 'personal' | 'team';

export const PROJECT_DIR_QUERY_PARAM = 'project_dir';
export const TEAM_PROJECT_STORAGE_KEY = 'moraine.monitor.teamProjectDir';

type ProjectDirStorage = Pick<Storage, 'getItem' | 'setItem'>;

export function contextFromUrl(url: string): MonitorRequestContext {
  const projectDir = new URL(url).searchParams.get(PROJECT_DIR_QUERY_PARAM)?.trim();
  return projectDir ? { projectDir, authorBreakdown: true } : {};
}

export function scopeUrl(
  currentUrl: string,
  scope: DataScope,
  teamProjectDir?: string | null,
): string | null {
  const url = new URL(currentUrl);
  if (scope === 'personal') {
    url.searchParams.delete(PROJECT_DIR_QUERY_PARAM);
    return url.toString();
  }

  const projectDir = teamProjectDir?.trim();
  if (!projectDir) return null;
  url.searchParams.set(PROJECT_DIR_QUERY_PARAM, projectDir);
  return url.toString();
}

export function readTeamProjectDir(storage: ProjectDirStorage): string | null {
  try {
    return storage.getItem(TEAM_PROJECT_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function rememberTeamProjectDir(storage: ProjectDirStorage, projectDir: string): void {
  try {
    storage.setItem(TEAM_PROJECT_STORAGE_KEY, projectDir);
  } catch {
    // A bookmarkable team URL still works when browser storage is unavailable.
  }
}
