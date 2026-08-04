import { usePwaInstall } from '../hooks/usePwaInstall'

interface InstallAppButtonProps {
  className?: string
  size?: 'sm' | 'md'
}

export default function InstallAppButton({ className = '', size = 'md' }: InstallAppButtonProps) {
  const { installed, canPrompt, busy, install } = usePwaInstall()

  if (installed || !canPrompt) return null

  const sizeClass = size === 'sm' ? 'btn-sm' : ''

  return (
    <button
      type="button"
      className={`btn btn-gold ${sizeClass} ${className}`.trim()}
      disabled={busy}
      onClick={() => void install()}
    >
      {busy ? 'Installing…' : 'Install app'}
    </button>
  )
}
