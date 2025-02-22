import { LineNumber, MetroLine, MetroNetwork } from "./classes";

const madridLines: MetroLine[] = [
  "1",
  "2",
  "3",
  "4",
  "5",
  "6",
  "7",
  "8",
  "9",
  "10",
  "11",
  "12",
].map((lineNumber) => {
  return new MetroLine(lineNumber as LineNumber);
});

export const madrid = new MetroNetwork(madridLines);
