export const outlineStyles = `
  .ghcm-outline {
    display: flex;
    flex-direction: column;
    gap: 2px;
    height: 100%;
    min-height: 0;
    overflow: auto;
    padding: 0;
    scrollbar-width: thin;
    scrollbar-color: rgba(101, 109, 118, 0.36) transparent;
  }

  .ghcm-outline::-webkit-scrollbar {
    width: 6px;
    height: 6px;
  }

  .ghcm-outline::-webkit-scrollbar-track {
    background: transparent;
  }

  .ghcm-outline::-webkit-scrollbar-thumb {
    border-radius: 999px;
    background: rgba(101, 109, 118, 0.36);
  }

  .ghcm-outline::-webkit-scrollbar-thumb:hover {
    background: rgba(101, 109, 118, 0.5);
  }

  .ghcm-outline-group + .ghcm-outline-group {
    margin-top: 12px;
  }

  .ghcm-outline-group-title {
    margin: 0 0 6px;
    font-size: 11px;
    font-weight: 600;
    line-height: 16px;
    color: var(--ghcm-ink-muted);
  }

  .ghcm-outline-link {
    --ghcm-level-accent: var(--ghcm-h4);
    appearance: none;
    display: grid;
    grid-template-columns: 2px minmax(0, 1fr);
    align-items: start;
    gap: 8px;
    width: 100%;
    border: none;
    background: transparent;
    border-radius: 6px;
    padding: 5px 8px 5px calc(8px + (var(--ghcm-depth, 0) * 12px));
    cursor: pointer;
    text-align: left;
    transition: background-color 120ms ease, opacity 120ms ease;
  }

  .ghcm-outline-link[data-level="1"] {
    --ghcm-level-accent: var(--ghcm-h1);
  }

  .ghcm-outline-link[data-level="2"] {
    --ghcm-level-accent: var(--ghcm-h2);
  }

  .ghcm-outline-link[data-level="3"] {
    --ghcm-level-accent: var(--ghcm-h3);
  }

  .ghcm-outline-link[data-level="4"] {
    --ghcm-level-accent: var(--ghcm-h4);
  }

  .ghcm-outline-link[data-level="5"] {
    --ghcm-level-accent: var(--ghcm-h5);
  }

  .ghcm-outline-link[data-level="6"] {
    --ghcm-level-accent: var(--ghcm-h6);
  }

  .ghcm-outline-link:hover {
    background: var(--ghcm-surface-subtle);
  }

  .ghcm-outline-link.is-active {
    background: var(--ghcm-surface-accent);
  }

  .ghcm-outline-link.is-muted {
    opacity: 0.62;
  }

  .ghcm-outline-rail {
    display: block;
    min-height: 1.3em;
    border-radius: 999px;
    background: var(--ghcm-line);
    transition: background-color 120ms ease, opacity 120ms ease;
  }

  .ghcm-outline-link.is-collapsed .ghcm-outline-rail {
    background: var(--ghcm-line-muted);
  }

  .ghcm-outline-link.is-active .ghcm-outline-rail {
    background: var(--ghcm-level-accent);
  }

  .ghcm-outline-label {
    display: block;
    min-width: 0;
    color: var(--ghcm-ink-soft);
    font-size: 12px;
    font-weight: 400;
    line-height: 1.5;
    overflow-wrap: anywhere;
  }

  .ghcm-outline-link.is-active .ghcm-outline-label {
    color: var(--ghcm-ink);
    font-weight: 600;
  }

  .ghcm-outline-empty {
    margin: 0;
    padding: 8px 0;
    color: var(--ghcm-ink-muted);
    font-size: 12px;
    line-height: 1.5;
  }

  .ghcm-root.is-overlay .ghcm-outline-link {
    border-radius: 8px;
    padding: 7px 10px 7px calc(10px + (var(--ghcm-depth, 0) * 14px));
  }

  .ghcm-root.is-overlay .ghcm-outline-label {
    font-size: 13px;
  }

  .ghcm-root.is-docked .ghcm-outline {
    gap: 1px;
  }

  .ghcm-root.is-docked .ghcm-outline-link {
    border-radius: 0;
    padding: 4px 0 4px calc(var(--ghcm-depth, 0) * 12px);
  }

  .ghcm-root.is-docked .ghcm-outline-group-title {
    margin-bottom: 4px;
  }
`;
