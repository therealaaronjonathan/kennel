import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap font-sans font-semibold transition-[opacity,transform] duration-150 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-40 cursor-pointer rounded-[4px]',
  {
    variants: {
      variant: {
        primary:   'bg-primary text-white hover:opacity-85',
        secondary: 'border border-primary text-primary bg-transparent hover:opacity-85',
        ghost:     'border border-border-base text-muted bg-transparent hover:opacity-75',
        danger:    'bg-danger text-white hover:opacity-85',
      },
      size: {
        default: 'h-9 px-4 py-2 text-[13px]',
        sm:      'h-7 px-3 py-1.5 text-[12px]',
        icon:    'h-9 w-9',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'default',
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button'
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = 'Button'

export { Button, buttonVariants }
