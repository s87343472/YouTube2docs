import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { Layout } from './components/layout/Layout'
import { HomePage } from './pages/HomePage'
import { ProcessPage } from './pages/ProcessPage'
import { ResultPage } from './pages/ResultPage'
import { AboutPage } from './pages/AboutPage'
import { APITestPage } from './pages/APITestPage'
import { ProcessDemoPage } from './pages/ProcessDemoPage'
import { UserCenterPage } from './pages/UserCenterPage'
import { SharedContentPage } from './pages/SharedContentPage'
import { LoginPage } from './pages/LoginPage'
import { AuthProvider } from './components/AuthProvider'
import PricingPage from './pages/PricingPage'
import SubscriptionManagePage from './pages/SubscriptionManagePage'
import SubscriptionUpgradePage from './pages/SubscriptionUpgradePage'
import SubscriptionSuccessPage from './pages/SubscriptionSuccessPage'

function App() {
  return (
    <AuthProvider>
      <Router>
        <Layout>
          <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/process" element={<ProcessPage />} />
          <Route path="/process-demo" element={<ProcessDemoPage />} />
          <Route path="/process/:id" element={<ProcessDemoPage />} />
          <Route path="/result/:id" element={<ResultPage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/api-test" element={<APITestPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/user-center" element={<UserCenterPage />} />
          <Route path="/shared/:shareId" element={<SharedContentPage />} />
          <Route path="/pricing" element={<PricingPage />} />
          <Route path="/subscription/manage" element={<SubscriptionManagePage />} />
          <Route path="/subscription/upgrade" element={<SubscriptionUpgradePage />} />
          <Route path="/subscription/success" element={<SubscriptionSuccessPage />} />
          </Routes>
        </Layout>
      </Router>
    </AuthProvider>
  )
}

export default App