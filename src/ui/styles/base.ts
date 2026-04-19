export const baseStyles = `
  .ghcm-root {
    all: initial;
    display: block;
    width: 100%;
    font-family:
      -apple-system,
      BlinkMacSystemFont,
      "Segoe UI",
      "Noto Sans",
      "Helvetica Neue",
      Arial,
      sans-serif,
      "Apple Color Emoji",
      "Segoe UI Emoji";
    color: var(--fgColor-default, #1f2328);
    --ghcm-ink: var(--fgColor-default, #1f2328);
    --ghcm-ink-soft: var(--fgColor-muted, #59636e);
    --ghcm-ink-muted: var(--fgColor-muted, #656d76);
    --ghcm-line: var(--borderColor-default, #d0d7de);
    --ghcm-line-muted: var(--borderColor-muted, #d8dee4);
    --ghcm-surface: var(--bgColor-default, #ffffff);
    --ghcm-surface-subtle: var(--bgColor-muted, #f6f8fa);
    --ghcm-surface-accent: var(--bgColor-accent-muted, rgba(9, 105, 218, 0.08));
    --ghcm-shadow: rgba(31, 35, 40, 0.08);
    --ghcm-shadow-strong: rgba(31, 35, 40, 0.12);
    --ghcm-accent: var(--fgColor-accent, #0969da);
    --ghcm-h1: var(--fgColor-default, #24292f);
    --ghcm-h2: var(--fgColor-default, #24292f);
    --ghcm-h3: var(--fgColor-default, #24292f);
    --ghcm-h4: var(--fgColor-muted, #57606a);
    --ghcm-h5: var(--fgColor-muted, #57606a);
    --ghcm-h6: var(--fgColor-muted, #57606a);
  }

  .ghcm-root,
  .ghcm-root *,
  .ghcm-root *::before,
  .ghcm-root *::after {
    box-sizing: border-box;
  }

  .ghcm-cell {
    display: block;
    width: 100%;
  }

  .ghcm-dock-row,
  .ghcm-dock-cell {
    overflow: visible;
  }

  .ghcm-dock-row {
    border-top: 0 !important;
  }

  .ghcm-preceding-dock-row,
  .ghcm-preceding-dock-row > .BorderGrid-cell,
  .ghcm-preceding-dock-row > [class*="BorderGrid-cell"] {
    border-bottom: 0 !important;
  }

  .ghcm-dock-cell {
    border: 0 !important;
    padding: 0 !important;
  }

  .ghcm-root.is-docked {
    position: relative;
    top: auto;
    z-index: 2;
  }

  .ghcm-root.is-inline {
    margin: 0 0 24px;
  }

  .ghcm-section-hidden,
  .ghcm-hidden-by-parent {
    display: none !important;
  }
`;
