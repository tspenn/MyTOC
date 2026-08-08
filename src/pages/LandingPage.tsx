import { Link } from 'react-router-dom'
import InstallAppButton from '../components/InstallAppButton'

const STARTER_FEATURES = [
  '1 Lead account',
  'Up to 5 Team Members',
  'Unlimited Directives',
  'Real-time status & confirmation',
  'Clean audit trail',
  'Push notifications',
  'Mobile-first PWA',
]

const TEAM_FEATURES = [
  '3 Lead accounts',
  'Up to 25 Team Members',
  'Unlimited Directives',
  'Real-time status & confirmation',
  'Clean audit trail',
  'Push notifications',
  'Priority support',
]

export default function LandingPage() {
  return (
    <div className="landing">

      {/* ── Hero ───────────────────────────────────────── */}
      <section className="landing-hero">
        <img
          className="hero-media"
          src="/toc-window.png"
          alt="View of Earth through a tactical operations viewport"
        />
        <div className="hero-scrim" aria-hidden="true" />
        <div className="hero-content">
          <p className="hero-brand-text">MyTOC</p>
          <div className="hero-badge">Executive Command Platform</div>
          <h1 className="hero-title">
            Complete Operational<br />
            <span className="hero-accent">Command.</span>
          </h1>
          <p className="hero-sub">
            Your Tactical Command Center — everything at your fingertips, wherever you go.
            Keeping you on top of the game when every moment counts. Tick Tock.
          </p>
          <div className="hero-ctas">
            <Link to="/signup" className="btn btn-gold btn-lg">
              Launch Your TOC
            </Link>
            <InstallAppButton className="btn-lg" />
          </div>
        </div>
      </section>

      {/* ── How it works ───────────────────────────────── */}
      <section className="landing-section">
        <h2 className="section-title">Open. Assign. Track. Confirm.</h2>
        <div className="how-it-works">
          <div className="how-step">
            <span className="how-number">1</span>
            <h3>Issue a Directive</h3>
            <p>Name it, add items, attach what matters. Seconds — not a project plan.</p>
          </div>
          <div className="how-divider">→</div>
          <div className="how-step">
            <span className="how-number">2</span>
            <h3>Assign ownership</h3>
            <p>Your team member gets a push (notifications on). They open MyTOC and see exactly what&apos;s needed.</p>
          </div>
          <div className="how-divider">→</div>
          <div className="how-step">
            <span className="how-number">3</span>
            <h3>Confirm done</h3>
            <p>Team Member marks done. You confirm — or send it back. Clear ownership. Instant status.</p>
          </div>
        </div>
      </section>

      {/* ── Trust & Security ───────────────────────────── */}
      <div className="trust-section">
        <div className="trust-inner">
          <span className="trust-shield" aria-hidden="true">🔒</span>
          <div className="trust-content">
            <h2>Your data is safe with us.</h2>
            <p>
              MyTOC is built on{' '}
              <a
                href="https://supabase.com"
                target="_blank"
                rel="noopener noreferrer"
                className="trust-supabase-link"
              >
                Supabase
              </a>
              {' '}— the industry gold standard for secure, open-source database infrastructure.
              Your directives, items, and messages are encrypted at rest and in transit, protected
              by row-level security policies so only authorized users can ever see your data.
              We never sell your information, and you can delete your account at any time.
            </p>
            <div className="trust-badges">
              <span className="trust-badge"><span className="trust-badge-icon">🔐</span> Encrypted at rest</span>
              <span className="trust-badge"><span className="trust-badge-icon">🔑</span> Row-level security</span>
              <span className="trust-badge"><span className="trust-badge-icon">🌐</span> SSL / TLS in transit</span>
              <span className="trust-badge"><span className="trust-badge-icon">🏦</span> SOC 2 infrastructure</span>
              <span className="trust-badge"><span className="trust-badge-icon">🗑️</span> Delete your data anytime</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Pricing ────────────────────────────────────── */}
      <section className="landing-section landing-pricing" id="pricing">
        <h2 className="section-title">Simple, transparent pricing</h2>
        <p className="section-sub">No hidden fees. Cancel any time.</p>

        <div className="pricing-grid">

          <div className="pricing-card">
            <div className="pricing-card-header">
              <span className="pricing-tier-label">Solo Command</span>
              <div className="pricing-amount">
                <span className="pricing-dollar">$</span>
                <span className="pricing-number">19</span>
                <span className="pricing-period">/ month</span>
              </div>
              <div className="pricing-annual-note">
                or <strong>$190 / year</strong>
                <span className="pricing-savings-pill">2 months free</span>
              </div>
              <p className="pricing-desc">
                Built for the individual COO or executive who needs a personal command layer for their closest team members.
              </p>
            </div>

            <ul className="pricing-features">
              {STARTER_FEATURES.map((f) => (
                <li key={f}>
                  <span className="feature-check">✓</span>
                  {f}
                </li>
              ))}
            </ul>

            <Link to="/signup" className="btn btn-primary btn-full pricing-cta">
              Start Solo Command
            </Link>
          </div>

          <div className="pricing-card pricing-card-featured">
            <div className="pricing-featured-badge">Best Value</div>

            <div className="pricing-card-header">
              <span className="pricing-tier-label">Team Command</span>
              <div className="pricing-amount">
                <span className="pricing-dollar">$</span>
                <span className="pricing-number">49</span>
                <span className="pricing-period">/ month</span>
              </div>
              <div className="pricing-annual-note">
                or <strong>$490 / year</strong>
                <span className="pricing-savings-pill">2 months free</span>
              </div>
              <p className="pricing-desc">
                Built for executive ops — COOs, chiefs of staff, and small cross-functional leadership groups.
              </p>
            </div>

            <ul className="pricing-features">
              {TEAM_FEATURES.map((f) => (
                <li key={f}>
                  <span className="feature-check feature-check-gold">✓</span>
                  {f}
                </li>
              ))}
            </ul>

            <Link to="/signup" className="btn btn-gold btn-full pricing-cta">
              Start Team Command
            </Link>
          </div>
        </div>

        <p className="pricing-trial-note">
          All plans include a <strong>14-day free trial</strong> — <strong>no credit card required</strong>.
        </p>
      </section>

      {/* ── Footer ─────────────────────────────────────── */}
      <footer className="landing-footer">
        <div className="footer-brand">
          <img src="/Logo.jpg" alt="MyTOC" className="footer-logo-img" />
          <span className="footer-logo">Tactical Operations Center</span>
        </div>
        <p className="footer-copy">MyTOC.app © {new Date().getFullYear()} Skyland Publishing for Skyland Reach LLC</p>
        <nav className="footer-nav">
          <Link to="/login">Log in</Link>
          <Link to="/signup">Sign up</Link>
          <a href="https://skylandreach.com/privacy-policy" target="_blank" rel="noopener noreferrer">Privacy Policy</a>
        </nav>
      </footer>
    </div>
  )
}
