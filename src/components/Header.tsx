import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'

export function Header({ back, right }: { back?: string; right?: ReactNode }) {
  return (
    <header className="header glass">
      <div className="header-inner">
        {back ? (
          <Link to={back} className="back">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 5l-7 7 7 7" />
            </svg>
            本周排表
          </Link>
        ) : (
          <Link to="/" className="brand" aria-label="Fanotter">
            <img src="/icons/icon-192.png" alt="" className="brand-icon" />
            <span className="brand-name">Fanotter</span>
          </Link>
        )}
        {back && (
          <span className="brand">
            <img src="/icons/icon-192.png" alt="" className="brand-icon" />
            <span className="brand-name">Fanotter</span>
          </span>
        )}
        <span className="header-right num">{right}</span>
      </div>
    </header>
  )
}
