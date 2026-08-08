interface ConfigErrorPageProps {
  issues: string[]
}

export default function ConfigErrorPage({ issues }: ConfigErrorPageProps) {
  return (
    <main className="config-error-page">
      <h1>TOC configuration error</h1>
      <p>
        This deployment was built with invalid Supabase environment variables.
        Fix them in Vercel, then trigger a new deployment.
      </p>
      <ul>
        {issues.map((issue) => (
          <li key={issue}>{issue}</li>
        ))}
      </ul>
      <p className="muted-text">
        Vercel → Project → Settings → Environment Variables → Production → save → Deployments → Redeploy.
      </p>
    </main>
  )
}
