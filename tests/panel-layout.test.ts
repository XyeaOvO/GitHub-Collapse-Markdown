import { describe, expect, it } from "vitest";
import { computeDockedPanelFrame, type DockedPanelMeasurement } from "../src/ui/panel-frame";

function createMeasurement(overrides: Partial<DockedPanelMeasurement> = {}): DockedPanelMeasurement {
  return {
    boundaryViewportBottom: Number.POSITIVE_INFINITY,
    cellLeft: 1080,
    cellWidth: 320,
    naturalPanelHeight: 360,
    rowViewportTop: 120,
    ...overrides
  };
}

describe("computeDockedPanelFrame", () => {
  it("clamps the panel height to the dock boundary when the natural height would overflow", () => {
    const frame = computeDockedPanelFrame(
      createMeasurement({
        boundaryViewportBottom: 670,
        naturalPanelHeight: 800,
        rowViewportTop: 40
      }),
      7,
      900
    );

    expect(frame).toEqual({
      mode: "flow",
      panelLeft: 1080,
      panelHeight: 630,
      panelMaxHeight: 630,
      panelTop: 40,
      panelWidth: 320,
      rowHeight: 0
    });
  });

  it("shifts the panel upward near the page end before shrinking it", () => {
    const frame = computeDockedPanelFrame(
      createMeasurement({
        boundaryViewportBottom: 410,
        naturalPanelHeight: 420,
        rowViewportTop: -600
      }),
      7,
      900
    );

    expect(frame).toEqual({
      mode: "fixed",
      panelLeft: 1080,
      panelHeight: 420,
      panelMaxHeight: 420,
      panelTop: -10,
      panelWidth: 320,
      rowHeight: 420
    });
  });

  it("pins the panel below the sticky header when the row starts above it", () => {
    const frame = computeDockedPanelFrame(
      createMeasurement({
        naturalPanelHeight: 240,
        rowViewportTop: 20
      }),
      80,
      900
    );

    expect(frame).toEqual({
      mode: "fixed",
      panelLeft: 1080,
      panelHeight: 240,
      panelMaxHeight: 804,
      panelTop: 80,
      panelWidth: 320,
      rowHeight: 240
    });
  });

  it("keeps the panel in the sidebar flow before it reaches the sticky threshold", () => {
    const frame = computeDockedPanelFrame(
      createMeasurement({
        naturalPanelHeight: 540,
        rowViewportTop: 140
      }),
      80,
      900
    );

    expect(frame).toEqual({
      mode: "flow",
      panelLeft: 1080,
      panelHeight: 540,
      panelMaxHeight: 744,
      panelTop: 140,
      panelWidth: 320,
      rowHeight: 0
    });
  });
});
