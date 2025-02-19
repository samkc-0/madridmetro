import { LineNumber, MetroLine, MetroNetwork } from "./classes";

const madridLines: MetroLine[] = ["1", "2", "3", "4", "5", "6", "8"].map(
  (lineNumber) => {
    return new MetroLine(lineNumber as LineNumber);
  }
);

export const madrid = new MetroNetwork(madridLines);
