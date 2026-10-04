import type { CalendarDay } from '../api/bangumi'
import type { AirIndex } from '../api/airtime'
import { episodeNumber, toBeijing } from './time'

export interface ScheduleItem {
  id: number
  title: string
  poster?: string
  /** HH:mm，没有放送时间数据时为空 */
  time?: string
  weekday: number
  ep?: number
  eps?: number
  summary?: string
  score?: number
  doing: number
}

/** 把 Bangumi 的每日放送和 bangumi-data 的播出时间合成一周七天 */
export function buildWeek(calendar: CalendarDay[], air: AirIndex): ScheduleItem[][] {
  const now = toBeijing()
  const days: ScheduleItem[][] = Array.from({ length: 7 }, () => [])
  for (const day of calendar) {
    for (const it of day.items) {
      const a = air[it.id]
      // 有播出时间就按北京时间的星期分组，否则沿用 Bangumi 的星期
      const weekday = a?.weekday ?? day.weekday.id
      if (weekday < 1 || weekday > 7) continue
      const eps = it.eps_count || it.eps || undefined
      const ep = a ? Math.min(episodeNumber(a.begin, now), eps ?? Infinity) : undefined
      days[weekday - 1].push({
        id: it.id,
        title: it.name_cn || it.name,
        poster: it.images?.common,
        time: a?.time,
        weekday,
        ep,
        eps,
        summary: it.summary?.trim() || undefined,
        score: it.rating?.score || undefined,
        doing: it.collection?.doing ?? 0,
      })
    }
  }
  for (const d of days) {
    d.sort((x, y) => {
      if (x.time && y.time) return x.time.localeCompare(y.time)
      if (x.time || y.time) return x.time ? -1 : 1
      return y.doing - x.doing
    })
  }
  return days
}
