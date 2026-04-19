export const panelStyles = `
  .ghcm-trigger,
  .ghcm-panel,
  .ghcm-backdrop {
    font-family: inherit;
  }

  .ghcm-trigger {
    appearance: none;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    border: 1px solid var(--ghcm-line);
    background: var(--ghcm-surface);
    color: var(--ghcm-ink-soft);
    border-radius: 6px;
    box-shadow: 0 1px 0 rgba(31, 35, 40, 0.04);
    padding: 5px 12px;
    font-size: 12px;
    font-weight: 500;
    line-height: 20px;
    cursor: pointer;
    transition: background-color 120ms ease, border-color 120ms ease, color 120ms ease;
  }

  .ghcm-trigger:hover {
    background: var(--ghcm-surface-subtle);
    color: var(--ghcm-ink);
  }

  .ghcm-trigger.is-hidden {
    display: none;
  }

  .ghcm-backdrop {
    appearance: none;
    border: 0;
    padding: 0;
    display: none;
  }

  .ghcm-panel {
    display: none;
    flex-direction: column;
    min-height: 0;
  }

  .ghcm-panel.is-open {
    display: flex;
  }

  .ghcm-root.is-overlay .ghcm-trigger {
    position: fixed;
    top: calc(80px + env(safe-area-inset-top, 0px));
    right: 16px;
    z-index: 2147483644;
  }

  .ghcm-root.is-overlay .ghcm-backdrop {
    position: fixed;
    inset: 0;
    z-index: 2147483643;
    display: block;
    background: rgba(27, 31, 36, 0.38);
    opacity: 0;
    pointer-events: none;
    transition: opacity 160ms ease;
  }

  .ghcm-root.is-overlay .ghcm-backdrop.is-open {
    opacity: 1;
    pointer-events: auto;
  }

  .ghcm-root.is-overlay .ghcm-panel {
    position: fixed;
    top: calc(72px + env(safe-area-inset-top, 0px));
    right: 16px;
    bottom: 16px;
    width: min(320px, calc(100vw - 32px));
    z-index: 2147483644;
    background: var(--ghcm-surface);
    border: 1px solid var(--ghcm-line);
    border-radius: 12px;
    box-shadow:
      0 8px 24px var(--ghcm-shadow-strong),
      0 1px 0 rgba(31, 35, 40, 0.04);
    overflow: hidden;
    opacity: 0;
    transform: translateY(-4px);
    pointer-events: none;
    transition: opacity 160ms ease, transform 160ms ease;
  }

  .ghcm-root.is-overlay .ghcm-panel.is-open {
    opacity: 1;
    transform: translateY(0);
    pointer-events: auto;
  }

  .ghcm-root.is-docked .ghcm-panel {
    position: static;
    top: auto;
    left: auto;
    right: auto;
    bottom: auto;
    width: 100%;
    z-index: 2;
    border: none;
    background: var(--ghcm-surface);
    box-shadow: none;
    overflow: hidden;
    height: var(--ghcm-panel-height, auto);
    max-height: var(--ghcm-panel-max-height, none);
    will-change: auto;
  }

  .ghcm-root.is-docked.is-floating .ghcm-panel {
    position: fixed;
    top: var(--ghcm-panel-top, 0px);
    left: var(--ghcm-panel-left, 0px);
    width: var(--ghcm-panel-width, 100%);
  }

  .ghcm-root.is-inline .ghcm-panel {
    position: static;
    width: 100%;
    max-width: 100%;
    border: 1px solid var(--ghcm-line);
    border-radius: 6px;
    background: var(--ghcm-surface);
    box-shadow: 0 1px 0 rgba(31, 35, 40, 0.04);
    overflow: hidden;
  }

  .ghcm-sidebar-shell {
    display: flex;
    flex-direction: column;
    min-height: 0;
    height: 100%;
    background: var(--ghcm-surface);
  }

  .ghcm-root.is-docked .ghcm-sidebar-shell {
    height: 100%;
    max-height: inherit;
    background: var(--ghcm-surface);
    border-top: 1px solid var(--ghcm-line);
  }

  .ghcm-sidebar-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 12px;
    padding: 16px;
    border-bottom: 1px solid var(--ghcm-line);
  }

  .ghcm-root.is-docked .ghcm-sidebar-header {
    display: block;
    padding: 16px 0;
  }

  .ghcm-sidebar-kicker {
    margin: 0;
    font-size: 14px;
    font-weight: 600;
    line-height: 20px;
    color: var(--ghcm-ink);
  }

  .ghcm-sidebar-tools {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
    justify-content: flex-end;
  }

  .ghcm-root.is-docked .ghcm-sidebar-tools {
    margin-top: 4px;
    gap: 10px;
    justify-content: flex-start;
  }

  .ghcm-inline-action {
    appearance: none;
    border: none;
    background: transparent;
    color: var(--ghcm-accent);
    padding: 0;
    font-size: 12px;
    font-weight: 500;
    line-height: 20px;
    cursor: pointer;
    transition: color 120ms ease;
  }

  .ghcm-inline-action:hover {
    color: var(--ghcm-ink);
    text-decoration: underline;
  }

  .ghcm-inline-action.is-hidden {
    display: none;
  }

  .ghcm-sidebar-outline {
    flex: 1 1 auto;
    min-height: 0;
    padding: 12px;
  }

  .ghcm-root.is-docked .ghcm-sidebar-outline {
    overflow: hidden;
    padding: 16px 0 0;
  }

  .ghcm-root.is-inline .ghcm-sidebar-outline {
    max-height: min(45vh, 420px);
  }
`;
