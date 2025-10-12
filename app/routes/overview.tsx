import React, { useEffect, useState } from 'react';
import Modal from 'react-bootstrap/Modal';
import Button from 'react-bootstrap/Button';
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

  useEffect(() => {
    fetch('/data/festivals_2026.json')
      .then((r) => r.json())
      .then((d) => setFestivals(d))
      .catch(() => setFestivals([]));

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

  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  const closeModal = () => setSelectedDay(null);

  // render 12 months of 2026
  const year = 2026;
  const months = Array.from({ length: 12 }, (_, i) => i);

  return (
    <main className="container mx-auto p-4">
      <h1 className="text-2xl mb-4">Übersicht 2026</h1>
      <div className="grid grid-cols-3 gap-4">
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
            <div key={m} className="border rounded p-2">
              <h2 className="text-lg font-semibold">{format(monthStart, 'LLLL', { locale: de })}</h2>
              <div className="grid grid-cols-7 gap-1 text-xs mt-2">
                {['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'].map((d) => (
                  <div key={d} className="text-center font-medium">{d}</div>
                ))}

                {weeks.map((week, wi) => (
                  week.map((day) => {
                    const key = format(day, 'yyyy-MM-dd');
                    const inMonth = getMonth(day) === m;
                    const festivalsHere = likedDaysMap[key] || [];
                    const count = festivalsHere.length;

                    // background color based on count
                    let bg = 'bg-white';
                    if (count === 1) bg = 'bg-yellow-200';
                    else if (count > 1) bg = 'bg-red-200';

                    return (
                      <div key={key} className={`h-16 p-1 border ${inMonth ? '' : 'text-gray-400'}`}>
                        <div
                          role={count > 0 ? 'button' : undefined}
                          onClick={() => count > 0 && setSelectedDay(key)}
                          className={`w-full h-full rounded p-1 ${inMonth ? bg : ''} ${count > 0 ? 'cursor-pointer' : ''}`}
                        >
                          <div className="text-xs">{format(day, 'd')}</div>
                          {count > 0 && (
                            <div className="mt-1 text-xs">
                              {count} {count === 1 ? 'Festival' : 'Festivals'}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <Modal show={!!selectedDay} onHide={closeModal}>
        <Modal.Header closeButton>
          <Modal.Title>
            {selectedDay ? `Festivals am ${format(new Date(selectedDay), 'dd.MM.yyyy')}` : 'Festivals'}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedDay && (likedDaysMap[selectedDay] || []).length > 0 ? (
            <ul>
              {(likedDaysMap[selectedDay] || []).map((f) => (
                <li key={f.id ?? f.name}>{f.name} {f.startdatum ? `(${format(new Date(f.startdatum), 'dd.MM.yyyy')})` : ''}</li>
              ))}
            </ul>
          ) : (
            <p>Keine Festivals</p>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={closeModal}>
            Schließen
          </Button>
        </Modal.Footer>
      </Modal>
    </main>
  );
}
