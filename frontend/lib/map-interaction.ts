/** Allow region background navigation below +3 zoom steps from Reset view. */
export function regionClicksEnabledAfterZoom(relativeZoom: number): boolean {
  return relativeZoom < 3;
}
