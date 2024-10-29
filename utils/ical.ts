import { Event } from "./types.ts";

export function generateICS(events: Event[]): string {
  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Calendar Event Generator//EN",
  ];

  for (const event of events) {
    lines.push("BEGIN:VEVENT");
    lines.push(`UID:${crypto.randomUUID()}`);
    lines.push(`DTSTAMP:${formatDate(new Date())}`);
    lines.push(`DTSTART:${formatDate(event.startTime!)}`);
    
    // Calculate end time based on duration
    const endTime = new Date(event.startTime!);
    endTime.setMinutes(endTime.getMinutes() + event.duration);
    lines.push(`DTEND:${formatDate(endTime)}`);
    
    lines.push(`SUMMARY:${event.grade} | ${event.title}`);
    lines.push(`DESCRIPTION:${event.artist}${event.description ? ' - ' + event.description : ''}`);
    lines.push("END:VEVENT");
  }

  lines.push("END:VCALENDAR");
  return lines.join("\r\n");
}

function formatDate(date: Date): string {
  const pad = (n: number): string => n.toString().padStart(2, '0');
  
  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());
  const seconds = pad(date.getSeconds());

  return `${year}${month}${day}T${hours}${minutes}${seconds}`;
}

export function downloadICS(events: Event[]): Blob {
  const content = generateICS(events);
  return new Blob([content], { type: 'text/calendar;charset=utf-8' });
}
