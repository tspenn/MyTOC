import { Link } from 'react-router-dom'

const STARTER_FEATURES = [
  '1 Lead account',
  '1 Operator',
  'Unlimited initiatives',
  'Task checklists',
  'Real-time updates',
  'Push notifications',
  'Confirm / reject completions',
]

const TEAM_FEATURES = [
  '3 Lead accounts',
  '15 Operators',
  'Unlimited initiatives',
  'Task checklists',
  'Real-time updates',
  'Push notifications',
  'Confirm / reject completions',
  'Priority support',
]

export default function LandingPage() {
  return (
    <div className="landing">

      {/* ── Hero ───────────────────────────────────────── */}
      <section className="landing-hero">
        <div className="hero-content">
          <div className="hero-badge">Executive Command Platform</div>
          <h1 className="hero-title">
            Complete Operational<br />
            <span className="hero-accent">Command.</span>
          </h1>
          <p className="hero-sub">
            Your personal Tactical Operations Center—giving you the global oversight and totality of presence needed to run daily operations effortlessly.
          </p>
          <div className="hero-ctas">
            <Link to="/signup" className="btn btn-gold btn-lg">
              Launch Your TOC
            </Link>
            <a href="#pricing" className="btn btn-outline btn-lg">
              See Pricing
            </a>
          </div>
        </div>
      </section>

      {/* ── How it works ───────────────────────────────── */}
      <section className="landing-section">
        <h2 className="section-title">How it works</h2>
        <div className="how-it-works">
          <div className="how-step">
            <span className="how-number">1</span>
            <h3>Lead creates an order</h3>
            <p>Add tasks, attach files, set due dates. One clear card per initiative.</p>
          </div>
          <div className="how-divider">→</div>
          <div className="how-step">
            <span className="how-number">2</span>
            <h3>Operators get notified</h3>
            <p>Assignees get a push notification (notifications must be on). They open MyTOC and see exactly what is needed.</p>
          </div>
          <div className="how-divider">→</div>
          <div className="how-step">
            <span className="how-number">3</span>
            <h3>Lead confirms</h3>
            <p>Operators mark the order complete. Lead reviews and confirms — or sends it back.</p>
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
              Your orders, tasks, and messages are encrypted at rest and in transit, protected
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
        <h2 className="section-title">Simple pricing</h2>
        <p className="section-sub">No hidden fees. Cancel any time.</p>

        <div className="pricing-grid">

          <div className="pricing-card">
            <div className="pricing-card-header">
              <span className="pricing-tier-label">Solopreneur</span>
              <div className="pricing-amount">
                <span className="pricing-dollar">$</span>
                <span className="pricing-number">3.99</span>
                <span className="pricing-period">/mo</span>
              </div>
              <div className="pricing-annual-note">
                or <strong>$39.90/year</strong>
                <span className="pricing-savings-pill">2 months free</span>
              </div>
              <p className="pricing-desc">Perfect for a solo lead and one operator.</p>
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
              Start Solopreneur
            </Link>
          </div>

          <div className="pricing-card pricing-card-featured">
            <div className="pricing-featured-badge">Best Value</div>

            <div className="pricing-card-header">
              <span className="pricing-tier-label">Team</span>
              <div className="pricing-amount">
                <span className="pricing-dollar">$</span>
                <span className="pricing-number">14.99</span>
                <span className="pricing-period">/mo</span>
              </div>
              <div className="pricing-annual-note">
                or <strong>$149.90/year</strong>
                <span className="pricing-savings-pill">2 months free</span>
              </div>
              <p className="pricing-desc">Built for executive ops — COOs, chiefs of staff, and cross-functional leads.</p>
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
              Start with Team
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
          <span className="footer-logo">Tactical Operations Center</span>
        </div>
        <p className="footer-copy">© {new Date().getFullYear()} MyTOC.com. Built for COOs and C-Suite operators.</p>
        <nav className="footer-nav">
          <Link to="/login">Log in</Link>
          <Link to="/signup">Sign up</Link>
          <a href="https://skylandreach.com/privacy-policy" target="_blank" rel="noopener noreferrer">Privacy Policy</a>
        </nav>
      </footer>
    </div>
  )
}
