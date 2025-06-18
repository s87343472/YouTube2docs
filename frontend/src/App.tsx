import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { Layout } from './components/layout/Layout'
import { HomePage } from './pages/HomePage'
import { ProcessPage } from './pages/ProcessPage'
import { ResultPage } from './pages/ResultPage'
import { AboutPage } from './pages/AboutPage'
import { APITestPage } from './pages/APITestPage'
import { ProcessDemoPage } from './pages/ProcessDemoPage'

function App() {
  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/process" element={<ProcessPage />} />
          <Route path="/process-demo" element={<ProcessDemoPage />} />
          <Route path="/result/:id" element={<ResultPage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/api-test" element={<APITestPage />} />
        </Routes>
      </Layout>
    </Router>
  )
}

export default App