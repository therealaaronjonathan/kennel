import { Button, type ButtonProps } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export interface AppButtonProps extends Omit<ButtonProps, 'variant'> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
}

export function AppButton({ variant = 'primary', className, ...props }: AppButtonProps) {
  return (
    <Button
      variant={variant}
      className={cn(className)}
      {...props}
    />
  )
}
