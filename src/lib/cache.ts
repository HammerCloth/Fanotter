import { get, set } from 'idb-keyval'

export const HOUR = 3_600_000
export const DAY = 24 * HOUR

interface Entry<T> {
  t: number
  v: T
}

const mem = new Map<string, Entry<unknown>>()
const inflight = new Map<string, Promise<unknown>>()

/** 带过期时间的缓存：内存 → IndexedDB → 网络。网络失败时退回过期的旧数据，离线也能看。 */
export function cached<T>(key: string, ttl: number, load: () => Promise<T>): Promise<T> {
  const pending = inflight.get(key)
  if (pending) return pending as Promise<T>
  const p = run(key, ttl, load).finally(() => inflight.delete(key))
  inflight.set(key, p)
  return p
}

async function run<T>(key: string, ttl: number, load: () => Promise<T>): Promise<T> {
  const now = Date.now()
  const hit = (mem.get(key) as Entry<T> | undefined) ?? (await readStore<T>(key))
  if (hit && now - hit.t < ttl) {
    mem.set(key, hit)
    return hit.v
  }
  try {
    const v = await load()
    const entry: Entry<T> = { t: now, v }
    mem.set(key, entry)
    set(key, entry).catch(() => {})
    return v
  } catch (err) {
    if (hit) return hit.v
    throw err
  }
}

async function readStore<T>(key: string): Promise<Entry<T> | undefined> {
  try {
    return await get<Entry<T>>(key)
  } catch {
    return undefined
  }
}

/** 限制并发：一次最多 n 个请求在跑，其余排队。 */
export function limiter(n: number) {
  let active = 0
  const queue: (() => void)[] = []
  return <T>(fn: () => Promise<T>) =>
    new Promise<T>((resolve, reject) => {
      const start = () => {
        active++
        fn()
          .then(resolve, reject)
          .finally(() => {
            active--
            queue.shift()?.()
          })
      }
      active < n ? start() : queue.push(start)
    })
}
