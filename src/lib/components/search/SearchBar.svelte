<script lang="ts">
  import { Search, X, Tag } from 'lucide-svelte';
  import { getGalleryService, getAuthService } from '../../services/context';
  import { fetchTagSuggestions } from '../../api/booruClient';
  import type { TagSuggestion } from '../../api/types';
  import { parseTagsString, formatTagName } from '../../utils/tagParser';

  let gallery = getGalleryService();
  let auth = getAuthService();

  let activeTags = $state<string[]>([]);
  let draftText = $state<string>('');
  let suggestions = $state<TagSuggestion[]>([]);
  let showSuggestions = $state<boolean>(false);
  let activeIndex = $state<number>(-1);
  let debounceTimer: ReturnType<typeof setTimeout>;

  let lastSyncedQuery: string | null = null;

  $effect(() => {
    if (lastSyncedQuery !== gallery.searchQuery) {
      activeTags = parseTagsString(gallery.searchQuery);
      draftText = '';
      lastSyncedQuery = gallery.searchQuery;
    }
  });

  function handleInput() {
    clearTimeout(debounceTimer);

    const currentWord = draftText.trim();
    if (!currentWord || currentWord.length < 2 || currentWord.startsWith('-') || currentWord.includes(':')) {
      suggestions = [];
      showSuggestions = false;
      return;
    }

    debounceTimer = setTimeout(async () => {
      const creds = auth.credentials;
      if (creds) {
        suggestions = await fetchTagSuggestions(creds, currentWord);
        showSuggestions = suggestions.length > 0;
        activeIndex = -1;
      }
    }, 200);
  }

  function commitSearch() {
    const fullQuery = [...activeTags, draftText.trim()].filter(Boolean).join(' ');
    if (lastSyncedQuery === fullQuery) return;
    lastSyncedQuery = fullQuery;
    gallery.search(fullQuery);
  }

  function selectSuggestion(sugg: TagSuggestion) {
    if (!activeTags.includes(sugg.name)) {
      activeTags = [...activeTags, sugg.name];
    }
    draftText = '';
    suggestions = [];
    showSuggestions = false;
    commitSearch();
  }

  function handleKeydown(e: KeyboardEvent) {
    if (showSuggestions && suggestions.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        activeIndex = (activeIndex + 1) % suggestions.length;
        return;
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        activeIndex = (activeIndex - 1 + suggestions.length) % suggestions.length;
        return;
      } else if (e.key === 'Enter' && activeIndex >= 0) {
        e.preventDefault();
        selectSuggestion(suggestions[activeIndex]);
        return;
      } else if (e.key === 'Escape') {
        showSuggestions = false;
        return;
      }
    }

    if (e.key === ' ' || e.key === 'Enter') {
      if (draftText.trim()) {
        e.preventDefault();
        const newTag = draftText.trim();
        if (!activeTags.includes(newTag)) {
          activeTags = [...activeTags, newTag];
        }
        draftText = '';
        showSuggestions = false;
        commitSearch();
      } else if (e.key === 'Enter') {
        e.preventDefault();
        showSuggestions = false;
        commitSearch();
      }
    } else if (e.key === 'Backspace' && !draftText && activeTags.length > 0) {
      activeTags = activeTags.slice(0, -1);
      commitSearch();
    }
  }

  function removeChip(tagToRemove: string) {
    activeTags = activeTags.filter(t => t !== tagToRemove);
    commitSearch();
  }

  function clearSearch() {
    activeTags = [];
    draftText = '';
    suggestions = [];
    showSuggestions = false;
    lastSyncedQuery = '';
    gallery.search('');
  }
</script>

<div class="search-container">
  <div class="search-input-wrapper">
    <button class="search-icon-btn" onclick={commitSearch} title="Искать">
      <Search size={15} class="search-icon" />
    </button>

    {#each activeTags as tag (tag)}
      <span class="tag-chip">
        <Tag size={10} />
        <span class="chip-name">{formatTagName(tag)}</span>
        <button class="chip-remove" onclick={() => removeChip(tag)} title="Удалить тег">
          <X size={10} />
        </button>
      </span>
    {/each}

    <input
      type="text"
      bind:value={draftText}
      oninput={handleInput}
      onkeydown={handleKeydown}
      onfocus={handleInput}
      placeholder={activeTags.length > 0 ? "Добавить тег..." : "Поиск по тегам (напр. cat_ears rating:general)..."}
      autocomplete="off"
    />

    {#if activeTags.length > 0 || draftText}
      <button class="clear-btn" onclick={clearSearch} title="Очистить всё">
        <X size={14} />
      </button>
    {/if}
  </div>

  {#if showSuggestions && suggestions.length > 0}
    <div class="suggestions-dropdown animate-fade-in">
      {#each suggestions as sugg, i (sugg.name + i)}
        <button
          class="suggestion-item"
          class:active={i === activeIndex}
          onclick={() => selectSuggestion(sugg)}
        >
          <span class="sugg-name category-{sugg.type}">{sugg.name}</span>
          {#if sugg.count > 0}
            <span class="sugg-count">{sugg.count.toLocaleString()}</span>
          {/if}
        </button>
      {/each}
    </div>
  {/if}
</div>

<style>
  .search-container {
    position: relative;
    width: 100%;
    max-width: 680px;
    margin: 0 auto;
  }

  .search-input-wrapper {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 0.35rem;
    padding: 0.3rem 0.65rem;
    background: var(--bg-surface-elevated);
    border-radius: var(--radius-full);
    min-height: 40px;
    transition: all var(--transition-fast);
  }

  .search-input-wrapper:hover,
  .search-input-wrapper:focus-within {
    background: var(--bg-app);
  }

  .search-icon-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    background: transparent;
    border: none;
    padding: 0.2rem 0.3rem;
    cursor: pointer;
    color: var(--text-muted);
    transition: color var(--transition-fast);
  }

  .search-icon-btn:hover {
    color: var(--text-primary);
  }

  .tag-chip {
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    padding: 0.15rem 0.5rem;
    background: var(--bg-app);
    border-radius: var(--radius-full);
    font-size: 0.78rem;
    color: var(--text-primary);
    white-space: nowrap;
  }

  .chip-remove {
    color: var(--text-muted);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 1px;
    border-radius: 50%;
    background: transparent;
    border: none;
    cursor: pointer;
    transition: color var(--transition-fast), background var(--transition-fast);
  }

  .chip-remove:hover {
    color: var(--color-error);
    background: rgba(239, 68, 68, 0.15);
  }

  input {
    flex: 1;
    min-width: 100px;
    background: transparent;
    border: none;
    outline: none;
    color: var(--text-primary);
    font-size: 0.88rem;
    padding: 0.2rem 0;
  }

  input::placeholder {
    color: var(--text-muted);
    opacity: 0.7;
  }

  .clear-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0.2rem;
    color: var(--text-muted);
    border-radius: 50%;
    background: transparent;
    border: none;
    cursor: pointer;
    transition: color var(--transition-fast), background var(--transition-fast);
  }

  .clear-btn:hover {
    color: var(--text-primary);
    background: rgba(255, 255, 255, 0.1);
  }

  .suggestions-dropdown {
    position: absolute;
    top: calc(100% + 0.4rem);
    left: 0;
    right: 0;
    z-index: 100;
    max-height: 320px;
    overflow-y: auto;
    background: var(--bg-surface-elevated);
    border-radius: var(--radius-md);
    box-shadow: var(--shadow-lg);
    padding: 0.4rem;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .suggestion-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.5rem 0.75rem;
    border-radius: var(--radius-sm);
    text-align: left;
    transition: background var(--transition-fast);
    background: transparent;
    border: none;
    color: var(--text-primary);
    cursor: pointer;
  }

  .suggestion-item:hover, .suggestion-item.active {
    background: rgba(255, 255, 255, 0.08);
  }

  .sugg-name {
    font-size: 0.88rem;
    font-weight: 500;
  }

  .category-general { color: var(--tag-general); }
  .category-artist { color: var(--tag-artist); }
  .category-copyright { color: var(--tag-copyright); }
  .category-character { color: var(--tag-character); }
  .category-meta { color: var(--tag-meta); }

  .sugg-count {
    font-size: 0.75rem;
    color: var(--text-muted);
    font-family: var(--font-mono);
  }

  @media (max-width: 768px) {
    .search-input-wrapper {
      padding: 0.25rem 0.5rem;
      min-height: 36px;
      gap: 0.25rem;
    }

    input {
      font-size: 0.82rem;
      min-width: 60px;
    }

    .tag-chip {
      max-width: 90px;
      font-size: 0.72rem;
      padding: 0.1rem 0.35rem;
      flex-shrink: 0;
    }

    .chip-name {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      max-width: 60px;
    }

    .suggestions-dropdown {
      max-height: 240px;
    }
  }
</style>
