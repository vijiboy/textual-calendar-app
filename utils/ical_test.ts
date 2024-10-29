import { assertEquals } from "https://deno.land/std@0.208.0/assert/mod.ts";
import { generateICS } from "./ical.ts";
import { Event } from "./types.ts";

Deno.test("iCal - Generate single event", () => {
  const event: Event = {
    grade: "A",
    title: "Test Performance",
    artist: "Test Artist",
    description: "Test Info",
    startTime: new Date("2024-10-30T05:00:00"),
    duration: 30,
    rawText: ""
  };

  const ics = generateICS([event]);
  
  // Basic structure checks
  assertTrue(ics.includes("BEGIN:VCALENDAR"));
  assertTrue(ics.includes("VERSION:2.0"));
  assertTrue(ics.includes("BEGIN:VEVENT"));
  assertTrue(ics.includes("END:VEVENT"));
  assertTrue(ics.includes("END:VCALENDAR"));
  
  // Content checks
  assertTrue(ics.includes("SUMMARY:A | Test Performance"));
  assertTrue(ics.includes("DESCRIPTION:Test Artist - Test Info"));
  assertTrue(ics.includes("DTSTART:20241030T050000"));
  
  // End time should be 30 minutes after start
  assertTrue(ics.includes("DTEND:20241030T053000"));
});

Deno.test("iCal - Generate multiple events", () => {
  const events: Event[] = [
    {
      grade: "A",
      title: "First Event",
      artist: "Artist 1",
      description: "Info 1",
      startTime: new Date("2024-10-30T05:00:00"),
      duration: 30,
      rawText: ""
    },
    {
      grade: "B",
      title: "Second Event",
      artist: "Artist 2",
      description: "Info 2",
      startTime: new Date("2024-10-30T06:00:00"),
      duration: 45,
      rawText: ""
    }
  ];

  const ics = generateICS(events);
  
  // Should contain two events
  assertEquals(
    (ics.match(/BEGIN:VEVENT/g) || []).length,
    2
  );
  
  // Check both events are included
  assertTrue(ics.includes("SUMMARY:A | First Event"));
  assertTrue(ics.includes("SUMMARY:B | Second Event"));
  
  // Check times
  assertTrue(ics.includes("DTSTART:20241030T050000"));
  assertTrue(ics.includes("DTEND:20241030T053000")); // First event end
  assertTrue(ics.includes("DTSTART:20241030T060000"));
  assertTrue(ics.includes("DTEND:20241030T064500")); // Second event end
});

Deno.test("iCal - Event with no description", () => {
  const event: Event = {
    grade: "A",
    title: "Test Event",
    artist: "Test Artist",
    description: "",
    startTime: new Date("2024-10-30T05:00:00"),
    duration: 30,
    rawText: ""
  };

  const ics = generateICS([event]);
  assertTrue(ics.includes("DESCRIPTION:Test Artist"));
});

function assertTrue(condition: boolean) {
  assertEquals(condition, true);
}
