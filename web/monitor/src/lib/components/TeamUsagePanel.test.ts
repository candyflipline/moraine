import { render, screen, within } from '@testing-library/svelte';
import { describe, expect, it } from 'vitest';
import TeamUsagePanel from './TeamUsagePanel.svelte';

describe('TeamUsagePanel', () => {
  it('renders reconciled author and model usage without conversation content', () => {
    render(TeamUsagePanel, {
      props: {
        usage: {
          totals: { conversations: 5, turns: 18, tokens: 42_000, models: 2 },
          authors: [
            {
              author: 'alice@example.com',
              conversations: 4,
              turns: 15,
              tokens: 40_000,
              models: [
                {
                  model: 'gpt-5.3-codex-xhigh',
                  conversations: 4,
                  turns: 15,
                  tokens: 40_000,
                },
              ],
            },
            {
              author: null,
              conversations: 1,
              turns: 3,
              tokens: 2_000,
              models: [
                {
                  model: 'claude-opus',
                  conversations: 1,
                  turns: 3,
                  tokens: 2_000,
                },
              ],
            },
          ],
        },
      },
    });

    expect(screen.getByText('Team Usage')).toBeInTheDocument();
    expect(screen.getByText('Unattributed')).toBeInTheDocument();
    expect(screen.getByText('alice@example.com')).toBeInTheDocument();
    expect(screen.getByText('gpt-5.3-codex-xhigh')).toBeInTheDocument();
    const totals = screen.getByLabelText('Team totals');
    expect(within(totals).getByText('42K')).toBeInTheDocument();
    expect(screen.getByText(/Conversation content is not loaded/)).toBeInTheDocument();
  });
});
