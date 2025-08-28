import * as React from 'react';
import { cn } from '@/lib/utils';

export type CardProps = React.HTMLAttributes<HTMLDivElement>;

const Card = ({ className, ...props }: CardProps) => (
  <div
    className={cn(
      'rounded-xl border border-white/10 bg-gradient-to-b from-white/5 to-white/[0.03] p-4 md:p-6 lg:p-8 shadow-lg',
      className,
    )}
    {...props}
  />
);

export default Card;
