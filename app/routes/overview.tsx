import React, { useEffect, useState } from 'react';
import { startOfMonth, endOfMonth, eachDayOfInterval, format, addMonths, startOfWeek, endOfWeek, addDays, getMonth, getYear, differenceInCalendarDays } from 'date-fns';
import { de } from 'date-fns/locale';

type Festival = {
  id?: string;
  name: string;
  startdatum: string; // ISO
  enddatum?: string; // ISO
  [key: string]: any;
};

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

export default function Overview() {
  const [festivals, setFestivals] = useState<Festival[]>([]);
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set());
  const [holidays, setHolidays] = useState<Record<string, string>>({});
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    fetch('/data/festivals_2026.json')
      .then((r) => r.json())
      .then((d) => setFestivals(d))
      .catch(() => setFestivals([]));

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

    try {
      const raw = localStorage.getItem('likedFestivals2026');
      if (raw) {
        const arr: string[] = JSON.parse(raw);
        setLikedIds(new Set(arr));
      }
    } catch (e) {
      setLikedIds(new Set());
    }
  }, []);

  const likedDaysMap = buildLikedDaysMap(festivals, likedIds);

  const [hoveredDay, setHoveredDay] = useState<string | null>(null);


  // render 12 months of 2026
  const year = 2026;
  const months = Array.from({ length: 12 }, (_, i) => i);

  return (
    <main className="container py-4">
      <h1 className="mb-4">Übersicht 2026</h1>
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
                        const festivalsHere = likedDaysMap[key] || [];
                        const count = festivalsHere.length;

                        // choose bootstrap background classes
                        let bgClass = '';
                        if (holidays[key]) bgClass = 'bg-warning';
                        if (count === 1) bgClass = 'bg-primary text-white';
                        else if (count > 1) bgClass = 'bg-danger text-white';

                        return !inMonth ? (<div key={key} className={`col p-1`}><div className={`w-100 h-100`}></div></div>) : (
                          <div key={key} className={`col p-1`}>
                            <div
                              onMouseEnter={() => setHoveredDay(key)}
                              onMouseLeave={() => setHoveredDay(null)}
                              onMouseMove={(e) => { if (count > 0 || holidays[key]) setMousePos({ x: e.clientX + 10, y: e.clientY + 10 }); }}
                              className={`w-100 h-100 rounded p-1 border position-relative ${inMonth ? bgClass : 'text-muted bg-light'}`}
                              style={{ minHeight: '4rem' }}
                            >
                              <div className="d-flex justify-content-between align-items-start">
                                <div className="small">{format(day, 'd')}</div>
                                {count > 0 && (
                                  <span className={`badge ${count === 1 ? 'bg-warning text-dark' : 'bg-danger'}`}>{count}</span>
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

      {/* Tooltip for hovered festivals and holidays */}
      {hoveredDay && ((likedDaysMap[hoveredDay] && likedDaysMap[hoveredDay].length > 0) || holidays[hoveredDay]) && (
        <div
          style={{
            position: 'fixed',
            left: mousePos.x,
            top: mousePos.y,
            background: 'white',
            border: '1px solid black',
            padding: '5px',
            zIndex: 1000,
            pointerEvents: 'none',
            boxShadow: '0 2px 5px rgba(0,0,0,0.2)'
          }}
        >
          <ul className="list-unstyled mb-0">
            {holidays[hoveredDay] && <li className="py-1 fw-bold">{holidays[hoveredDay]}</li>}
            {(likedDaysMap[hoveredDay] || []).slice(0, 5).map((f) => (
              <li key={f.id ?? f.name} className="py-1">{f.name}{f.startdatum ? ` (${format(new Date(f.startdatum), 'dd.MM.')})` : ''}</li>
            ))}
            {(likedDaysMap[hoveredDay] || []).length > 5 && <li className="text-muted">und {(likedDaysMap[hoveredDay] || []).length - 5} weitere...</li>}
          </ul>
        </div>
      )}
    </main>
  );
}
