import type { WeekDay } from '../lib/time'

export function DayBar({ days, selected, onSelect }: { days: WeekDay[]; selected: number; onSelect: (d: number) => void }) {
  return (
    <nav className="daybar glass" role="tablist" aria-label="选择星期">
      {days.map((d) => (
        <button
          key={d.weekday}
          role="tab"
          aria-selected={d.weekday === selected}
          className={`daybar-btn${d.weekday === selected ? ' is-selected' : ''}${d.isToday ? ' is-today' : ''}`}
          onClick={() => onSelect(d.weekday)}
        >
          <span className="daybar-short">{d.short}</span>
          <span className="daybar-num num">{d.day}</span>
        </button>
      ))}
    </nav>
  )
}
