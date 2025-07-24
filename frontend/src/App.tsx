import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
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
import { LoginSuccessPage } from './pages/LoginSuccessPage'
import { AuthProvider } from './components/AuthProvider'
import { ErrorBoundary } from './components/ErrorBoundary'
import { AdminRoute } from './components/AdminRoute'
import NotFoundPage from './pages/NotFoundPage'
import PricingPage from './pages/PricingPage'
import SubscriptionManagePage from './pages/SubscriptionManagePage'
import SubscriptionUpgradePage from './pages/SubscriptionUpgradePage'
import SubscriptionSuccessPage from './pages/SubscriptionSuccessPage'
import CanvasTestPage from './pages/CanvasTestPage'
import ErrorTestPage from './pages/ErrorTestPage'

const queryClient = new QueryClient()

function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
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
              {/* 管理员专用页面 */}
              <Route path="/api-test" element={<AdminRoute><APITestPage /></AdminRoute>} />
              <Route path="/canvas-test" element={<AdminRoute><CanvasTestPage /></AdminRoute>} />
              <Route path="/error-test" element={<AdminRoute><ErrorTestPage /></AdminRoute>} />
              
              <Route path="/login" element={<LoginPage />} />
              <Route path="/login-success" element={<LoginSuccessPage />} />
              <Route path="/user-center" element={<UserCenterPage />} />
              <Route path="/shared/:shareId" element={<SharedContentPage />} />
              <Route path="/pricing" element={<PricingPage />} />
              <Route path="/subscription/manage" element={<SubscriptionManagePage />} />
              <Route path="/subscription/upgrade" element={<SubscriptionUpgradePage />} />
              <Route path="/subscription/success" element={<SubscriptionSuccessPage />} />
              {/* 404 页面 - 必须放在最后 */}
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </Layout>
        </Router>
      </AuthProvider>
    </QueryClientProvider>
    </ErrorBoundary>
  )
}

export default App