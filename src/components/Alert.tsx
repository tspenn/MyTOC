import clsx from 'clsx'

interface AlertProps {
  variant: 'error' | 'success' | 'info'
  message: string
}

export default function Alert({ variant, message }: AlertProps) {
  return <div className={clsx('alert', `alert-${variant}`)} role="alert">{message}</div>
}
