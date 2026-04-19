export const responsiveStyles = `
  @media (max-width: 1179px) {
    .ghcm-root.is-overlay .ghcm-trigger {
      top: calc(76px + env(safe-area-inset-top, 0px));
      right: 14px;
    }

    .ghcm-root.is-overlay .ghcm-panel {
      right: 14px;
      top: calc(70px + env(safe-area-inset-top, 0px));
      bottom: 14px;
      width: min(320px, calc(100vw - 28px));
    }
  }

  @media (max-width: 599px) {
    .ghcm-root.is-overlay .ghcm-panel {
      width: calc(100vw - 20px);
      right: 10px;
      top: calc(66px + env(safe-area-inset-top, 0px));
      bottom: 10px;
    }

    .ghcm-sidebar-header {
      padding: 16px 16px 12px;
    }

    .ghcm-sidebar-outline {
      padding: 8px 12px 12px;
    }
  }
`;
