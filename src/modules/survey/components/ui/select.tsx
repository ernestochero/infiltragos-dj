import * as React from 'react';
import { cn } from '@/lib/utils';

export type SelectProps = React.SelectHTMLAttributes<HTMLSelectElement>;

const Select = React.forwardRef<HTMLSelectElement, SelectProps>(({ className, ...props }, ref) => (
  <select
    ref={ref}
    className={cn(
      'w-full rounded-md border border-white/10 bg-black/20 px-3 py-2 text-sm text-foreground shadow-inner focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/60 disabled:opacity-50 aria-[invalid="true"]:border-red-400 aria-[invalid="true"]:ring-red-400',
      className,
    )}
    {...props}
  />
));
Select.displayName = 'Select';

export default Select;
