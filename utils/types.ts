export interface Event {
  grade: string;
  title: string;
  artist: string;
  description: string;
  startTime: Date | null;
  duration: number;  // in minutes
  rawText: string;  // original text for editing
}

export interface ParserWarning {
  line: number;
  message: string;
  severity: 'error' | 'warning';
}

export interface AppConfig {
  defaultDuration: number;  // 5 minutes
  gapTime: number;         // 1 minute
  timezone: string;        // from system
}

export interface ParseResult {
  events: Event[];
  warnings: ParserWarning[];
}
