import { Navigate, Route, Routes } from 'react-router-dom'
import AppLayout from './components/AppLayout'
import ProtectedRoute from './components/ProtectedRoute'
import ChecklistDetailPage from './pages/ChecklistDetailPage'
import DashboardPage from './pages/DashboardPage'
import ForgotPasswordPage from './pages/ForgotPasswordPage'
import JoinLeadPage from './pages/JoinLeadPage'
import LandingPage from './pages/LandingPage'
import LoginPage from './pages/LoginPage'
import MyCardsPage from './pages/MyCardsPage'
import ResetPasswordPage from './pages/ResetPasswordPage'
import ProfilePage from './pages/ProfilePage'
import SettingsPage from './pages/SettingsPage'
import SignupPage from './pages/SignupPage'
import TeamSignupPage from './pages/TeamSignupPage'
import { useAuth } from './hooks/useAuth'

function HomeRedirect() {
  const { isAuthenticated, isTeamMember, initialized } = useAuth()
  if (!initialized) {
    return <p className="loading-screen muted-text">Loading…</p>
  }
  if (!isAuthenticated) return <Navigate to="/home" replace />
  return <Navigate to={isTeamMember ? '/my-cards' : '/dashboard'} replace />
}

function App() {
  return (
    <Routes>
      {/* Public pages */}
      <Route path="/home"           element={<LandingPage />} />
      <Route path="/login"          element={<LoginPage />} />
      <Route path="/signup"         element={<SignupPage />} />
      <Route path="/team-signup"    element={<TeamSignupPage />} />
      <Route path="/join-lead"      element={<JoinLeadPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password"  element={<ResetPasswordPage />} />

      {/* Authenticated app shell */}
      <Route element={<AppLayout />}>
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <DashboardPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/my-cards"
          element={
            <ProtectedRoute>
              <MyCardsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/checklist/:id"
          element={
            <ProtectedRoute>
              <ChecklistDetailPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <ProfilePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/settings"
          element={
            <ProtectedRoute>
              <SettingsPage />
            </ProtectedRoute>
          }
        />
      </Route>

      <Route path="/"  element={<HomeRedirect />} />
      <Route path="*" element={<HomeRedirect />} />
    </Routes>
  )
}

export default App
