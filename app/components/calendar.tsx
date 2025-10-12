import React from 'react';
import { startOfWeek, addWeeks, format, getWeek, startOfMonth, endOfMonth, addDays } from 'date-fns';
import { de } from 'date-fns/locale';
import { useEffect, useState } from 'react';

type Festival = {
  name: string;
  startdatum: string; // ISO string
  enddatum?: string;  // optional, ISO string
  [key: string]: any;
};

type FestivalsByWeek = Record<number, Festival[]>;

const groupFestivalsByWeek = (festivals: Festival[]) => {
  const byWeek: FestivalsByWeek = {};
  festivals.forEach(festival => {
    const date = new Date(festival.startdatum);
    const week = getWeek(date, { weekStartsOn: 1, locale: de });
    if (!byWeek[week]) byWeek[week] = [];
    byWeek[week].push(festival);
  });
  return byWeek;
};

const useFestivals2026 = () => {
  const [festivalsByWeek, setFestivalsByWeek] = useState<FestivalsByWeek>({});

  useEffect(() => {
    fetch('/data/festivals_2026.json')
      .then(res => res.json())
      .then((data: Festival[]) => setFestivalsByWeek(groupFestivalsByWeek(data)));
  }, []);

  return festivalsByWeek;
};

const getWeeksOfMonth = (year: number, month: number) => {
  const weeks = [];

  const monthStart = startOfMonth(new Date(year, month));
  const monthEnd = endOfMonth(new Date(year, month));

  // Wir starten mit dem Montag der ersten Woche des Monats
  let currentWeekStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  if (currentWeekStart < monthStart) {
    currentWeekStart = addDays(currentWeekStart, 7);
  }
  while (currentWeekStart <= monthEnd) {
    const weekNumber = getWeek(currentWeekStart, { weekStartsOn: 1, locale: de });
    weeks.push({
      weekNumber,
      startDate: currentWeekStart,
    });

    currentWeekStart = addWeeks(currentWeekStart, 1);
  }

  return weeks;
};

const Calendar2026 = () => {
  const year = 2026;
  const months = Array.from({ length: 12 }, (_, i) => i); // 0 = Januar, 11 = Dezember
  const festivalsByWeek = useFestivals2026();
  const storageKey = 'likedFestivals2026';
  const [likedFestivals, setLikedFestivals] = useState<Set<string>>(() => new Set());

  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const arr: string[] = JSON.parse(raw);
        setLikedFestivals(new Set(arr));
      }
    } catch (e) {
      // ignore JSON parse errors
      console.warn('Could not read liked festivals from localStorage', e);
    }
  }, []);

  const festivalId = (f: Festival) => `${f.name}::${f.startdatum}`;

  const toggleLike = (f: Festival) => {
    const id = festivalId(f);
    setLikedFestivals((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);

      try {
        localStorage.setItem(storageKey, JSON.stringify(Array.from(next)));
      } catch (e) {
        console.warn('Could not save liked festivals to localStorage', e);
      }

      return next;
    });
  };

  return (
    <div style={{ fontFamily: 'sans-serif', padding: '1rem' }}>
      <h1>Kalender 2026</h1>
      {months.map((month) => {
        const monthDate = new Date(year, month);
        const monthName = format(monthDate, 'LLLL', { locale: de });
        const weeks = getWeeksOfMonth(year, month);

        return (
          <div key={month} style={{ marginBottom: '2rem' }}>
            <h2>{monthName}</h2>
            <ul>
              {weeks.map((week) => (
                <li key={week.weekNumber} style={{ marginBottom: '0.5rem' }}>
                  <div style={{ display: 'flex', gap: '1rem', alignItems: 'baseline' }}>
                    <strong>KW {week.weekNumber}</strong>
                    <span>Start: {format(week.startDate, 'dd.MM.yyyy')}</span>
                  </div>

                  {/* Festivals for this week (if any) */}
                  <div style={{ marginTop: '0.25rem', paddingLeft: '1rem' }}>
                    {festivalsByWeek[week.weekNumber] && festivalsByWeek[week.weekNumber].length > 0 ? (
                      <ul style={{ margin: 0, paddingLeft: '1rem' }}>
                        {festivalsByWeek[week.weekNumber].map((f) => {
                          const id = festivalId(f);
                          const liked = likedFestivals.has(id);
                          return (
                            <li key={id} title={`${f.name} (${f.startdatum}${f.enddatum ? ' – ' + f.enddatum : ''})`} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                              <button
                                onClick={() => toggleLike(f)}
                                aria-pressed={liked}
                                aria-label={liked ? `Liked ${f.name}` : `Like ${f.name}`}
                                style={{
                                  border: 'none',
                                  background: 'transparent',
                                  cursor: 'pointer',
                                  fontSize: '1.1rem',
                                  lineHeight: 1,
                                  color: liked ? '#f5b301' : '#bbb',
                                }}
                              >
                                {liked ? '★' : '☆'}
                              </button>

                              <strong style={{ marginRight: '0.5rem' }}>{f.name}</strong>
                              <span style={{ color: '#555' }}>
                                ({format(new Date(f.startdatum), 'dd.MM.yyyy')}{f.enddatum ? ` – ${format(new Date(f.enddatum), 'dd.MM.yyyy')}` : ''})
                              </span>
                            </li>
                          );
                        })}
                      </ul>
                    ) : (
                      <div style={{ color: '#999' }}>keine Festivals</div>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </div>
  );
};

export default Calendar2026;
