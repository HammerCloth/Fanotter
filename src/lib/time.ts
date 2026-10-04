const OFFSET = 8 * 3_600_000
const DAY_MS = 86_400_000

export interface BeijingTime {
  year: number
  month: number
  day: number
  /** 1 = 周一 … 7 = 周日 */
  weekday: number
  hour: number
  minute: number
  /** YYYY-MM-DD */
  date: string
  /** 加了 8 小时偏移后的时间戳，配合 getUTC* 读取北京时间 */
  ms: number
}

export const WEEKDAYS = ['周一', '周二', '周三', '周四', '周五', '周六', '周日']
export const WEEKDAYS_SHORT = ['一', '二', '三', '四', '五', '六', '日']

const pad = (n: number) => String(n).padStart(2, '0')

export function toBeijing(d: Date = new Date()): BeijingTime {
  const t = new Date(d.getTime() + OFFSET)
  const year = t.getUTCFullYear()
  const month = t.getUTCMonth() + 1
  const day = t.getUTCDate()
  return {
    year,
    month,
    day,
    weekday: ((t.getUTCDay() + 6) % 7) + 1,
    hour: t.getUTCHours(),
    minute: t.getUTCMinutes(),
    date: `${year}-${pad(month)}-${pad(day)}`,
    ms: t.getTime(),
  }
}

export interface WeekDay {
  weekday: number
  label: string
  short: string
  month: number
  day: number
  isToday: boolean
}

/** 本周（周一到周日）每一天的日期，按北京时间 */
export function weekDays(now: BeijingTime = toBeijing()): WeekDay[] {
  const monday = now.ms - (now.weekday - 1) * DAY_MS
  return Array.from({ length: 7 }, (_, i) => {
    const t = new Date(monday + i * DAY_MS)
    return {
      weekday: i + 1,
      label: WEEKDAYS[i],
      short: WEEKDAYS_SHORT[i],
      month: t.getUTCMonth() + 1,
      day: t.getUTCDate(),
      isToday: i + 1 === now.weekday,
    }
  })
}

/** 从首播日期推算本周播到第几集 */
export function episodeNumber(begin: string, now: BeijingTime = toBeijing()): number {
  const [y, m, d] = begin.split('-').map(Number)
  const start = Date.UTC(y, m - 1, d)
  const today = Date.UTC(now.year, now.month - 1, now.day)
  return Math.max(1, Math.floor((today - start) / (7 * DAY_MS)) + 1)
}

export function formatDate(iso: string) {
  const [y, m, d] = iso.split('-')
  return `${y}.${m}.${d}`
}
