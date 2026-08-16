import { describe, it, expect } from "vitest";
import { getMapAspectRatio, normalizeCoordinates } from "./utilities";

describe("normalizeCoordinates", () => {
  it("should normalize coordinates between 0 and 1", () => {
    const coordinates = {
      "Estación A": { x: 10, y: 20 },
      "Estación B": { x: 30, y: 40 },
      "Estación C": { x: 50, y: 60 },
    };

    const normalized = normalizeCoordinates(coordinates);

    // Verificamos que todas las coordenadas estén entre 0 y 1
    Object.values(normalized).forEach((coord) => {
      expect(coord.x).toBeGreaterThanOrEqual(0);
      expect(coord.x).toBeLessThanOrEqual(1);
      expect(coord.y).toBeGreaterThanOrEqual(0);
      expect(coord.y).toBeLessThanOrEqual(1);
    });

    // Verificamos valores específicos
    expect(normalized["Estación A"]).toEqual({ x: 0, y: 0 });
    expect(normalized["Estación B"]).toEqual({ x: 0.5, y: 0.5 });
    expect(normalized["Estación C"]).toEqual({ x: 1, y: 1 });
  });

  it("should handle negative coordinates", () => {
    const coordinates = {
      "Estación D": { x: -10, y: -20 },
      "Estación E": { x: 0, y: 0 },
      "Estación F": { x: 10, y: 20 },
    };

    const normalized = normalizeCoordinates(coordinates);

    expect(normalized["Estación D"]).toEqual({ x: 0, y: 0 });
    expect(normalized["Estación E"]).toEqual({ x: 0.5, y: 0.5 });
    expect(normalized["Estación F"]).toEqual({ x: 1, y: 1 });
  });

  it("should handle single station", () => {
    const coordinates = {
      "Estación G": { x: 100, y: 200 },
    };

    const normalized = normalizeCoordinates(coordinates);

    expect(normalized["Estación G"]).toEqual({ x: 0, y: 0 });
  });

  it("should handle empty input", () => {
    const coordinates = {};

    const normalized = normalizeCoordinates(coordinates);

    expect(normalized).toEqual({});
  });
});

describe("getAspectRatio", () => {
  it("gets the aspect ratio", () => {
    const monitor = {
      "top-left": { x: 55 + 0, y: 90 + 720 },
      "top-right": { x: 55 + 1280, y: 90 + 720 },
      "bottom-left": { x: 55 + 0, y: 90 + 0 },
      "bottom-right": { x: 55 + 1280, y: 90 + 720 },
    };
    expect(getMapAspectRatio(monitor)).toBe(1280 / 720);
  });
});
