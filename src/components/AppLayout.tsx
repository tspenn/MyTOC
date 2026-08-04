import { Outlet } from 'react-router-dom'
import BottomNav from './BottomNav'
import Header from './Header'
import PushPermissionBanner from './PushPermissionBanner'
import TrialBanner from './TrialBanner'

export default function AppLayout() {
  return (
    <div className="app-shell">
      <Header />
      <TrialBanner />
      <PushPermissionBanner />
      <main className="app-main">
        <Outlet />
      </main>
      <BottomNav />
    </div>
  )
}
