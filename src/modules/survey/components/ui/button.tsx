import * as React from 'react';
import { cn } from '@/lib/utils';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'muted';
}

const variants: Record<NonNullable<ButtonProps['variant']>, string> = {
  primary: 'bg-primary text-primary-foreground hover:bg-primary/90',
  muted: 'bg-white/10 text-foreground hover:bg-white/15',
};

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(({ className, variant = 'primary', ...props }, ref) => (
  <button
    ref={ref}
    className={cn(
      'inline-flex items-center justify-center rounded-md px-3 py-2 text-sm font-medium transition-colors',
      variants[variant],
      className,
    )}
    {...props}
  />
));
Button.displayName = 'Button';

export default Button;
