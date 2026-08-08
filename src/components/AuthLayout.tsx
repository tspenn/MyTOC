import { Link } from 'react-router-dom'

interface AuthLayoutProps {
  title: string
  subtitle: string
  children: React.ReactNode
  footerText: string
  footerLinkText: string
  footerLinkTo: string
}

export default function AuthLayout({
  title,
  subtitle,
  children,
  footerText,
  footerLinkText,
  footerLinkTo,
}: AuthLayoutProps) {
  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-card-header">
          <Link to="/" className="auth-brand" title="Tactical Operations Center">
            <img src="/Logo.jpg" alt="MyTOC" className="auth-brand-logo" />
          </Link>
          <h1>{title}</h1>
          <p>{subtitle}</p>
        </div>
        {children}
        <p className="auth-footer">
          {footerText}{' '}
          <Link to={footerLinkTo}>{footerLinkText}</Link>
        </p>
      </div>
    </div>
  )
}
