import { Button, type ButtonProps } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export interface AppButtonProps extends Omit<ButtonProps, 'variant'> {
  variant?: 'primary' | 'secondary' | 'ghost'
}

const variantMap: Record<NonNullable<AppButtonProps['variant']>, ButtonProps['variant']> = {
  primary: 'default',
  secondary: 'outline',
  ghost: 'ghost',
}

export function AppButton({ variant = 'primary', className, ...props }: AppButtonProps) {
  return (
    <Button
      variant={variantMap[variant]}
      className={cn('rounded-[4px] font-sans', className)}
      {...props}
    />
  )
}
