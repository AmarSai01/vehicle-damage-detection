import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { Link } from 'react-router-dom'

type Variant = 'primary' | 'secondary' | 'ghost'

interface BaseProps {
  variant?: Variant
  children: ReactNode
  className?: string
}

type ButtonAsButton = BaseProps &
  Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'className' | 'children'> & {
    to?: undefined
  }

type ButtonAsLink = BaseProps & {
  to: string
}

export function Button(props: ButtonAsButton | ButtonAsLink) {
  const variant = props.variant ?? 'primary'
  const classes = ['btn', `btn-${variant}`, props.className ?? ''].filter(Boolean).join(' ')

  if ('to' in props && props.to) {
    return (
      <Link to={props.to} className={classes}>
        {props.children}
      </Link>
    )
  }

  const buttonProps = props as ButtonAsButton
  return (
    <button
      type={buttonProps.type ?? 'button'}
      className={classes}
      disabled={buttonProps.disabled}
      onClick={buttonProps.onClick}
      aria-label={buttonProps['aria-label']}
    >
      {buttonProps.children}
    </button>
  )
}
