import InstallAppButton from './InstallAppButton'
import { usePwaInstall } from '../hooks/usePwaInstall'

export default function InstallGuide() {
  const { installed, canPrompt, platform } = usePwaInstall()

  return (
    <div className="install-guide">
      <div className="install-guide-header">
        <div>
          <h2>Install MyTOC on your phone or computer</h2>
          <p className="muted-text">
            Put MyTOC on your home screen like a normal app. Faster to open, and required for reliable
            push notifications when a directive is assigned.
          </p>
        </div>
        <InstallAppButton />
      </div>

      {installed ? (
        <p className="install-guide-status install-guide-status-done">
          MyTOC is installed on this device. Open it from your home screen or app list.
        </p>
      ) : canPrompt ? (
        <p className="install-guide-status">
          Your browser is ready — tap <strong>Install app</strong> above. If you prefer, follow the
          steps for your device below.
        </p>
      ) : (
        <p className="install-guide-status">
          If you do not see an Install button, use the steps for your device below. Takes about 15 seconds.
        </p>
      )}

      <div className="install-guide-grid">
        <article className={`install-guide-card ${platform === 'ios' ? 'install-guide-card-focus' : ''}`}>
          <h3>iPhone / iPad (Safari)</h3>
          <ol>
            <li>Open <strong>mytoc.app</strong> in <strong>Safari</strong> (not Chrome or email preview).</li>
            <li>Tap the <strong>Share</strong> button at the bottom (square with an arrow up).</li>
            <li>Scroll and tap <strong>Add to Home Screen</strong>.</li>
            <li>Tap <strong>Add</strong>. The MyTOC icon appears on your home screen.</li>
          </ol>
        </article>

        <article className={`install-guide-card ${platform === 'android' ? 'install-guide-card-focus' : ''}`}>
          <h3>Android (Chrome)</h3>
          <ol>
            <li>Open <strong>mytoc.app</strong> in <strong>Chrome</strong>.</li>
            <li>Tap the <strong>⋮</strong> menu (top right).</li>
            <li>Tap <strong>Install app</strong> or <strong>Add to Home screen</strong>.</li>
            <li>Confirm. Open MyTOC from your home screen going forward.</li>
          </ol>
        </article>

        <article className={`install-guide-card ${platform === 'desktop' ? 'install-guide-card-focus' : ''}`}>
          <h3>Computer (Chrome or Edge)</h3>
          <ol>
            <li>Open <strong>mytoc.app</strong> in Chrome or Edge.</li>
            <li>Look for the <strong>install icon</strong> in the address bar (computer with a down arrow), or use the <strong>Install app</strong> button above when it appears.</li>
            <li>Click <strong>Install</strong>. MyTOC opens in its own window — pin it to your taskbar if you like.</li>
          </ol>
        </article>
      </div>

      <p className="muted-text small-text install-guide-note">
        After installing, open <strong>Profile</strong> and turn on <strong>Notifications</strong> so
        assignments ping you. Do this once per device you use.
      </p>
    </div>
  )
}
