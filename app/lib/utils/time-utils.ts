export function formatTime(time: number): string {
  const minutes = Math.floor(time / 60);
  const seconds = Math.floor(time % 60);
  return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
}

export function formatTimeFromMs(timeMs: number): string {
  return formatTime(timeMs / 1000);
}

export function generateFileTimestamp(): string {
  return new Date().toISOString().slice(0, 19).replace(/:/g, "-");
}

export function generateRecordingFilename(): string {
  return `recording-${generateFileTimestamp()}.json`;
}
