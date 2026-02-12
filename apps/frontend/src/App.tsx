import { Routes, Route, useLocation } from 'react-router-dom'
import HomePage from './pages/HomePage'
import DJDetailPage from './pages/DJDetailPage'
import JoinPage from './pages/JoinPage'
import RegisterPage from './pages/RegisterPage'
import DJLoginPage from './pages/dj/DJLoginPage'
import DJDashboardPage from './pages/dj/DJDashboardPage'
import DJGoLivePage from './pages/dj/DJGoLivePage'
import DJHistoryPage from './pages/dj/DJHistoryPage'
import { OfflineBanner } from './components/OfflineBanner'
import { BottomNav } from './components/BottomNav'

/** Pages where the bottom nav should be hidden */
const HIDE_NAV_ROUTES = ['/register', '/login', '/join', '/venue']

function App() {
  const location = useLocation()
  const showNav = !HIDE_NAV_ROUTES.some((r) =>
    location.pathname === r || location.pathname.startsWith(r + '/'),
  )

  return (
    <>
      <OfflineBanner />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/venue/:venueSlug" element={<DJDetailPage />} />
        <Route path="/join/:venueSlug" element={<JoinPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/login" element={<DJLoginPage />} />
        <Route path="/dj" element={<DJLoginPage />} />
        <Route path="/dj/dashboard" element={<DJDashboardPage />} />
        <Route path="/dj/go-live" element={<DJGoLivePage />} />
        <Route path="/dj/history" element={<DJHistoryPage />} />
      </Routes>
      {showNav && <BottomNav />}
    </>
  )
}

export default App
