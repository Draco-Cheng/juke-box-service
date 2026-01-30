import { Routes, Route } from 'react-router-dom'
import HomePage from './pages/HomePage'
import JoinPage from './pages/JoinPage'
import DJDashboard from './pages/DJDashboard'

function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/join/:venueSlug" element={<JoinPage />} />
      <Route path="/dj/*" element={<DJDashboard />} />
    </Routes>
  )
}

export default App
