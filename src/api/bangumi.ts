import { cached, DAY, HOUR, limiter } from '../lib/cache'

const API = 'https://api.bgm.tv'

export interface Images {
  large: string
  common: string
  medium: string
  small: string
  grid: string
}

export interface CalendarItem {
  id: number
  name: string
  name_cn: string
  summary?: string
  air_date: string
  air_weekday: number
  eps?: number
  eps_count?: number
  images?: Images
  rating?: { score: number; total: number }
  collection?: { doing?: number; wish?: number; collect?: number }
}

export interface CalendarDay {
  weekday: { id: number; cn: string }
  items: CalendarItem[]
}

export interface InfoboxEntry {
  key: string
  value: string | { k?: string; v: string }[]
}

export interface Subject {
  id: number
  name: string
  name_cn: string
  summary: string
  date?: string
  eps: number
  total_episodes: number
  images: Images
  rating: { score: number; total: number; rank?: number }
  collection: { doing: number; wish: number; collect: number; on_hold: number; dropped: number }
  tags: { name: string; count: number }[]
  infobox: InfoboxEntry[]
}

export interface Episode {
  id: number
  sort: number
  ep?: number
  airdate: string
  name: string
  name_cn: string
}

export interface Character {
  id: number
  name: string
  relation: string
  images?: Partial<Images>
  actors?: { id: number; name: string }[]
}

async function getJSON<T>(path: string): Promise<T> {
  const res = await fetch(API + path, { headers: { Accept: 'application/json' } })
  if (!res.ok) throw new Error(`Bangumi ${res.status}: ${path}`)
  return res.json() as Promise<T>
}

export const getCalendar = () =>
  cached('bgm:calendar', 6 * HOUR, () => getJSON<CalendarDay[]>('/calendar'))

export const getSubject = (id: number) =>
  cached(`bgm:subject:${id}`, 7 * DAY, () => getJSON<Subject>(`/v0/subjects/${id}`))

export const getEpisodes = (id: number) =>
  cached(`bgm:episodes:${id}`, DAY, async () => {
    const r = await getJSON<{ data: Episode[] }>(`/v0/episodes?subject_id=${id}&type=0&limit=100`)
    return r.data
  })

export const getCharacters = (id: number) =>
  cached(`bgm:characters:${id}`, 7 * DAY, () => getJSON<Character[]>(`/v0/subjects/${id}/characters`))

/** 列表页懒加载简介时用的队列，避免一次打几十个请求 */
export const subjectQueue = limiter(3)

export const displayTitle = (s: { name: string; name_cn: string }) => s.name_cn || s.name

export function infoboxValue(entry: InfoboxEntry | undefined): string {
  if (!entry) return ''
  if (typeof entry.value === 'string') return entry.value
  return entry.value.map((v) => v.v).join('、')
}
