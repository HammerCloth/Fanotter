import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { getAirIndex, type AirIndex, type AirInfo } from '../api/airtime'
import { displayTitle, getCharacters, getEpisodes, getSubject, infoboxValue, type Character, type Episode, type Subject } from '../api/bangumi'
import { Header } from '../components/Header'
import { formatDate, toBeijing, WEEKDAYS } from '../lib/time'

const STAFF_KEYS = ['原作', '导演', '系列构成', '脚本', '人物设定', '音乐', '主题歌演出', '动画制作', '播放电视台']

interface Loaded {
  subject: Subject
  episodes: Episode[]
  characters: Character[]
  air?: AirInfo
}

export function DetailPage() {
  const { id = '' } = useParams()
  const [data, setData] = useState<Loaded>()
  const [error, setError] = useState<string>()

  useEffect(() => {
    const sid = Number(id)
    if (!sid) {
      setError('无效的番剧 id')
      return
    }
    setData(undefined)
    setError(undefined)
    window.scrollTo(0, 0)
    Promise.all([
      getSubject(sid),
      getEpisodes(sid).catch(() => [] as Episode[]),
      getCharacters(sid).catch(() => [] as Character[]),
      getAirIndex().catch((): AirIndex => ({})),
    ])
      .then(([subject, episodes, characters, air]) => {
        document.title = `Fanotter · ${displayTitle(subject)}`
        setData({ subject, episodes, characters, air: air[sid] })
      })
      .catch((e: Error) => setError(e.message))
  }, [id])

  if (error) {
    return (
      <div className="page">
        <Header back="/" />
        <main className="container">
          <p className="notice">加载失败：{error}</p>
        </main>
      </div>
    )
  }
  if (!data) {
    return (
      <div className="page">
        <Header back="/" />
        <main className="container">
          <p className="notice">正在加载…</p>
        </main>
      </div>
    )
  }

  const { subject, episodes, characters, air } = data
  const title = displayTitle(subject)
  const today = toBeijing().date
  const aired = episodes.filter((e) => e.airdate && e.airdate <= today).length
  const nextEp = episodes.find((e) => !e.airdate || e.airdate > today)
  const total = subject.eps || subject.total_episodes || episodes.length
  const station = infoboxValue(subject.infobox.find((i) => i.key === '播放电视台'))
  const site = infoboxValue(subject.infobox.find((i) => i.key === '官方网站'))
  const staff = STAFF_KEYS.map((k) => ({ k, v: infoboxValue(subject.infobox.find((i) => i.key === k)) })).filter((s) => s.v)
  const tags = subject.tags.slice(0, 8)
  const cast = characters.filter((c) => c.relation === '主角' || c.relation === '配角').slice(0, 8)

  return (
    <div className="page">
      <Header back="/" />

      <section className="hero">
        <img src={subject.images.large} alt="" aria-hidden="true" className="hero-bg" />
        <div className="hero-fade" aria-hidden="true" />
        <div className="container hero-inner">
          <img src={subject.images.large} alt={`${title} 海报`} className="hero-poster" />
          <div className="hero-text">
            <span className="eyebrow">TV 动画{subject.date ? ` · ${subject.date.slice(0, 4)} 年 ${Number(subject.date.slice(5, 7))} 月` : ''}</span>
            <h1>{title}</h1>
            {subject.name_cn && subject.name !== subject.name_cn && <span className="subtitle">{subject.name}</span>}

            <div className="stats">
              <div className="glass stat">
                <span className="stat-label">Bangumi 评分</span>
                <span className="stat-value num">{subject.rating.score ? subject.rating.score.toFixed(1) : '–'}</span>
                <span className="stat-sub num">{subject.rating.total} 人评分</span>
              </div>
              <div className="glass stat">
                <span className="stat-label">在看</span>
                <span className="stat-value num">{subject.collection.doing.toLocaleString()}</span>
                <span className="stat-sub">人</span>
              </div>
              <div className="glass stat">
                <span className="stat-label">想看</span>
                <span className="stat-value num">{subject.collection.wish.toLocaleString()}</span>
                <span className="stat-sub">人</span>
              </div>
            </div>

            <div className="glass airbox">
              {air && (
                <div className="airbox-item">
                  <span className="stat-label">放送时间</span>
                  <span className="strong">
                    每{WEEKDAYS[air.weekday - 1]} {air.time} <span className="muted">北京时间</span>
                  </span>
                </div>
              )}
              {subject.date && (
                <div className="airbox-item">
                  <span className="stat-label">首播</span>
                  <span className="strong num">{formatDate(subject.date)}</span>
                </div>
              )}
              {total > 0 && (
                <div className="airbox-item">
                  <span className="stat-label">集数</span>
                  <span className="strong">共 {total} 集</span>
                </div>
              )}
              {station && (
                <div className="airbox-item">
                  <span className="stat-label">电视台</span>
                  <span className="strong">{station}</span>
                </div>
              )}
              {nextEp && (
                <div className="next-ep">
                  <span className="num next-ep-num">#{nextEp.sort}</span>
                  <span className="next-ep-text">
                    <span className="next-ep-label">下一集{nextEp.airdate ? ` · ${formatDate(nextEp.airdate)}` : ''}</span>
                    <span className="strong">{nextEp.name_cn || nextEp.name || '标题待公布'}</span>
                  </span>
                </div>
              )}
            </div>

            {tags.length > 0 && (
              <div className="tags">
                {tags.map((t) => (
                  <span key={t.name} className="tag">
                    {t.name}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      <div className="container detail-body">
        <main className="detail-main">
          <section>
            <h2>简介</h2>
            <p className="summary">{subject.summary.trim() || '暂无简介'}</p>
          </section>

          {episodes.length > 0 && (
            <section>
              <div className="section-head">
                <h2>剧集</h2>
                <span className="num muted">
                  已播 {aired} / {episodes.length}
                </span>
              </div>
              <div className="ep-grid">
                {episodes.map((e, i) => {
                  const state = i < aired ? 'aired' : e.id === nextEp?.id ? 'next' : 'future'
                  return (
                    <div key={e.id} className={`ep ep-${state}`}>
                      <div className="ep-top">
                        <span className="num ep-num">{e.sort}</span>
                        <span className="ep-pill">{state === 'aired' ? '已播出' : state === 'next' ? '下一集' : '未播出'}</span>
                      </div>
                      <span className="num ep-date">{e.airdate ? formatDate(e.airdate) : '日期待定'}</span>
                      <span className="ep-title">{e.name_cn || e.name || '标题待公布'}</span>
                    </div>
                  )
                })}
              </div>
            </section>
          )}

          {cast.length > 0 && (
            <section>
              <h2>角色与声优</h2>
              <div className="cast-grid">
                {cast.map((c) => (
                  <div key={c.id} className="cast">
                    {c.images?.grid ? <img src={c.images.grid} alt={c.name} className="cast-avatar" loading="lazy" /> : <div className="cast-avatar cast-empty" />}
                    <div className="cast-text">
                      <span className="strong">{c.name}</span>
                      <span className="muted small">
                        {c.relation}
                        {c.actors?.length ? ` · CV ${c.actors.map((a) => a.name).join('、')}` : ''}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </main>

        <aside className="detail-aside">
          {staff.length > 0 && (
            <section className="staff">
              <h2>制作信息</h2>
              {staff.map((s) => (
                <div key={s.k} className="staff-row">
                  <span className="staff-key">{s.k}</span>
                  <span className="staff-val">{s.v}</span>
                </div>
              ))}
              {site && (
                <a href={site} target="_blank" rel="noreferrer" className="staff-link">
                  官方网站 ↗
                </a>
              )}
            </section>
          )}
          <p className="footnote">
            数据来源：Bangumi 番组计划 ·{' '}
            <a href={`https://bgm.tv/subject/${subject.id}`} target="_blank" rel="noreferrer">
              在 Bangumi 查看
            </a>
          </p>
        </aside>
      </div>
    </div>
  )
}
