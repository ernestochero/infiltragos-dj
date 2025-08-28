import * as React from 'react';
import { cn } from '@/lib/utils';

export type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement>;

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(({ className, ...props }, ref) => (
  <textarea
    ref={ref}
    className={cn(
      'w-full rounded-md border border-white/10 bg-black/20 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground shadow-inner focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/60 disabled:opacity-50 aria-[invalid="true"]:border-red-400 aria-[invalid="true"]:ring-red-400',
      className,
    )}
    {...props}
  />
));
Textarea.displayName = 'Textarea';

export default Textarea;
