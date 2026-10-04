import { useEffect, useState } from 'react'
import { getAirIndex, type AirIndex } from '../api/airtime'
import { getCalendar } from '../api/bangumi'
import { Card } from '../components/Card'
import { DayBar } from '../components/DayBar'
import { Header } from '../components/Header'
import { buildWeek, type ScheduleItem } from '../lib/schedule'
import { toBeijing, weekDays, type WeekDay } from '../lib/time'

export function WeekPage() {
  const [days, setDays] = useState<ScheduleItem[][]>()
  const [error, setError] = useState<string>()
  const [selected, setSelected] = useState(() => toBeijing().weekday)
  const week = weekDays()
  const now = toBeijing()
  const day = week[selected - 1]
  const items = days?.[selected - 1] ?? []

  useEffect(() => {
    document.title = 'Fanotter · 本周新番'
    // 放送时间数据拿不到也照常显示排表，只是没有具体时间
    Promise.all([getCalendar(), getAirIndex().catch((): AirIndex => ({}))])
      .then(([calendar, air]) => setDays(buildWeek(calendar, air)))
      .catch((e: Error) => setError(e.message))
  }, [])

  // 左右方向键切换星期
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') setSelected((d) => Math.max(1, d - 1))
      if (e.key === 'ArrowRight') setSelected((d) => Math.min(7, d + 1))
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return (
    <div className="page">
      <Header right={`${now.year} 年 ${now.month} 月新番`} />
      <main className="container week-main">
        <div className="title-row">
          <h1>本周排表</h1>
          <span className="num muted">
            {week[0].month}月{week[0].day}日 – {week[6].month}月{week[6].day}日 · 北京时间
          </span>
        </div>

        <DayTabs days={week} counts={days?.map((d) => d.length)} selected={selected} onSelect={setSelected} />

        {error && <p className="notice">放送表加载失败：{error}。稍后刷新再试。</p>}
        {!days && !error && <p className="notice">正在加载本周放送表…</p>}

        {days && (
          <section className="day" key={selected}>
            <div className="day-title">
              <h2>{day.label}</h2>
              <span className="num muted">
                {day.month}月{day.day}日{day.isToday ? ' · 今天' : ''} · {items.length} 部更新
              </span>
            </div>
            {items.length === 0 && <p className="notice">这一天没有更新</p>}
            <div className="cards">
              {items.map((item) => (
                <Card key={item.id} item={item} />
              ))}
            </div>
          </section>
        )}

        <p className="footnote">
          数据来源：Bangumi 番组计划、bangumi-data · 时间为北京时间首播，00:xx 为当天凌晨 · 放送表每 6 小时更新一次 · 键盘 ← → 切换星期
        </p>
      </main>
      <DayBar days={week} selected={selected} onSelect={setSelected} />
    </div>
  )
}

/** 桌面端吸顶的星期切换 */
function DayTabs({ days, counts, selected, onSelect }: { days: WeekDay[]; counts?: number[]; selected: number; onSelect: (d: number) => void }) {
  return (
    <nav className="daytabs glass" role="tablist" aria-label="选择星期">
      {days.map((d, i) => (
        <button
          key={d.weekday}
          role="tab"
          aria-selected={d.weekday === selected}
          className={`daytab${d.weekday === selected ? ' is-selected' : ''}${d.isToday ? ' is-today' : ''}`}
          onClick={() => onSelect(d.weekday)}
        >
          <span className="daytab-label">
            {d.label}
            {d.isToday && <span className="daytab-dot" aria-label="今天" />}
          </span>
          <span className="num daytab-sub">
            {d.month}/{d.day}
            {counts ? ` · ${counts[i]}` : ''}
          </span>
        </button>
      ))}
    </nav>
  )
}
