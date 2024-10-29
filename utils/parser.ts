import { Event, ParserWarning, ParseResult, AppConfig } from "./types.ts";

export class EventParser {
  private config: AppConfig;

  constructor(config: AppConfig) {
    this.config = config;
  }

  parse(text: string): ParseResult {
    const lines = text.split('\n');
    const events: Event[] = [];
    const warnings: ParserWarning[] = [];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      // Check if this is a header line (contains pipes)
      if (line.includes('|')) {
        const event = this.parseEventLine(line, i + 1);
        const timeInfo = this.parseTimeLine(
          i + 1 < lines.length ? lines[i + 1] : '',
          i + 2
        );

        if (event) {
          events.push({
            grade: event.grade,
            title: event.title,
            artist: event.artist,
            description: event.description,
            startTime: timeInfo.startTime,
            duration: timeInfo.duration || this.config.defaultDuration,
            rawText: `${line}\n${lines[i + 1] || ''}`
          });
          i++; // Skip the time line
        }
      }
    }

    // Calculate start times for events with only duration
    this.calculateEventTimes(events);

    return { events, warnings };
  }

  private parseEventLine(line: string, lineNumber: number): Event {
    const parts = line.split('|').map(part => part.trim());
    
    if (parts.length < 3) {
      return {
        grade: '',
        title: '',
        artist: '',
        description: '',
        startTime: null,
        duration: this.config.defaultDuration,
        rawText: line
      };
    }

    const grade = parts[0];
    const title = parts[1];
    const artist = parts[2];
    // Get everything after the third pipe character by finding the position of the third pipe
    const thirdPipeIndex = line.split('|', 3).join('|').length;
    const description = thirdPipeIndex < line.length ? 
      line.substring(thirdPipeIndex + 1).trim() : '';

    return {
      grade: grade || '',
      title: title || '',
      artist: artist || '',
      description: description || '',
      startTime: null,
      duration: this.config.defaultDuration,
      rawText: line
    };
  }

  private parseTimeLine(line: string, lineNumber: number): {
    startTime: Date | null;
    duration: number | null;
  } {
    line = line.trim();
    if (!line) {
      return { startTime: null, duration: null };
    }

    // Check for duration format (e.g., "5m", "1h30m")
    if (line.match(/^\d+[mh](\d+m)?$/)) {
      return {
        startTime: null,
        duration: this.parseDuration(line)
      };
    }

    // Try parsing various date formats
    const dateAttempts = [
      // ISO format with T
      () => {
        const match = line.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})$/);
        if (match) {
          const [_, year, month, day, hours, minutes, seconds] = match;
          return new Date(parseInt(year), parseInt(month) - 1, parseInt(day), 
                         parseInt(hours), parseInt(minutes), parseInt(seconds));
        }
        return null;
      },
      // YYYY-MM-DD HH:mm format
      () => {
        const match = line.match(/^(\d{4})-(\d{2})-(\d{2})\s+(\d{2}):(\d{2})$/);
        if (match) {
          const [_, year, month, day, hours, minutes] = match;
          return new Date(parseInt(year), parseInt(month) - 1, parseInt(day), 
                         parseInt(hours), parseInt(minutes));
        }
        return null;
      },
      // Month name format (Oct 30 05:00am)
      () => {
        const match = line.match(/^([A-Za-z]+)\s+(\d+)\s+(\d+):(\d+)(am|pm)$/i);
        if (match) {
          const [_, month, day, hours, minutes, ampm] = match;
          const year = new Date().getFullYear();
          const monthIndex = new Date(`${month} 1, 2000`).getMonth();
          let hour = parseInt(hours);
          if (ampm.toLowerCase() === 'pm' && hour < 12) hour += 12;
          if (ampm.toLowerCase() === 'am' && hour === 12) hour = 0;
          return new Date(year, monthIndex, parseInt(day), hour, parseInt(minutes));
        }
        return null;
      },
      // MM/DD/YYYY HH:mm format
      () => {
        const match = line.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{2})$/);
        if (match) {
          const [_, month, day, year, hours, minutes] = match;
          return new Date(parseInt(year), parseInt(month) - 1, parseInt(day),
                         parseInt(hours), parseInt(minutes));
        }
        return null;
      },
      // DD.MM.YYYY HH:mm format
      () => {
        const match = line.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})\s+(\d{1,2}):(\d{2})$/);
        if (match) {
          const [_, day, month, year, hours, minutes] = match;
          return new Date(parseInt(year), parseInt(month) - 1, parseInt(day),
                         parseInt(hours), parseInt(minutes));
        }
        return null;
      },
      // Try direct Date parsing as last resort
      () => {
        const date = new Date(line);
        return isNaN(date.getTime()) ? null : date;
      }
    ];

    for (const attempt of dateAttempts) {
      const result = attempt();
      if (result && !isNaN(result.getTime())) {
        return {
          startTime: result,
          duration: null
        };
      }
    }

    return { startTime: null, duration: null };
  }

  private parseDuration(duration: string): number {
    let total = 0;
    const hours = duration.match(/(\d+)h/);
    const minutes = duration.match(/(\d+)m/);

    if (hours) {
      total += parseInt(hours[1]) * 60;
    }
    if (minutes) {
      total += parseInt(minutes[1]);
    }

    return total;
  }

  private calculateEventTimes(events: Event[]): void {
    let currentTime = new Date();
    // Round to nearest 5 minutes
    currentTime.setMinutes(Math.ceil(currentTime.getMinutes() / 5) * 5);
    currentTime.setSeconds(0);
    currentTime.setMilliseconds(0);

    for (const event of events) {
      if (!event.startTime) {
        event.startTime = new Date(currentTime);
      }
      currentTime = new Date(event.startTime);
      currentTime.setMinutes(
        currentTime.getMinutes() + event.duration + this.config.gapTime
      );
    }
  }
}
