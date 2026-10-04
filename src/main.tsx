import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { DetailPage } from './pages/Detail'
import { WeekPage } from './pages/Week'
import './styles.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<WeekPage />} />
        <Route path="/subject/:id" element={<DetailPage />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>,
)
