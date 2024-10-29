This application is a textual editor cum viewer for planning and creating calendar events.
 Following are the requirements:
1. Textual entries for event is a line with text seperated by text delimiter '|' pipe followed by optional second line with date-time or duration:
```
Grade | Performance Title | Artist Name(s) | Additional Info | More Info
Oct 30 05:00am
```
or
```
Grade | Performance Title | Artist Name(s) | Extra Details
5m
```
or
```
Grade | Performance Title | Artist Name(s) | Extra Details
```
- First line should have at least 2 pipes separating Grade, Title, and Artist
- All content after 3rd pipe goes into description
- Second line must be indented and contain date-time or duration or empty (default duration is assumed):
- Date-time accepted should be accepted common formats (Oct 30 05:00am, 2024-10-30 05:00, etc.)
- Duration e.g. (5m, 1h, 1h30m, etc.)

1. Event Sequence Management:
- Events can be reordered using:
- Up/Down buttons for adjacent moves
- Alt + ↑/↓ keyboard shortcuts
- Standard cut/paste operations
- Events consist of two lines (header + time)

1. Time Calculation:
- For events with explicit times:
- Use specified time
- Apply default duration (configurable, default 5m)
- For events with only duration:
- Start after previous event + gap time
- If first event, start from current time rounded to nearest 5 min
- Gap between events is configurable (default 1m)

1. iCalendar Export:
- Generate standard iCalendar (RFC 5545) format
- Support fields:
- UID (unique identifier)
- DTSTAMP (creation time)
- DTSTART (event start)
- DTEND (event end)
- SUMMARY (Grade | Title)
- DESCRIPTION (Artist + Additional Info)