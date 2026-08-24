import { useEffect, useState } from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { useAppStore } from './store/appStore'
import Sidebar from './components/layout/Sidebar'
import Home from './pages/Home'
import Devices from './pages/Devices'
import Dashboard from './pages/Dashboard'
import Blueprints from './pages/Blueprints'
import CodeAnalyzer from './pages/CodeAnalyzer'
import Settings from './pages/Settings'

function App() {
  const { setTheme, isDarkMode } = useAppStore()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    // Load theme preference
    const savedTheme = localStorage.getItem('truesync-theme')
    if (savedTheme) {
      setTheme(savedTheme as 'dark' | 'light')
    }
  }, [])

  if (!mounted) return null

  return (
    <div className={isDarkMode ? 'dark' : 'light'}>
      <Router>
        <div className="flex h-screen bg-truesync-darker text-white">
          <Sidebar />
          <main className="flex-1 overflow-hidden">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/devices" element={<Devices />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/blueprints" element={<Blueprints />} />
              <Route path="/analyzer" element={<CodeAnalyzer />} />
              <Route path="/settings" element={<Settings />} />
            </Routes>
          </main>
        </div>
      </Router>
    </div>
  )
}

export default App
