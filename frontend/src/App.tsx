import { lazy, Suspense } from 'react'
import { Route, Routes } from 'react-router-dom'

import { Layout } from '@/components/Layout'

// Pages load on demand, so the charting library is only fetched where charts appear.
const Home = lazy(() => import('@/pages/Home'))
const MessageCoach = lazy(() => import('@/pages/MessageCoach'))
const TeamDiagnostic = lazy(() => import('@/pages/TeamDiagnostic'))
const Research = lazy(() => import('@/pages/Research'))

export default function App() {
  return (
    <Layout>
      <Suspense fallback={<div className="min-h-screen" />}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/team-diagnostic" element={<TeamDiagnostic />} />
          <Route path="/message-coach" element={<MessageCoach />} />
          <Route path="/research" element={<Research />} />
          <Route path="*" element={<Home />} />
        </Routes>
      </Suspense>
    </Layout>
  )
}
