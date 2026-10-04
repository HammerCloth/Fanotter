import { cached, DAY } from '../lib/cache'
import { toBeijing } from '../lib/time'

// bangumi-data：开源的放送时间数据库，Bangumi 本身的接口不带播出时间
const DATA_URL = 'https://cdn.jsdelivr.net/npm/bangumi-data@latest/dist/data.json'

interface BDItem {
  begin: string
  broadcast?: string
  sites: { site: string; id?: string }[]
}

export interface AirInfo {
  /** 1 = 周一 … 7 = 周日，北京时间 */
  weekday: number
  /** HH:mm，北京时间 */
  time: string
  /** 首播日期 YYYY-MM-DD，北京时间 */
  begin: string
}

export type AirIndex = Record<number, AirInfo>

const pad = (n: number) => String(n).padStart(2, '0')

/** Bangumi 条目 id → 放送时间。整个文件近 8MB，所以解析后只把索引存进缓存，一天更新一次。 */
export const getAirIndex = () =>
  cached<AirIndex>('bd:index:v1', DAY, async () => {
    const res = await fetch(DATA_URL)
    if (!res.ok) throw new Error(`bangumi-data ${res.status}`)
    const { items } = (await res.json()) as { items: BDItem[] }
    const index: AirIndex = {}
    for (const it of items) {
      const id = it.sites.find((s) => s.site === 'bangumi')?.id
      // broadcast 形如 R/2026-10-02T13:00:00Z/P7D，比 begin 更准
      const start = it.broadcast?.split('/')[1] ?? it.begin
      if (!id || !start) continue
      const d = new Date(start)
      if (Number.isNaN(d.getTime())) continue
      const b = toBeijing(d)
      index[Number(id)] = { weekday: b.weekday, time: `${pad(b.hour)}:${pad(b.minute)}`, begin: b.date }
    }
    return index
  })
