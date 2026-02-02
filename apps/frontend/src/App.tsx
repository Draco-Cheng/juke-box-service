import { Routes, Route } from 'react-router-dom'
import HomePage from './pages/HomePage'
import JoinPage from './pages/JoinPage'
import RegisterPage from './pages/RegisterPage'
import DJLoginPage from './pages/dj/DJLoginPage'
import DJDashboardPage from './pages/dj/DJDashboardPage'
import { OfflineBanner } from './components/OfflineBanner'

function App() {
  return (
    <>
      <OfflineBanner />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/join/:venueSlug" element={<JoinPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/login" element={<DJLoginPage />} />
        <Route path="/dj" element={<DJLoginPage />} />
        <Route path="/dj/dashboard" element={<DJDashboardPage />} />
      </Routes>
    </>
  )
}

export default App
