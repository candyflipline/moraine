<script lang="ts">
  import { get } from 'svelte/store';
  import { onMount } from 'svelte';
  import AnalyticsPanel from './lib/components/AnalyticsPanel.svelte';
  import IngestProgressPanel from './lib/components/IngestProgressPanel.svelte';
  import StatusStrip from './lib/components/StatusStrip.svelte';
  import TeamUsagePanel from './lib/components/TeamUsagePanel.svelte';
  import SessionsPanel from './lib/components/sessions/SessionsPanel.svelte';
  import TopBar from './lib/components/TopBar.svelte';
  import {
    fetchAnalytics,
    fetchHealth,
    fetchStatus,
    type MonitorRequestContext,
  } from './lib/api/client';
  import { fetchSessions } from './lib/api/sessions';
  import { FAST_POLL_INTERVAL_MS, SLOW_POLL_INTERVAL_MS } from './lib/constants';
  import { analyticsRangeStore } from './lib/state/monitor';
  import {
    contextFromUrl,
    readTeamProjectDir,
    rememberTeamProjectDir,
    scopeUrl,
    type DataScope,
  } from './lib/state/dataScope';
  import {
    filteredSessionsStore,
    sessionsErrorStore,
    sessionsFilterStore,
    sessionsLoadingStore,
    sessionsStore,
  } from './lib/state/sessions';
  import { initializeTheme, setTheme, themeStore } from './lib/state/theme';
  import type {
    AnalyticsRangeKey,
    AnalyticsResponse,
    HealthResponse,
    StatusResponse,
  } from './lib/types/api';
  import type { Harness, Session, SessionsFilter } from './lib/types/sessions';
  import type { ThemeMode } from './lib/types/ui';

  const SESSIONS_POLL_INTERVAL_MS = 30_000;

  let healthData: HealthResponse | null = null;
  let healthError: string | null = null;

  let statusData: StatusResponse | null = null;
  let statusError: string | null = null;

  let analyticsPayload: AnalyticsResponse | null = null;
  let analyticsError: string | null = null;
  let analyticsLoading = false;

  let dataScope: DataScope = 'personal';
  let requestContext: MonitorRequestContext = {};
  let teamProjectDir: string | null = null;

  $: teamAvailable = Boolean(teamProjectDir);
  $: teamUsageError =
    dataScope === 'team' && analyticsPayload?.ok && !analyticsPayload.usage && !analyticsError
      ? 'Team usage was not returned by the selected backend.'
      : analyticsError;

  $: sessions = $sessionsStore;
  $: filteredSessions = $filteredSessionsStore;
  $: sessionsFilter = $sessionsFilterStore;
  $: sessionsLoading = $sessionsLoadingStore;
  $: sessionsError = $sessionsErrorStore;

  $: sessionModels = deriveModels(sessions);
  $: sessionHarnesses = deriveHarnesses(sessions);

  function deriveModels(list: Session[]): string[] {
    const set = new Set<string>();
    for (const s of list) {
      for (const m of s.models) set.add(m);
    }
    return [...set].sort();
  }

  function deriveHarnesses(list: Session[]): Harness[] {
    const map = new Map<string, Harness>();
    for (const s of list) {
      if (!map.has(s.harness.id)) map.set(s.harness.id, s.harness);
    }
    return [...map.values()].sort((a, b) => a.label.localeCompare(b.label));
  }

  function errorMessage(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
  }

  async function loadHealth(): Promise<void> {
    try {
      healthData = await fetchHealth(requestContext);
      healthError = null;
    } catch (error) {
      healthError = errorMessage(error);
      healthData = null;
    }
  }

  async function loadStatus(): Promise<void> {
    try {
      statusData = await fetchStatus(requestContext);
      statusError = null;
    } catch (error) {
      statusError = errorMessage(error);
      statusData = null;
    }
  }

  async function loadAnalytics(): Promise<void> {
    analyticsLoading = true;
    try {
      analyticsPayload = await fetchAnalytics(get(analyticsRangeStore), requestContext);
      analyticsError = null;
    } catch (error) {
      analyticsError = `Analytics unavailable: ${errorMessage(error)}`;
    } finally {
      analyticsLoading = false;
    }
  }

  async function loadSessions(): Promise<void> {
    sessionsLoadingStore.set(true);
    try {
      const list = await fetchSessions();
      sessionsStore.set(list);
      sessionsErrorStore.set(null);
    } catch (error) {
      sessionsErrorStore.set(`Sessions unavailable: ${errorMessage(error)}`);
    } finally {
      sessionsLoadingStore.set(false);
    }
  }

  async function hydrateFast(): Promise<void> {
    if (dataScope === 'team') {
      await loadHealth();
      return;
    }
    await Promise.all([loadHealth(), loadStatus()]);
  }

  async function hydrateSlow(): Promise<void> {
    if (dataScope === 'team') {
      await loadAnalytics();
      return;
    }
    await Promise.all([loadAnalytics(), loadSessions()]);
  }

  async function handleRangeChange(event: CustomEvent<AnalyticsRangeKey>): Promise<void> {
    analyticsRangeStore.set(event.detail);
    await loadAnalytics();
  }

  function handleSetTheme(event: CustomEvent<ThemeMode>): void {
    setTheme(event.detail);
  }

  function handleSetScope(event: CustomEvent<DataScope>): void {
    const nextUrl = scopeUrl(window.location.href, event.detail, teamProjectDir);
    if (nextUrl) window.location.assign(nextUrl);
  }

  function handleFilterChange(event: CustomEvent<SessionsFilter>): void {
    sessionsFilterStore.set(event.detail);
  }

  onMount(() => {
    initializeTheme();
    requestContext = contextFromUrl(window.location.href);
    if (requestContext.projectDir) {
      dataScope = 'team';
      teamProjectDir = requestContext.projectDir;
      rememberTeamProjectDir(window.localStorage, requestContext.projectDir);
    } else {
      dataScope = 'personal';
      teamProjectDir = readTeamProjectDir(window.localStorage);
    }

    void hydrateFast();
    void hydrateSlow();

    const fastInterval = window.setInterval(() => {
      void hydrateFast();
    }, FAST_POLL_INTERVAL_MS);

    const slowInterval = window.setInterval(() => {
      void loadAnalytics();
    }, SLOW_POLL_INTERVAL_MS);

    const sessionsInterval =
      dataScope === 'personal'
        ? window.setInterval(() => {
            void loadSessions();
          }, SESSIONS_POLL_INTERVAL_MS)
        : null;

    return () => {
      window.clearInterval(fastInterval);
      window.clearInterval(slowInterval);
      if (sessionsInterval !== null) window.clearInterval(sessionsInterval);
    };
  });
</script>

<div class="app-shell">
  <TopBar
    theme={$themeStore}
    {dataScope}
    {teamAvailable}
    on:setTheme={handleSetTheme}
    on:setScope={handleSetScope}
  />

  <main class="layout">
    <StatusStrip
      health={healthData}
      {healthError}
      status={statusData}
      {statusError}
      showIngestor={dataScope === 'personal'}
    />
    {#if dataScope === 'personal'}
      <IngestProgressPanel status={statusData} theme={$themeStore} />
    {:else}
      <TeamUsagePanel
        usage={analyticsPayload?.usage ?? null}
        loading={analyticsLoading}
        errorMessage={teamUsageError}
      />
    {/if}

    <AnalyticsPanel
      payload={analyticsPayload}
      selectedRange={$analyticsRangeStore}
      errorMessage={analyticsError}
      theme={$themeStore}
      on:rangeChange={handleRangeChange}
    />

    {#if dataScope === 'personal'}
      <SessionsPanel
        sessions={sessions}
        filtered={filteredSessions}
        filter={sessionsFilter}
        models={sessionModels}
        harnesses={sessionHarnesses}
        loading={sessionsLoading}
        errorMessage={sessionsError}
        on:filterChange={handleFilterChange}
      />
    {/if}
  </main>
</div>
