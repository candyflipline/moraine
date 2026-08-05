import { describe, expect, it } from 'vitest';
import {
  contextFromUrl,
  readTeamProjectDir,
  rememberTeamProjectDir,
  scopeUrl,
  TEAM_PROJECT_STORAGE_KEY,
} from './dataScope';

describe('monitor data scope', () => {
  it('keeps the default dashboard personal', () => {
    expect(contextFromUrl('http://127.0.0.1:7749/')).toEqual({});
  });

  it('turns a bookmarkable project URL into routed author analytics', () => {
    expect(
      contextFromUrl(
        'http://127.0.0.1:7749/?project_dir=%2FUsers%2Falice%2Fsrc%2Fteam-project',
      ),
    ).toEqual({
      projectDir: '/Users/alice/src/team-project',
      authorBreakdown: true,
    });
  });

  it('switches scopes without dropping unrelated URL state', () => {
    const team = scopeUrl(
      'http://127.0.0.1:7749/?debug=1',
      'team',
      '/Users/alice/src/team-project',
    );
    expect(team).toBe(
      'http://127.0.0.1:7749/?debug=1&project_dir=%2FUsers%2Falice%2Fsrc%2Fteam-project',
    );
    expect(scopeUrl(team!, 'personal')).toBe('http://127.0.0.1:7749/?debug=1');
    expect(scopeUrl(team!, 'team', '   ')).toBeNull();
  });

  it('keeps bookmark-based team mode usable when browser storage is blocked', () => {
    const blockedStorage = {
      getItem: () => {
        throw new Error('storage blocked');
      },
      setItem: () => {
        throw new Error('storage blocked');
      },
    };

    expect(readTeamProjectDir(blockedStorage)).toBeNull();
    expect(() => rememberTeamProjectDir(blockedStorage, '/team')).not.toThrow();
  });

  it('remembers the last routed team project', () => {
    const values = new Map<string, string>();
    const storage = {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
    };

    rememberTeamProjectDir(storage, '/team');
    expect(values.get(TEAM_PROJECT_STORAGE_KEY)).toBe('/team');
    expect(readTeamProjectDir(storage)).toBe('/team');
  });
});
