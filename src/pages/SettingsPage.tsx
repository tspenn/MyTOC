import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import InstallGuide from '../components/InstallGuide'
import TeamPanel from '../components/TeamPanel'
import { useAuth } from '../hooks/useAuth'
import { fetchTrialStatus } from '../lib/checklistApi'
import PricingCta from '../components/PricingCta'
import { PLANS, type BillingInterval } from '../lib/pricing'

type SettingsTab = 'howto' | 'team' | 'upgrade'

export default function SettingsPage() {
  const { isTeamMember, isLead } = useAuth()
  const [searchParams] = useSearchParams()
  const initialTab = searchParams.get('tab') === 'upgrade' ? 'upgrade' : 'howto'
  const [tab, setTab] = useState<SettingsTab>(initialTab)
  const [planLabel, setPlanLabel] = useState('Free')
  const [billing, setBilling] = useState<BillingInterval>('monthly')

  useEffect(() => {
    if (searchParams.get('tab') === 'upgrade') setTab('upgrade')
  }, [searchParams])

  useEffect(() => {
    if (tab !== 'upgrade' || isTeamMember) return
    void fetchTrialStatus().then((trial) => {
      if (trial?.plan_label) setPlanLabel(trial.plan_label)
    })
  }, [tab, isTeamMember])

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
                <li>Use <strong>Assign</strong> to add a team member from your roster (invite link from Settings → Team).</li>
                <li>Set your <strong>Availability</strong> in Profile so team members know when you are taking directives.</li>
                <li>After an item is marked done, change requests go through <strong>Messages</strong>.</li>
                <li>When a Team Member marks the directive done, review and confirm (or send it back).</li>
              </ol>
            </article>

            <article className="howto-card">
              <h2>For Team Members</h2>
              <ol>
                <li>Sign up with your Lead&apos;s invite link and worker number — not the public signup page.</li>
                <li>Install MyTOC on your phone (see below), then turn on <strong>Notifications</strong> in Profile.</li>
                <li>Open <strong>My Directives</strong> when your Lead assigns a directive.</li>
                <li>Work items top to bottom — mark one done to unlock the next.</li>
                <li>Open an item to mark it <strong>Current</strong> (your Lead sees that pill) and read details/files.</li>
                <li>Ask questions or report issues in <strong>Messages</strong> (pick the related item).</li>
                <li>When every item is done, tap <strong>Mark Done</strong> so your Lead can review.</li>
              </ol>
            </article>
          </div>

          <InstallGuide />

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
            <>
            <p className="muted-text">
              Current plan: <strong>{planLabel}</strong>.
              Plan names are for billing only — your team always sees you as <strong>Lead</strong>.
              Subscribe here whenever you are ready — even during the free trial.
              Opens Stripe so you can pay or apply a coupon. The 14-day trial never asks for a card.
            </p>
            <div className="billing-toggle billing-toggle-settings" role="group" aria-label="Billing interval">
              <button
                type="button"
                className={billing === 'monthly' ? 'billing-toggle-btn billing-toggle-active' : 'billing-toggle-btn'}
                onClick={() => setBilling('monthly')}
              >
                Monthly
              </button>
              <button
                type="button"
                className={billing === 'annual' ? 'billing-toggle-btn billing-toggle-active' : 'billing-toggle-btn'}
                onClick={() => setBilling('annual')}
              >
                Annual <span className="billing-toggle-save">2 mo free</span>
              </button>
            </div>
            <div className="settings-plan-grid">
              {PLANS.map((plan) => (
                <div key={plan.tier} className="settings-plan-card">
                  <h3>{plan.name}</h3>
                  <p className="muted-text small-text">
                    ${billing === 'monthly' ? plan.monthlyPrice : plan.annualPrice}
                    {billing === 'monthly' ? '/mo' : '/yr'}
                  </p>
                  <PricingCta plan={plan} interval={billing} variant={plan.featured ? 'gold' : 'primary'} mode="subscribe" />
                </div>
              ))}
            </div>
            </>
          )}
        </div>
      )}
    </section>
  )
}
