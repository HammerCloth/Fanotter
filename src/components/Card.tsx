import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getSubject, subjectQueue } from '../api/bangumi'
import type { ScheduleItem } from '../lib/schedule'
import { useInView } from '../lib/useInView'

export function Card({ item }: { item: ScheduleItem }) {
  const [ref, seen] = useInView<HTMLAnchorElement>()
  const [summary, setSummary] = useState(item.summary)

  // 每日放送接口里的简介大多是空的，卡片滚进视口后再单独取一次
  useEffect(() => {
    if (!seen || summary) return
    let alive = true
    subjectQueue(() => getSubject(item.id))
      .then((s) => alive && setSummary(s.summary.trim() || '暂无简介'))
      .catch(() => {})
    return () => {
      alive = false
    }
  }, [seen, summary, item.id])

  return (
    <Link ref={ref} to={`/subject/${item.id}`} className="card">
      {item.poster && <img src={item.poster} alt="" aria-hidden="true" className="card-glow" loading="lazy" />}
      <div className="card-veil" aria-hidden="true" />
      <div className="card-body">
        <div className="poster">
          {item.poster ? <img src={item.poster} alt={`${item.title} 海报`} loading="lazy" /> : <div className="poster-empty">{item.title[0]}</div>}
          {item.time && <span className="pill glass num">{item.time}</span>}
        </div>
        <h3 className="card-title clamp2">{item.title}</h3>
        <span className="card-ep num">
          {item.ep ? `第${item.ep}集` : '放送中'}
          {item.eps ? <span className="muted"> · 共{item.eps}集</span> : null}
        </span>
        <p className="card-summary clamp3">{summary ?? '　'}</p>
      </div>
    </Link>
  )
}
