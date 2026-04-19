export const headingStyles = `
  .ghcm-heading-block {
    position: relative;
    cursor: pointer;
  }

  .ghcm-heading-block--wrapped {
    display: block !important;
  }

  .ghcm-heading-inline {
    display: flex;
    align-items: center;
    gap: 0.42em;
  }

  .ghcm-visible-heading {
    scroll-margin-top: 120px;
  }

  .ghcm-collapsed > h1,
  .ghcm-collapsed > h2,
  .ghcm-collapsed > h3,
  .ghcm-collapsed > h4,
  .ghcm-collapsed > h5,
  .ghcm-collapsed > h6,
  .ghcm-collapsed .heading-element,
  .ghcm-collapsed.ghcm-heading-inline {
    opacity: 0.84;
  }

  .ghcm-heading-block--wrapped .heading-element {
    display: flex;
    align-items: center;
    gap: 0.32em;
    min-width: 0;
  }

  .ghcm-heading-toggle {
    appearance: none;
    box-sizing: border-box;
    flex: 0 0 auto;
    width: 1.18em;
    height: 1.18em;
    border: none;
    background: transparent;
    color: var(--ghcm-toggle-color, var(--ghcm-h4));
    display: inline-flex;
    align-items: center;
    justify-content: center;
    font-family: inherit;
    font-size: 1em;
    font-weight: 700;
    line-height: 1;
    letter-spacing: -0.04em;
    cursor: pointer;
    transition: transform 140ms ease, color 140ms ease, opacity 140ms ease;
    opacity: 0.96;
    margin-right: 0.18em;
    padding: 0;
    vertical-align: middle;
  }

  .ghcm-heading-block--wrapped > h1,
  h1.ghcm-heading-inline {
    --ghcm-toggle-color: var(--ghcm-h1);
  }

  .ghcm-heading-block--wrapped > h2,
  h2.ghcm-heading-inline {
    --ghcm-toggle-color: var(--ghcm-h2);
  }

  .ghcm-heading-block--wrapped > h3,
  h3.ghcm-heading-inline {
    --ghcm-toggle-color: var(--ghcm-h3);
  }

  .ghcm-heading-block--wrapped > h4,
  h4.ghcm-heading-inline {
    --ghcm-toggle-color: var(--ghcm-h4);
  }

  .ghcm-heading-block--wrapped > h5,
  h5.ghcm-heading-inline {
    --ghcm-toggle-color: var(--ghcm-h5);
  }

  .ghcm-heading-block--wrapped > h6,
  h6.ghcm-heading-inline {
    --ghcm-toggle-color: var(--ghcm-h6);
  }

  .ghcm-heading-block:hover > .ghcm-heading-toggle,
  .ghcm-heading-block:hover .heading-element > .ghcm-heading-toggle,
  .ghcm-heading-toggle:hover {
    color: var(--ghcm-ink);
    opacity: 1;
  }

  .ghcm-heading-inline > .ghcm-heading-toggle:hover,
  .ghcm-heading-block--wrapped .heading-element > .ghcm-heading-toggle:hover {
    transform: translateY(-1px);
  }
`;
