import clsx from 'clsx'

interface ModalProps {
  title: string
  open: boolean
  onClose: () => void
  children: React.ReactNode
  className?: string
}

export default function Modal({ title, open, onClose, children, className }: ModalProps) {
  if (!open) return null

  return (
    <div className="modal-overlay" role="presentation" onClick={onClose}>
      <div
        className={clsx('modal-card', className)}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="modal-header">
          <h2>{title}</h2>
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Close
          </button>
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  )
}
