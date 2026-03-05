import * as React from 'react'
import { cn } from '@/lib/utils'

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          'flex w-full rounded-[4px] border px-3 py-[9px] text-[13px] font-sans',
          'bg-white text-foreground placeholder:text-muted',
          'border-[rgba(26,24,37,0.08)] focus:border-primary focus:outline-none focus-visible:outline-none',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          'transition-colors duration-150',
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = 'Input'

export { Input }
