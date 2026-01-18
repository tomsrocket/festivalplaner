import React, { useEffect, useState } from 'react';
import { startOfMonth, endOfMonth, eachDayOfInterval, format, addMonths, startOfWeek, endOfWeek, addDays, getMonth, getYear, differenceInCalendarDays, parse } from 'date-fns';
import { de } from 'date-fns/locale';

type Festival = {
  id?: string;
  name: string;
  startdatum: string; // ISO
  enddatum?: string; // ISO
  [key: string]: any;
};

type StorageEvent = {
  id: string;
  date: string; // "dd.mm." or "dd.mm.-dd.mm."
  title: string;
  source: 'storage'; // to distinguish from liked festivals
  sourceFile?: string; // filename of the source markdown file
};

// Color palette for event types
const COLOR_PALETTE = {
  holidays: { bg: 'bg-success-subtle', text: 'text-success-emphasis', badge: '#198754' },
  liked: { bg: 'bg-primary', text: 'text-white', badge: '#0d6efd' },
  storage: (index: number) => {
    const colors = [
      { bg: 'bg-warning', text: 'text-dark', badge: '#ffc107' },
      { bg: 'bg-info', text: 'text-white', badge: '#0dcaf0' },
      { bg: 'bg-purple', text: 'text-white', badge: '#6f42c1' },
      { bg: 'bg-danger-subtle', text: 'text-danger-emphasis', badge: '#dc3545' },
      { bg: 'bg-secondary', text: 'text-white', badge: '#6c757d' },
      { bg: 'bg-teal', text: 'text-white', badge: '#20c997' },
    ];
    return colors[index % colors.length];
  }
};

// helper: parse date strings from markdown (dd.mm. or dd.mm.-dd.mm.)
const parseStorageDate = (dateStr: string, year: number): { start: Date; end: Date } | null => {
  try {
    if (dateStr.includes('-')) {
      // Range: "dd.mm.-dd.mm."
      const parts = dateStr.split('-');
      const startPart = parts[0].trim();
      const endPart = parts[1].trim();
      const startDate = parse(`${startPart}${year}`, 'dd.MM.yyyy', new Date());
      const endDate = parse(`${endPart}${year}`, 'dd.MM.yyyy', new Date());
      return { start: startDate, end: endDate };
    } else {
      // Single day: "dd.mm."
      const date = parse(`${dateStr}${year}`, 'dd.MM.yyyy', new Date());
      return { start: date, end: date };
    }
  } catch {
    return null;
  }
};

// helper: load events from localStorage
const loadStorageEvents = (year: number): StorageEvent[] => {
  const events: StorageEvent[] = [];
  try {
    const indexStr = localStorage.getItem('markdown_index');
    if (!indexStr) return events;

    const index = JSON.parse(indexStr);
    let eventId = 0;

    index.forEach((item: any) => {
      const content = localStorage.getItem(item.key);
      if (!content) return;

      // Parse markdown table rows
      const lines = content.split('\n');
      const dateRegex = /^\|\s*(\d{2}\.\d{2}\.(?:-\d{2}\.\d{2}\.)?)\s*\|\s*(.+?)\s*\|/;

      lines.forEach((line) => {
        const match = line.match(dateRegex);
        if (match) {
          const dateStr = match[1].trim();
          const title = match[2].trim();
          const parsed = parseStorageDate(dateStr, year);
          if (parsed) {
            events.push({
              id: `storage_${item.key}_${eventId}`,
              date: dateStr,
              title: title,
              source: 'storage',
              sourceFile: item.name,
            });
            eventId++;
          }
        }
      });
    });
  } catch (e) {
    console.error('Error loading storage events:', e);
  }
  return events;
};

// helper: build a map dateStr -> StorageEvent[] for storage events
const buildStorageEventsMap = (events: StorageEvent[], year: number) => {
  const map: Record<string, StorageEvent[]> = {};
  events.forEach((e) => {
    const parsed = parseStorageDate(e.date, year);
    if (parsed) {
      const days = eachDayOfInterval({ start: parsed.start, end: parsed.end });
      days.forEach((d) => {
        const key = format(d, 'yyyy-MM-dd');
        if (!map[key]) map[key] = [];
        map[key].push(e);
      });
    }
  });
  return map;
};

export default function Overview() {
  const [festivals, setFestivals] = useState<Festival[]>([]);
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set());
  const [holidays, setHolidays] = useState<Record<string, string>>({});
  const [storageEvents, setStorageEvents] = useState<StorageEvent[]>([]);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  
  // Filter state - which event types to display
  const [visibleTypes, setVisibleTypes] = useState<Record<string, boolean>>({
    holidays: true,
    liked: true,
  });

  useEffect(() => {
    // Load festivals
    fetch('/data/festivals_2026.json')
      .then((r) => r.json())
      .then((d) => setFestivals(d))
      .catch(() => setFestivals([]));

    // Load holidays
    fetch('/data/ferien_nordrhein-westfalen_2026.ics')
      .then((r) => r.text())
      .then((text) => {
        const holidayMap: Record<string, string> = {};
        const eventBlocks = text.split('BEGIN:VEVENT');
        eventBlocks.forEach((block) => {
          const dtstartMatch = block.match(/DTSTART;VALUE=DATE:(\d{8})/);
          const dtendMatch = block.match(/DTEND;VALUE=DATE:(\d{8})/);
          const summaryMatch = block.match(/SUMMARY:(.*)/);
          if (dtstartMatch && dtendMatch && summaryMatch) {
            const startStr = dtstartMatch[1];
            const endStr = dtendMatch[1];
            const summary = summaryMatch[1].trim();
            const startDate = new Date(`${startStr.slice(0,4)}-${startStr.slice(4,6)}-${startStr.slice(6,8)}`);
            const endDate = new Date(`${endStr.slice(0,4)}-${endStr.slice(4,6)}-${endStr.slice(6,8)}`);
            // Subtract one day from endDate since DTEND is exclusive
            endDate.setDate(endDate.getDate() - 1);
            const days = eachDayOfInterval({ start: startDate, end: endDate });
            days.forEach((d) => {
              const dateStr = format(d, 'yyyy-MM-dd');
              holidayMap[dateStr] = summary;
            });
          }
        });
        setHolidays(holidayMap);
      })
      .catch(() => setHolidays({}));

    // Load liked festivals
    try {
      const raw = localStorage.getItem('likedFestivals2026');
      if (raw) {
        const arr: string[] = JSON.parse(raw);
        setLikedIds(new Set(arr));
      }
    } catch (e) {
      setLikedIds(new Set());
    }

    // Load storage events (markdown files)
    const events = loadStorageEvents(2026);
    setStorageEvents(events);
    
    // Initialize visible types for storage events
    const newVisibleTypes = { holidays: true, liked: true };
    const fileNames = new Set<string>();
    events.forEach((e) => {
      if (e.sourceFile && !fileNames.has(e.sourceFile)) {
        newVisibleTypes[`file_${e.sourceFile}`] = true;
        fileNames.add(e.sourceFile);
      }
    });
    setVisibleTypes(newVisibleTypes);
  }, []);

  // helper: parse festivals and build a map dateStr -> Festival[] for liked festivals
  const buildLikedDaysMap = (festivals: Festival[], likedIds: Set<string>) => {
    const map: Record<string, Festival[]> = {};
    festivals.forEach((f) => {
      const id = f.id ?? `${f.name}::${f.startdatum}`;
      if (!likedIds.has(id)) return;

      try {
        const start = new Date(f.startdatum);
        const end = f.enddatum ? new Date(f.enddatum) : start;
        const days = eachDayOfInterval({ start, end });
        days.forEach((d) => {
          const key = format(d, 'yyyy-MM-dd');
          if (!map[key]) map[key] = [];
          map[key].push(f);
        });
      } catch (e) {
        // ignore invalid dates
      }
    });
    return map;
  };

  const likedDaysMap = buildLikedDaysMap(festivals, likedIds);
  const storageEventsMap = buildStorageEventsMap(storageEvents, 2026);

  // Get unique source files from storage events
  const sourceFiles = Array.from(new Set(storageEvents.map((e) => e.sourceFile).filter((f) => f !== undefined))) as string[];

  const [hoveredDay, setHoveredDay] = useState<string | null>(null);

  // Helper to get color for a storage event by source file
  const getStorageEventColor = (sourceFile?: string) => {
    const fileIndex = sourceFiles.indexOf(sourceFile || '');
    return COLOR_PALETTE.storage(fileIndex);
  };


  // render 12 months of 2026
  const year = 2026;
  const months = Array.from({ length: 12 }, (_, i) => i);

  return (
    <main className="container py-4">
      <h1 className="mb-4">Übersicht 2026</h1>

      {/* Filter Controls */}
      <div className="card mb-4">
        <div className="card-body">
          <h6 className="card-title mb-3">Termintypen:</h6>
          <div className="row g-3">
            {/* Holidays */}
            <div className="col-auto">
              <div className="form-check d-flex align-items-center">
                <input
                  className="form-check-input"
                  type="checkbox"
                  id="check_holidays"
                  checked={visibleTypes.holidays}
                  onChange={(e) => setVisibleTypes({ ...visibleTypes, holidays: e.target.checked })}
                />
                <label className="form-check-label ms-2 mb-0" htmlFor="check_holidays">
                  <span className={`badge ${COLOR_PALETTE.holidays.bg} ${COLOR_PALETTE.holidays.text} me-2`}>🏫</span>
                  Ferien/Schulferien
                </label>
              </div>
            </div>

            {/* Liked Festivals */}
            <div className="col-auto">
              <div className="form-check d-flex align-items-center">
                <input
                  className="form-check-input"
                  type="checkbox"
                  id="check_liked"
                  checked={visibleTypes.liked}
                  onChange={(e) => setVisibleTypes({ ...visibleTypes, liked: e.target.checked })}
                />
                <label className="form-check-label ms-2 mb-0" htmlFor="check_liked">
                  <span className={`badge ${COLOR_PALETTE.liked.bg} ${COLOR_PALETTE.liked.text} me-2`}>📅</span>
                  Gelieckte Festivals
                </label>
              </div>
            </div>

            {/* Storage Events (by file) */}
            {sourceFiles.map((fileName, fileIdx) => (
              <div key={fileName} className="col-auto">
                <div className="form-check d-flex align-items-center">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    id={`check_file_${fileName}`}
                    checked={visibleTypes[`file_${fileName}`] ?? true}
                    onChange={(e) => setVisibleTypes({ ...visibleTypes, [`file_${fileName}`]: e.target.checked })}
                  />
                  <label className="form-check-label ms-2 mb-0" htmlFor={`check_file_${fileName}`}>
                    <span className={`badge ${COLOR_PALETTE.storage(fileIdx).bg} ${COLOR_PALETTE.storage(fileIdx).text} me-2`}>📝</span>
                    {fileName}
                  </label>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="row">
        {months.map((m) => {
          const monthStart = startOfMonth(new Date(year, m));
          const monthEnd = endOfMonth(monthStart);

          // build weeks for this month (rows)
          const firstWeekStart = startOfWeek(monthStart, { weekStartsOn: 1 });
          const lastWeekEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });

          const weeks: Date[][] = [];
          let cursor = firstWeekStart;
          while (cursor <= lastWeekEnd) {
            const weekDays = Array.from({ length: 7 }, (_, i) => addDays(cursor, i));
            weeks.push(weekDays);
            cursor = addDays(cursor, 7);
          }

          return (
            <div key={m} className="col-md-4 mb-4">
              <div className="card h-100 shadow-sm">
                <div className="card-body">
                  <h2 className="h5 card-title">{format(monthStart, 'LLLL', { locale: de })}</h2>

                  <div className="row gx-1 align-items-start small mt-2">
                    {['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'].map((d) => (
                      <div key={d} className="col text-center fw-bold small">{d}</div>
                    ))}
                  </div>

                  {weeks.map((week, wi) => (
                    <div key={wi} className="row gx-1 mt-1">
                      {week.map((day) => {
                        const key = format(day, 'yyyy-MM-dd');
                        const inMonth = getMonth(day) === m;
                        const festivalsHere = visibleTypes.liked ? (likedDaysMap[key] || []) : [];
                        const storageEventsHere = visibleTypes.liked ? (storageEventsMap[key] || []) : [];
                        
                        // Filter storage events by visible files
                        const filteredStorageEvents = storageEventsHere.filter((e) => {
                          const fileKey = `file_${e.sourceFile}`;
                          return visibleTypes[fileKey] !== false;
                        });

                        const hasHolidays = visibleTypes.holidays && holidays[key];
                        const hasFestivals = visibleTypes.liked && festivalsHere.length > 0;
                        const hasStorage = filteredStorageEvents.length > 0;

                        // Determine background color based on what's visible
                        let bgClass = '';
                        if (hasHolidays) {
                          bgClass = `${COLOR_PALETTE.holidays.bg}`;
                        } else if (hasFestivals && !hasStorage) {
                          bgClass = `${COLOR_PALETTE.liked.bg} ${COLOR_PALETTE.liked.text}`;
                        } else if (hasStorage && !hasFestivals) {
                          const fileIndex = sourceFiles.indexOf(filteredStorageEvents[0].sourceFile || '');
                          const color = COLOR_PALETTE.storage(fileIndex);
                          bgClass = `${color.bg} ${color.text}`;
                        } else if (hasFestivals && hasStorage) {
                          bgClass = 'bg-danger text-white';
                        }

                        const totalEventsVisible = (hasFestivals ? festivalsHere.length : 0) + filteredStorageEvents.length;

                        return !inMonth ? (<div key={key} className={`col p-1`}><div className={`w-100 h-100`}></div></div>) : (
                          <div key={key} className={`col p-1`}>
                            <div
                              onMouseEnter={() => setHoveredDay(key)}
                              onMouseLeave={() => setHoveredDay(null)}
                              onMouseMove={(e) => { if (totalEventsVisible > 0 || hasHolidays) setMousePos({ x: e.clientX + 10, y: e.clientY + 10 }); }}
                              className={`w-100 h-100 rounded p-1 border position-relative ${inMonth ? bgClass : 'text-muted bg-light'}`}
                              style={{ minHeight: '4rem' }}
                            >
                              <div className="d-flex justify-content-between align-items-start">
                                <div className="small">{format(day, 'd')}</div>
                                {totalEventsVisible > 1 && (
                                  <span className={`badge bg-danger-subtle text-danger-emphasis`}>{totalEventsVisible}</span>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Tooltip for hovered events */}
      {hoveredDay && (
        <div
          style={{
            position: 'fixed',
            left: mousePos.x,
            top: mousePos.y,
            background: 'white',
            border: '1px solid black',
            padding: '8px',
            zIndex: 1000,
            pointerEvents: 'none',
            boxShadow: '0 2px 5px rgba(0,0,0,0.2)',
            maxWidth: '250px',
          }}
        >
          <ul className="list-unstyled mb-0 small">
            {visibleTypes.holidays && holidays[hoveredDay] && (
              <li className="py-1 mb-1">
                <span className={`badge ${COLOR_PALETTE.holidays.bg} ${COLOR_PALETTE.holidays.text}`}>🏫</span>
                <strong> {holidays[hoveredDay]}</strong>
              </li>
            )}
            {visibleTypes.liked && (likedDaysMap[hoveredDay] || []).slice(0, 8).map((f) => (
              <li key={f.id ?? f.name} className="py-1">
                <span className={`badge ${COLOR_PALETTE.liked.bg} ${COLOR_PALETTE.liked.text}`}>📅</span>
                {f.name}{f.startdatum ? ` (${format(new Date(f.startdatum), 'dd.MM.')})` : ''}
              </li>
            ))}
            {(storageEventsMap[hoveredDay] || []).slice(0, 8).map((e) => {
              const fileIndex = sourceFiles.indexOf(e.sourceFile || '');
              const color = COLOR_PALETTE.storage(fileIndex);
              return visibleTypes[`file_${e.sourceFile}`] !== false ? (
                <li key={e.id} className="py-1">
                  <span className={`badge ${color.bg} ${color.text}`}>📝</span>
                  {e.title}
                </li>
              ) : null;
            })}
            {((visibleTypes.liked ? (likedDaysMap[hoveredDay] || []).length : 0) + 
              ((storageEventsMap[hoveredDay] || []).filter((e) => visibleTypes[`file_${e.sourceFile}`] !== false).length) > 10) && (
              <li className="text-muted mt-1">
                und weitere...
              </li>
            )}
          </ul>
        </div>
      )}
    </main>
  );
}
