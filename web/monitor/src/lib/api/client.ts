import type { AnalyticsRangeKey, AnalyticsResponse, HealthResponse, StatusResponse } from '../types/api';

interface ErrorPayload {
  error?: string;
}

export interface MonitorRequestContext {
  projectDir?: string;
  authorBreakdown?: boolean;
}

async function requestJson<T>(path: string, context: MonitorRequestContext = {}): Promise<T> {
  const headers: Record<string, string> = {
    Accept: 'application/json',
  };
  if (context.projectDir) {
    headers['X-Moraine-Project-Dir'] = context.projectDir;
  }
  const response = await fetch(path, {
    headers,
  });

  if (!response.ok) {
    let errorMessage: string | undefined;
    const contentType = response.headers.get('content-type') ?? '';

    if (contentType.includes('application/json')) {
      try {
        const data = (await response.json()) as ErrorPayload;
        errorMessage = data.error;
      } catch {
        errorMessage = undefined;
      }
    }

    throw new Error(errorMessage || `request failed (${response.status})`);
  }

  return (await response.json()) as T;
}

export function fetchHealth(context: MonitorRequestContext = {}): Promise<HealthResponse> {
  return requestJson<HealthResponse>('/api/v1/health', context);
}

export function fetchStatus(context: MonitorRequestContext = {}): Promise<StatusResponse> {
  return requestJson<StatusResponse>('/api/v1/status?history=120', context);
}

export function fetchAnalytics(
  range: AnalyticsRangeKey,
  context: MonitorRequestContext = {},
): Promise<AnalyticsResponse> {
  const params = new URLSearchParams({ range });
  if (context.authorBreakdown) params.set('breakdown', 'author');
  return requestJson<AnalyticsResponse>(`/api/v1/analytics?${params.toString()}`, context);
}
