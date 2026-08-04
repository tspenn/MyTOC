import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

type SettingsTab = 'howto' | 'upgrade'

export default function SettingsPage() {
  const { isCrew } = useAuth()
  const [tab, setTab] = useState<SettingsTab>('howto')

  return (
    <section className="page-card settings-page">
      <h1>Settings</h1>
      <p className="page-lead">
        App help and account options. Order title and description live under{' '}
        <strong>Details</strong> on each order.
      </p>

      <div className="settings-tabs" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'howto'}
          className={tab === 'howto' ? 'settings-tab settings-tab-active' : 'settings-tab'}
          onClick={() => setTab('howto')}
        >
          How to use
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'upgrade'}
          className={tab === 'upgrade' ? 'settings-tab settings-tab-active' : 'settings-tab'}
          onClick={() => setTab('upgrade')}
        >
          Upgrade
        </button>
      </div>

      {tab === 'howto' && (
        <div className="settings-panel">
          <div className="howto-rule">
            <h2>Work the list in order</h2>
            <p>
              Crew works top to bottom and cannot skip ahead.
              <strong> To unlock the next item, check the last one finished.</strong>
              {' '}Lead can drag-reorder anytime for new info or deadlines — except the task marked{' '}
              <strong>Current</strong>, which stays locked while Crew is on it.
            </p>
            <div className="howto-example" aria-label="Example">
              <p className="howto-example-label">Example</p>
              <ol className="howto-example-list">
                <li>
                  <span className="howto-check howto-check-done">✓</span>
                  Open Canva template in Canva <em>(done)</em>
                </li>
                <li>
                  <span className="howto-check">□</span>
                  Build script for the ad <em>(Current — Crew opened this card)</em>
                </li>
                <li>
                  <span className="howto-check howto-check-locked">□</span>
                  Export final cards <em>(locked until #2 is checked; Lead can still move this)</em>
                </li>
              </ol>
            </div>
          </div>

          <div className="howto-columns">
            <article className="howto-card">
              <h2>For Leads (Project Manager)</h2>
              <ol>
                <li>Create an order from your dashboard.</li>
                <li>Open <strong>Details</strong> to set the title and overview description (links, colors, notes).</li>
                <li>Add tasks under <strong>Objectives</strong> in the order the crew should do them.</li>
                <li>Drag the ⠿ handle to reorder anytime — the <strong>Current</strong> task cannot be moved.</li>
                <li>Open a task card to edit details or attach files <em>before</em> it is marked done.</li>
                <li>Use <strong>Assign Crew</strong> to invite an operator (they need a MyTOC account).</li>
                <li>Set your <strong>Availability</strong> in Profile so subs know when you are taking work.</li>
                <li>After a task is checked done, change requests go through <strong>Messages</strong>.</li>
                <li>When the crew marks the order complete, review and confirm (or send it back).</li>
              </ol>
            </article>

            <article className="howto-card">
              <h2>For Assignees (Subcontractors)</h2>
              <ol>
                <li>Sign up as an assignee, then turn on <strong>Notifications</strong> in Profile (must have notifications enabled on your device/s).</li>
                <li>Open <strong>My Jobs</strong> when your Lead assigns an order.</li>
                <li>Work tasks top to bottom — check one finished to unlock the next.</li>
                <li>Open a task card to mark it <strong>Current</strong> (your Lead sees that pill) and read details/files.</li>
                <li>Ask questions or report issues in <strong>Messages</strong> (pick the related task).</li>
                <li>When every task is done, tap <strong>Mark Complete</strong> so your Lead can review.</li>
              </ol>
            </article>
          </div>

          <p className="muted-text settings-profile-link">
            Notifications and password: <Link to="/profile">Profile</Link>
            {isCrew ? ' · Your jobs: ' : ' · Your orders: '}
            <Link to={isCrew ? '/my-cards' : '/dashboard'}>{isCrew ? 'My Jobs' : 'Dashboard'}</Link>
          </p>
        </div>
      )}

      {tab === 'upgrade' && (
        <div className="settings-panel settings-upgrade">
          <h2>Upgrade</h2>
          <p className="muted-text">
            Coming someday — higher crew limits, more Lead seats, and priority support.
            For now, enjoy the current plan from the{' '}
            <Link to="/home#pricing">pricing page</Link>.
          </p>
          <div className="settings-upgrade-placeholder">
            <p>🚀 Upgrade options will live here.</p>
          </div>
        </div>
      )}
    </section>
  )
}
