<script lang="ts">
  import { formatCompactNumber } from '../utils/format';
  import type { AuthorUsageSnapshot } from '../types/api';

  export let usage: AuthorUsageSnapshot | null = null;
  export let loading = false;
  export let errorMessage: string | null = null;

  function authorLabel(author: string | null): string {
    return author?.trim() || 'Unattributed';
  }
</script>

<section class="panel team-usage" aria-labelledby="teamUsageTitle">
  <div class="team-usage-head">
    <div>
      <h2 id="teamUsageTitle">Team Usage</h2>
      <p class="muted">Aggregate activity only. Conversation content is not loaded in team mode.</p>
    </div>
  </div>

  {#if errorMessage}
    <p class="team-usage-error" role="alert">{errorMessage}</p>
  {:else if loading && !usage}
    <p class="muted">Loading team usage…</p>
  {:else if usage}
    <div class="usage-totals" aria-label="Team totals">
      <article><span>Conversations</span><strong>{formatCompactNumber(usage.totals.conversations)}</strong></article>
      <article><span>Turns</span><strong>{formatCompactNumber(usage.totals.turns)}</strong></article>
      <article><span>Tokens</span><strong>{formatCompactNumber(usage.totals.tokens)}</strong></article>
      <article><span>Models</span><strong>{formatCompactNumber(usage.totals.models)}</strong></article>
    </div>

    <div class="usage-table-wrap">
      <table class="usage-table">
        <thead>
          <tr>
            <th scope="col">User / model</th>
            <th scope="col">Conversations</th>
            <th scope="col">Turns</th>
            <th scope="col">Tokens</th>
          </tr>
        </thead>
        <tbody>
          {#each usage.authors as author}
            <tr class="usage-author-row">
              <th scope="row">{authorLabel(author.author)}</th>
              <td>{author.conversations.toLocaleString()}</td>
              <td>{author.turns.toLocaleString()}</td>
              <td>{author.tokens.toLocaleString()}</td>
            </tr>
            {#each author.models as model}
              <tr class="usage-model-row">
                <th scope="row"><span aria-hidden="true">↳</span> {model.model}</th>
                <td>{model.conversations.toLocaleString()}</td>
                <td>{model.turns.toLocaleString()}</td>
                <td>{model.tokens.toLocaleString()}</td>
              </tr>
            {/each}
          {/each}
        </tbody>
      </table>
    </div>
  {/if}
</section>
