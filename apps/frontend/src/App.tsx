import { Routes, Route } from 'react-router-dom'
import HomePage from './pages/HomePage'
import JoinPage from './pages/JoinPage'
import DJLoginPage from './pages/dj/DJLoginPage'
import DJDashboardPage from './pages/dj/DJDashboardPage'

function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/join/:venueSlug" element={<JoinPage />} />
      <Route path="/dj" element={<DJLoginPage />} />
      <Route path="/dj/dashboard" element={<DJDashboardPage />} />
    </Routes>
  )
}

export default App
