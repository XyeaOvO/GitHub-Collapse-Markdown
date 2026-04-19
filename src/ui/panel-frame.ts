import type { DockedPanelLayoutContext } from "../core/types";

export interface DockedPanelMeasureElements {
  dockRow: HTMLElement;
  dockCell: HTMLElement;
  panel: HTMLElement;
}

export interface DockedPanelFrameElements {
  dockRow: HTMLElement;
  root: HTMLElement;
}

export interface DockedPanelMeasurement {
  boundaryViewportBottom: number;
  cellLeft: number;
  cellWidth: number;
  naturalPanelHeight: number;
  rowViewportTop: number;
}

export interface DockedPanelFrame {
  mode: "flow" | "fixed";
  panelLeft: number;
  panelHeight: number;
  panelMaxHeight: number;
  panelTop: number;
  panelWidth: number;
  rowHeight: number;
}

const DOCKED_PANEL_BOUNDARY_BOTTOM_GAP = 30;
const DOCKED_PANEL_VIEWPORT_BOTTOM_GAP = 16;

export function measureDockedPanel(
  elements: DockedPanelMeasureElements,
  context: DockedPanelLayoutContext
): DockedPanelMeasurement {
  const rowRect = elements.dockRow.getBoundingClientRect();
  const cellRect = elements.dockCell.getBoundingClientRect();
  const dockedBoundaryRect = context.boundary?.getBoundingClientRect();

  return {
    boundaryViewportBottom: dockedBoundaryRect
      ? dockedBoundaryRect.bottom - DOCKED_PANEL_BOUNDARY_BOTTOM_GAP
      : Number.POSITIVE_INFINITY,
    cellLeft: Math.max(cellRect.left, 0),
    cellWidth: Math.max(cellRect.width, 0),
    naturalPanelHeight: Math.max(elements.panel.scrollHeight, elements.panel.offsetHeight, 0),
    rowViewportTop: rowRect.top
  };
}

export function computeDockedPanelFrame(
  measurement: DockedPanelMeasurement,
  topOffset: number,
  viewportHeight: number
): DockedPanelFrame {
  const viewportBottom = viewportHeight - DOCKED_PANEL_VIEWPORT_BOTTOM_GAP;
  const rowBoundedMaxHeight = Math.max(
    Math.min(viewportBottom - measurement.rowViewportTop, measurement.boundaryViewportBottom - measurement.rowViewportTop),
    0
  );
  const rowHeight = Math.max(Math.min(Math.ceil(measurement.naturalPanelHeight), Math.ceil(rowBoundedMaxHeight)), 0);

  if (measurement.rowViewportTop > topOffset) {
    return {
      mode: "flow",
      panelLeft: measurement.cellLeft,
      panelHeight: rowHeight,
      panelMaxHeight: rowBoundedMaxHeight,
      panelTop: measurement.rowViewportTop,
      panelWidth: measurement.cellWidth,
      rowHeight: 0
    };
  }

  const preferredHeight = Math.min(measurement.naturalPanelHeight, Math.max(viewportBottom - topOffset, 0));
  let panelTop = topOffset;

  if (measurement.boundaryViewportBottom < panelTop + preferredHeight) {
    panelTop = Math.max(measurement.rowViewportTop, measurement.boundaryViewportBottom - preferredHeight);
  }

  const panelMaxHeight = Math.max(Math.min(viewportBottom - panelTop, measurement.boundaryViewportBottom - panelTop), 0);
  const panelHeight = Math.max(Math.min(Math.ceil(measurement.naturalPanelHeight), Math.ceil(panelMaxHeight)), 0);

  return {
    mode: "fixed",
    panelLeft: measurement.cellLeft,
    panelHeight,
    panelMaxHeight,
    panelTop,
    panelWidth: measurement.cellWidth,
    rowHeight: panelHeight
  };
}

export function applyDockedPanelFrame(elements: DockedPanelFrameElements, frame: DockedPanelFrame): void {
  elements.root.classList.toggle("is-floating", frame.mode === "fixed");

  if (frame.mode === "fixed") {
    elements.root.style.setProperty("--ghcm-panel-height", `${frame.panelHeight}px`);
    elements.root.style.setProperty("--ghcm-panel-max-height", `${frame.panelMaxHeight}px`);
    elements.root.style.setProperty("--ghcm-panel-left", `${frame.panelLeft}px`);
    elements.root.style.setProperty("--ghcm-panel-top", `${frame.panelTop}px`);
    elements.root.style.setProperty("--ghcm-panel-width", `${frame.panelWidth}px`);
    elements.root.style.minHeight = frame.rowHeight > 0 ? `${frame.rowHeight}px` : "";
    elements.dockRow.style.minHeight = frame.rowHeight > 0 ? `${frame.rowHeight}px` : "";
    return;
  }

  elements.root.style.removeProperty("--ghcm-panel-height");
  elements.root.style.removeProperty("--ghcm-panel-max-height");
  elements.root.style.removeProperty("--ghcm-panel-left");
  elements.root.style.removeProperty("--ghcm-panel-top");
  elements.root.style.removeProperty("--ghcm-panel-width");
  elements.root.style.removeProperty("min-height");
  elements.dockRow.style.removeProperty("min-height");
}

export function clearDockedPanelFrame(elements: DockedPanelFrameElements): void {
  elements.root.classList.remove("is-floating");
  elements.root.style.removeProperty("--ghcm-panel-height");
  elements.root.style.removeProperty("--ghcm-panel-left");
  elements.root.style.removeProperty("--ghcm-panel-top");
  elements.root.style.removeProperty("--ghcm-panel-width");
  elements.root.style.removeProperty("--ghcm-panel-max-height");
  elements.root.style.removeProperty("min-height");
  elements.dockRow.style.removeProperty("min-height");
}
