import * as React from 'react';
import { cn } from '@/lib/utils';

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

const Input = React.forwardRef<HTMLInputElement, InputProps>(({ className, type = 'text', ...props }, ref) => {
  const base =
    type === 'checkbox'
      ? 'h-4 w-4 rounded border-white/20'
      : 'w-full rounded-md border border-white/10 bg-black/20 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground shadow-inner focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/60 disabled:opacity-50';
  return (
    <input
      ref={ref}
      type={type}
      className={cn(base, "aria-[invalid='true']:border-red-400 aria-[invalid='true']:ring-red-400", className)}
      {...props}
    />
  );
});
Input.displayName = 'Input';

export default Input;
