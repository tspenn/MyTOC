import { useState } from 'react'
import { Link } from 'react-router-dom'
import TeamPanel from '../components/TeamPanel'
import { useAuth } from '../hooks/useAuth'

type SettingsTab = 'howto' | 'team' | 'upgrade'

export default function SettingsPage() {
  const { isTeamMember, isLead } = useAuth()
  const [tab, setTab] = useState<SettingsTab>('howto')

  return (
    <section className="page-card settings-page">
      <div className="settings-heading">
        <img
          src="/star_image_accent.jpg"
          alt=""
          className="settings-star-accent"
          aria-hidden="true"
        />
        <div>
          <h1>Settings</h1>
          <p className="page-lead">
            App help and account options. Directive title and description live under{' '}
            <strong>Details</strong> on each directive.
          </p>
        </div>
      </div>

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
        {isLead && (
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'team'}
            className={tab === 'team' ? 'settings-tab settings-tab-active' : 'settings-tab'}
            onClick={() => setTab('team')}
          >
            Team
          </button>
        )}
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
            <h2>Work items in sequence</h2>
            <p>
              Team Members work top to bottom and cannot skip ahead.
              <strong> To unlock the next item, mark the last one done.</strong>
              {' '}Lead can drag-reorder anytime for new info or deadlines — except the item marked{' '}
              <strong>Current</strong>, which stays locked while Team Members are on it.
            </p>
            <div className="howto-example" aria-label="Example">
              <p className="howto-example-label">Example</p>
              <ol className="howto-example-list">
                <li>
                  <span className="howto-check howto-check-done">✓</span>
                  Updated brand guidelines <em>(done)</em>
                </li>
                <li>
                  <span className="howto-check">□</span>
                  Q3 competitive analysis <em>(Current — Team Member opened this item)</em>
                </li>
                <li>
                  <span className="howto-check howto-check-locked">□</span>
                  Confirm vendor shortlist <em>(locked until #2 is marked done; Lead can still move this)</em>
                </li>
              </ol>
            </div>
          </div>

          <div className="howto-columns">
            <article className="howto-card">
              <h2>For Leads</h2>
              <ol>
                <li>Create a directive from Command view.</li>
                <li>Open <strong>Details</strong> to set the title and overview description (links, context, notes).</li>
                <li>Add items under <strong>Items</strong> in the order team members should work them.</li>
                <li>Drag the ⠿ handle to reorder anytime — the <strong>Current</strong> item cannot be moved.</li>
                <li>Open an item to edit details or attach files <em>before</em> it is marked done.</li>
                <li>Use <strong>Assign</strong> to add a team member (Lead ID invite from Settings → Team, or email).</li>
                <li>Set your <strong>Availability</strong> in Profile so team members know when you are taking directives.</li>
                <li>After an item is marked done, change requests go through <strong>Messages</strong>.</li>
                <li>When a Team Member marks the directive done, review and confirm (or send it back).</li>
              </ol>
            </article>

            <article className="howto-card">
              <h2>For Team Members</h2>
              <ol>
                <li>Sign up with your Lead&apos;s invite link and worker number — not the public signup page.</li>
                <li>Turn on <strong>Notifications</strong> in Profile (must have notifications enabled on your device/s).</li>
                <li>Open <strong>My Directives</strong> when your Lead assigns a directive.</li>
                <li>Work items top to bottom — mark one done to unlock the next.</li>
                <li>Open an item to mark it <strong>Current</strong> (your Lead sees that pill) and read details/files.</li>
                <li>Ask questions or report issues in <strong>Messages</strong> (pick the related item).</li>
                <li>When every item is done, tap <strong>Mark Done</strong> so your Lead can review.</li>
              </ol>
            </article>
          </div>

          <p className="muted-text settings-profile-link">
            Notifications and password: <Link to="/profile">Profile</Link>
            {isTeamMember ? ' · Your directives: ' : ' · Command view: '}
            <Link to={isTeamMember ? '/my-cards' : '/dashboard'}>
              {isTeamMember ? 'My Directives' : 'Command view'}
            </Link>
          </p>
        </div>
      )}

      {tab === 'team' && isLead && (
        <div className="settings-panel">
          <TeamPanel />
        </div>
      )}

      {tab === 'upgrade' && (
        <div className="settings-panel settings-upgrade">
          <h2>Upgrade</h2>
          {isTeamMember ? (
            <p className="muted-text">Only the account Lead can manage a subscription.</p>
          ) : (
            <p className="muted-text">
              Compare plans and choose a subscription on the{' '}
              <Link to="/home#pricing">pricing page</Link>.
              Plan names are for billing only — your team always sees you as <strong>Lead</strong>.
            </p>
          )}
        </div>
      )}
    </section>
  )
}
