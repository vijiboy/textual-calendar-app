import { useCallback, useState } from "preact/hooks";
import { JSX } from "preact";
import { Event, ParserWarning, AppConfig } from "../utils/types.ts";
import { EventParser } from "../utils/parser.ts";
import { downloadICS } from "../utils/ical.ts";

const defaultConfig: AppConfig = {
  defaultDuration: 5,
  gapTime: 1,
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
};

function formatDateTime(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: defaultConfig.timezone
  }).format(date);
}

export default function EventEditor() {
  const [text, setText] = useState("");
  const [events, setEvents] = useState<Event[]>([]);
  const [warnings, setWarnings] = useState<ParserWarning[]>([]);
  const [config, setConfig] = useState<AppConfig>(defaultConfig);
  const [parser, setParser] = useState(() => new EventParser(defaultConfig));
  const [showConfig, setShowConfig] = useState(false);

  // Enhanced parseText to ensure proper recalculation
  const parseText = useCallback((newText: string, newConfig?: AppConfig) => {
    const currentConfig = newConfig || config;
    const currentParser = newConfig ? new EventParser(newConfig) : parser;
    
    // Parse the text with current configuration
    const result = currentParser.parse(newText);
    
    // Update the events and warnings
    setEvents(result.events);
    setWarnings(result.warnings);
  }, [config, parser]);

  const handleTextChange = (e: JSX.TargetedEvent<HTMLTextAreaElement>) => {
    const newText = e.currentTarget.value;
    setText(newText);
    parseText(newText);
  };

  const handleConfigChange = (e: JSX.TargetedEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.currentTarget;
    const newConfig = {
      ...config,
      [name]: name === 'timezone' ? value : parseInt(value)
    };
    
    // Update configuration state
    setConfig(newConfig);
    
    // Create new parser with updated config
    const newParser = new EventParser(newConfig);
    setParser(newParser);
    
    // Reparse existing text with new configuration
    parseText(text, newConfig);
  };

  const handleKeyDown = (e: JSX.TargetedKeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'z') {
      e.preventDefault();
      if (e.shiftKey) {
        document.execCommand('redo');
      } else {
        document.execCommand('undo');
      }
    } else if (e.altKey && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) {
      e.preventDefault();
      const lines = text.split('\n');
      const cursorPos = e.currentTarget.selectionStart;
      const currentLine = text.substring(0, cursorPos).split('\n').length - 1;
      const eventIndex = Math.floor(currentLine / 2);
      
      if (e.key === 'ArrowUp') {
        handleMoveUp(eventIndex);
      } else {
        handleMoveDown(eventIndex);
      }
    }
  };

  const moveEvent = (fromIndex: number, toIndex: number) => {
    if (toIndex < 0 || toIndex >= events.length) return;

    const lines = text.split('\n');
    const fromStart = fromIndex * 2;
    const toStart = toIndex * 2;
    
    // Extract the two lines of the event
    const eventLines = lines.splice(fromStart, 2);
    // Insert them at the new position
    lines.splice(toStart, 0, ...eventLines);
    
    const newText = lines.join('\n');
    setText(newText);
    parseText(newText);
  };

  const handleMoveUp = (index: number) => {
    moveEvent(index, index - 1);
  };

  const handleMoveDown = (index: number) => {
    moveEvent(index, index + 1);
  };

  const handleExport = () => {
    if (events.length === 0) return;
    
    const blob = downloadICS(events);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'events.ics';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div class="grid grid-cols-2 gap-4 p-4">
      <div class="space-y-4">
        <div class="flex justify-between items-center">
          <h2 class="text-lg font-semibold">Event Editor</h2>
          <div class="space-x-2">
            <button
              onClick={() => setShowConfig(!showConfig)}
              class="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
            >
              {showConfig ? 'Hide Config' : 'Show Config'}
            </button>
            <button
              onClick={handleExport}
              disabled={events.length === 0}
              class="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Export iCal
            </button>
          </div>
        </div>

        {showConfig && (
          <div class="bg-gray-100 p-4 rounded space-y-4">
            <h3 class="font-semibold">Configuration</h3>
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-sm font-medium text-gray-700">
                  Default Duration (minutes)
                </label>
                <input
                  type="number"
                  name="defaultDuration"
                  value={config.defaultDuration}
                  onChange={handleConfigChange}
                  min="1"
                  class="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
                />
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700">
                  Gap Time (minutes)
                </label>
                <input
                  type="number"
                  name="gapTime"
                  value={config.gapTime}
                  onChange={handleConfigChange}
                  min="0"
                  class="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
                />
              </div>
              <div class="col-span-2">
                <label class="block text-sm font-medium text-gray-700">
                  Timezone
                </label>
                <select
                  name="timezone"
                  value={config.timezone}
                  onChange={handleConfigChange}
                  class="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
                >
                  {Intl.supportedValuesOf('timeZone').map((tz) => (
                    <option key={tz} value={tz}>
                      {tz}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        )}

        <textarea
          class="w-full h-[600px] font-mono p-2 border rounded"
          value={text}
          onInput={handleTextChange}
          onKeyDown={handleKeyDown}
          placeholder={`A | Performance Title | Artist Name | Additional Info\n    Oct 30 05:00am\n\nB | Another Event | Artist | Info\n    5m`}
        />
      </div>
      
      <div class="space-y-4">
        <h2 class="text-lg font-semibold">Preview</h2>
        {warnings.length > 0 && (
          <div class="bg-yellow-50 p-4 rounded">
            {warnings.map((warning, i) => (
              <div key={i} class="text-yellow-800">
                Line {warning.line}: {warning.message}
              </div>
            ))}
          </div>
        )}
        
        <div class="space-y-2">
          {events.map((event, index) => (
            <div key={index} class="border rounded p-4 bg-white shadow-sm">
              <div class="flex justify-between items-center">
                <span class="font-bold">
                  {event.grade} | {event.title}
                </span>
                <div class="space-x-2">
                  <button
                    class="px-2 py-1 text-sm bg-gray-100 rounded hover:bg-gray-200 disabled:opacity-50"
                    onClick={() => handleMoveUp(index)}
                    disabled={index === 0}
                  >
                    ↑
                  </button>
                  <button
                    class="px-2 py-1 text-sm bg-gray-100 rounded hover:bg-gray-200 disabled:opacity-50"
                    onClick={() => handleMoveDown(index)}
                    disabled={index === events.length - 1}
                  >
                    ↓
                  </button>
                </div>
              </div>
              <div class="mt-2 text-sm text-gray-600">
                <div>{event.artist}</div>
                <div>{event.info}</div>
                <div>{formatDateTime(event.startTime)}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}