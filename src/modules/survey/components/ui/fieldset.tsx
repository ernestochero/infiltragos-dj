import * as React from 'react';
import { cn } from '@/lib/utils';

export type FieldsetProps = React.FieldsetHTMLAttributes<HTMLFieldSetElement>;
export type LegendProps = React.HTMLAttributes<HTMLLegendElement>;

export const Fieldset = React.forwardRef<HTMLFieldSetElement, FieldsetProps>(({ className, ...props }, ref) => (
  <fieldset ref={ref} className={cn('space-y-3 rounded-lg border border-white/10 p-4', className)} {...props} />
));
Fieldset.displayName = 'Fieldset';

export const Legend = React.forwardRef<HTMLLegendElement, LegendProps>(({ className, ...props }, ref) => (
  <legend ref={ref} className={cn('px-1 text-xs uppercase tracking-wider text-muted-foreground', className)} {...props} />
));
Legend.displayName = 'Legend';
