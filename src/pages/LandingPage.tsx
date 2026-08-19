import { useState } from 'react'
import { Link } from 'react-router-dom'
import InstallAppButton from '../components/InstallAppButton'
import PricingCta from '../components/PricingCta'
import { PLANS, type BillingInterval } from '../lib/pricing'

export default function LandingPage() {
  const [billing, setBilling] = useState<BillingInterval>('monthly')
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
          <div className="hero-badge">Executive Command Platform</div>
          <h1 className="hero-title">
            Tactical Operations<br />
            <span className="hero-accent">Command.</span>
          </h1>
          <p className="hero-sub">
            Your complete operational command center! Everything at your fingertips, wherever you go.
            Keeping you on top of the game when every moment counts.
            <span className="hero-tick-tock">Tick Tock</span>
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
            <p>Your team member gets a push (notifications on). They open TOC and see exactly what&apos;s needed.</p>
          </div>
          <div className="how-divider">→</div>
          <div className="how-step">
            <span className="how-number">3</span>
            <h3>Confirm done</h3>
            <p>Team Member marks done. You confirm — or send it back. Clear ownership. Instant status.</p>
          </div>
        </div>
      </section>

      {/* ── Promo video ────────────────────────────────── */}
      <section className="landing-section landing-video">
        <h2 className="section-title">See TOC in action</h2>
        <div className="landing-video-frame">
          <iframe
            className="landing-video-embed"
            src="https://www.youtube.com/embed/_vzB73XVNa8"
            title="Tactical Operations Command"
            loading="lazy"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            referrerPolicy="strict-origin-when-cross-origin"
          />
        </div>
      </section>

      {/* ── Trust & Security ───────────────────────────── */}
      <div className="trust-section">
        <div className="trust-inner">
          <span className="trust-shield" aria-hidden="true">🔒</span>
          <div className="trust-content">
            <h2>Your data is safe with us.</h2>
            <p>
              TOC is built on{' '}
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

        <div className="billing-toggle" role="group" aria-label="Billing interval">
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

        <div className="pricing-grid">
          {PLANS.map((plan) => {
            const price = billing === 'monthly' ? plan.monthlyPrice : plan.annualPrice
            const period = billing === 'monthly' ? '/ month' : '/ year'
            return (
              <div
                key={plan.tier}
                className={plan.featured ? 'pricing-card pricing-card-featured' : 'pricing-card'}
              >
                {plan.featured && <div className="pricing-featured-badge">Best Value</div>}

                <div className="pricing-card-header">
                  <span className="pricing-tier-label">{plan.name}</span>
                  <div className="pricing-amount">
                    <span className="pricing-dollar">$</span>
                    <span className="pricing-number">{price}</span>
                    <span className="pricing-period">{period}</span>
                  </div>
                  {billing === 'monthly' ? (
                    <div className="pricing-annual-note">
                      or <strong>${plan.annualPrice} / year</strong>
                      <span className="pricing-savings-pill">2 months free</span>
                    </div>
                  ) : (
                    <div className="pricing-annual-note">
                      <strong>${plan.monthlyPrice} / month</strong> if billed monthly
                    </div>
                  )}
                  <p className="pricing-desc">{plan.description}</p>
                </div>

                <ul className="pricing-features">
                  {plan.features.map((f) => (
                    <li key={f}>
                      <span className={plan.featured ? 'feature-check feature-check-gold' : 'feature-check'}>✓</span>
                      {f}
                    </li>
                  ))}
                </ul>

                <PricingCta plan={plan} interval={billing} variant={plan.featured ? 'gold' : 'primary'} mode="start-trial" />
              </div>
            )
          })}
        </div>

        <p className="pricing-trial-note">
          All plans include a <strong>14-day free trial</strong> — <strong>no credit card required</strong>.
          Subscribe later from Settings → Upgrade.
        </p>
      </section>

      {/* ── Footer ─────────────────────────────────────── */}
      <footer className="landing-footer">
        <div className="footer-brand">
          <img src="/Logo.jpg" alt="TOC" className="footer-logo-img" />
          <span className="footer-logo">Tactical Operations Command</span>
        </div>
        <p className="footer-copy">
          Get it today at{' '}
          <a href="https://mytoc.app" className="footer-promo-link">MyTOC.app</a>
          {' '}© {new Date().getFullYear()} Skyland Publishing for Skyland Reach LLC
        </p>
        <nav className="footer-nav">
          <Link to="/login">Log in</Link>
          <Link to="/signup">Sign up</Link>
          <a href="https://skylandreach.com/privacy-policy" target="_blank" rel="noopener noreferrer">Privacy Policy</a>
        </nav>
      </footer>
    </div>
  )
}
