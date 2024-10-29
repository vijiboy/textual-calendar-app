import { assertEquals } from "https://deno.land/std@0.208.0/assert/mod.ts";
import { EventParser } from "./parser.ts";
import { AppConfig } from "./types.ts";

const config: AppConfig = {
  defaultDuration: 5,
  gapTime: 1,
  timezone: "UTC"
};

Deno.test("Parser - Basic event with explicit date", () => {
  const parser = new EventParser(config);
  const input = `A | Test Performance | Artist | Info\n    Oct 30 05:00am`;
  const { events, warnings } = parser.parse(input);

  assertEquals(events.length, 1);
  assertEquals(events[0].grade, "A");
  assertEquals(events[0].title, "Test Performance");
  assertEquals(events[0].artist, "Artist");
  assertEquals(events[0].description, "Info");
  assertEquals(events[0].duration, 5); // default duration
  
  const expectedDate = new Date();
  expectedDate.setMonth(9); // October (0-based)
  expectedDate.setDate(30);
  expectedDate.setHours(5, 0, 0, 0);
  
  assertEquals(
    events[0].startTime?.getHours(),
    expectedDate.getHours()
  );
  assertEquals(
    events[0].startTime?.getMinutes(),
    expectedDate.getMinutes()
  );
});

Deno.test("Parser - Event with duration only", () => {
  const parser = new EventParser(config);
  const input = `B | Another Event | Artist | Info\n    30m`;
  const { events } = parser.parse(input);

  assertEquals(events.length, 1);
  assertEquals(events[0].duration, 30);
  // Start time should be set to current time rounded to 5 minutes
  assertTrue(events[0].startTime instanceof Date);
});

Deno.test("Parser - Multiple events with mixed formats", () => {
  const parser = new EventParser(config);
  const input = `A | First Event | Artist1 | Info\n    Oct 30 05:00am\n\nB | Second Event | Artist2 | Info\n    1h30m`;
  const { events } = parser.parse(input);

  assertEquals(events.length, 2);
  assertEquals(events[0].duration, 5); // default duration
  assertEquals(events[1].duration, 90); // 1h30m = 90 minutes
});

Deno.test("Parser - Various date formats", () => {
  const parser = new EventParser(config);
  const inputs = [
    // ISO format
    `A | ISO Event | Artist | Info\n    2024-10-30T05:00:00`,
    // Date and time with space
    `A | Space Event | Artist | Info\n    2024-10-30 05:00`,
    // Month name format (short)
    `A | Short Month Event | Artist | Info\n    Oct 30 05:00am`,
    // Month name format (long)
    `A | Long Month Event | Artist | Info\n    October 30 05:00am`,
    // Month/Day/Year format
    `A | MDY Event | Artist | Info\n    10/30/2024 05:00`,
    // Day.Month.Year format
    `A | DMY Event | Artist | Info\n    30.10.2024 05:00`
  ];

  for (const input of inputs) {
    const { events, warnings } = parser.parse(input);
    assertEquals(events.length, 1);
    assertTrue(events[0].startTime instanceof Date);
    assertEquals(events[0].startTime?.getHours(), 5);
    assertEquals(events[0].startTime?.getMinutes(), 0);
  }
});

Deno.test("Parser - Event with ISO date format", () => {
  const parser = new EventParser(config);
  const input = `A | Test Event | Artist | Info\n    2024-10-30 05:00`;
  const { events } = parser.parse(input);

  assertEquals(events.length, 1);
  const startTime = events[0].startTime;
  assertEquals(startTime?.getFullYear(), 2024);
  assertEquals(startTime?.getMonth(), 9); // October (0-based)
  assertEquals(startTime?.getDate(), 30);
  assertEquals(startTime?.getHours(), 5);
  assertEquals(startTime?.getMinutes(), 0);
});

Deno.test("Parser - Event with additional description pipes", () => {
  const parser = new EventParser(config);
  const input = `A | Event | Artist | Part 1 | Part 2 | Part 3\n    5m`;
  const { events } = parser.parse(input);

  assertEquals(events.length, 1);
  assertEquals(events[0].description, "Part 1 | Part 2 | Part 3");
});

Deno.test("Parser - Various duration formats", () => {
  const parser = new EventParser(config);
  const testCases = [
    { input: "5m", expected: 5 },
    { input: "1h", expected: 60 },
    { input: "1h30m", expected: 90 },
    { input: "2h15m", expected: 135 },
    { input: "30m", expected: 30 },
    { input: "45m", expected: 45 }
  ];

  for (const { input, expected } of testCases) {
    const { events } = parser.parse(`A | Test | Artist | Info\n    ${input}`);
    assertEquals(events[0].duration, expected);
  }
});

// New test cases for better coverage

Deno.test("Parser - Empty and malformed inputs", () => {
  const parser = new EventParser(config);
  const testCases = [
    { input: "", expectedEvents: 0, expectedWarnings: 0 },
    { input: "\n\n", expectedEvents: 0, expectedWarnings: 0 },
    { input: "A | B | C", expectedEvents: 1, expectedWarnings: 0 }, // Minimum valid format
    { input: "Invalid Line", expectedEvents: 0, expectedWarnings: 0 },
    { input: "|||||", expectedEvents: 1, expectedWarnings: 0 }
  ];

  for (const { input, expectedEvents, expectedWarnings } of testCases) {
    const { events, warnings } = parser.parse(input);
    assertEquals(events.length, expectedEvents);
    assertEquals(warnings.length, expectedWarnings);
  }
});

Deno.test("Parser - Description field edge cases", () => {
  const parser = new EventParser(config);
  const testCases = [
    { 
      input: "A | Event | Artist |\n5m",
      expectedDesc: ""
    },
    { 
      input: "A | Event | Artist | " + "x".repeat(1000) + "\n5m",
      expectedDesc: "x".repeat(1000)
    },
    { 
      input: "A | Event | Artist | Special chars: !@#$%^&*()\n5m",
      expectedDesc: "Special chars: !@#$%^&*()"
    },
    {
      input: "A | Event | Artist | Single line desc\n5m",
      expectedDesc: "Single line desc"
    }
  ];

  for (const { input, expectedDesc } of testCases) {
    const { events } = parser.parse(input);
    assertEquals(events[0].description, expectedDesc);
  }
});

Deno.test("Parser - Gap time between events", () => {
  const parser = new EventParser({
    ...config,
    gapTime: 5 // 5 minute gap
  });
  
  const input = `
    A | Event 1 | Artist | Info\n    10:00am
    B | Event 2 | Artist | Info\n    30m
  `;
  
  const { events } = parser.parse(input);
  assertEquals(events.length, 2);
  
  // Second event should start after first event + duration + gap time
  if (events[0].startTime && events[1].startTime) {
    const expectedGap = (events[1].startTime.getTime() - 
      (events[0].startTime.getTime() + events[0].duration * 60000)) / 60000;
    assertEquals(expectedGap, 5);
  }
});

Deno.test("Parser - Event sequence validation", () => {
  const parser = new EventParser(config);
  const input = `
    A | Event 1 | Artist | Info\n    10:00am
    B | Event 2 | Artist | Info\n    9:00am
  `;
  
  const { events, warnings } = parser.parse(input);
  assertEquals(events.length, 2);
  
  // Events should maintain their input order regardless of times
  assertEquals(events[0].title, "Event 1");
  assertEquals(events[1].title, "Event 2");
});

function assertTrue(condition: boolean) {
  assertEquals(condition, true);
}
