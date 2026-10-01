import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-all active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 cursor-pointer',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground hover:bg-primary/90',
        destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
        outline: 'border border-input bg-background hover:bg-accent hover:text-accent-foreground',
        secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
        ghost: 'hover:bg-accent hover:text-accent-foreground',
        link: 'text-primary underline-offset-4 hover:underline active:scale-100',
        blue: 'bg-primary text-primary-foreground hover:bg-primary/90 focus:ring-primary',
      },
      // Heights are responsive (touch-first on mobile). Don't shrink a sized
      // Button with `className="h-6"`: tailwind-merge only replaces the class
      // of the same breakpoint, so `md:h-10` survives and it renders 40px on
      // desktop. Use a compact size instead; if you must override, set both
      // breakpoints for height and width.
      size: {
        default: 'h-11 md:h-10 px-4 py-2',
        sm: 'h-11 md:h-9 rounded-md px-3',
        lg: 'h-12 md:h-11 rounded-md px-8',
        icon: 'h-11 w-11 md:h-10 md:w-10',
        /** Compact text button for dense panels: 40px touch, 32px desktop. */
        xs: 'h-10 md:h-8 rounded-md px-2.5 text-xs',
        /** Compact icon button: 40px touch, 32px desktop. */
        'icon-sm': 'h-10 w-10 md:h-8 md:w-8',
        /** Dense toolbars only: 32px touch, 24px desktop (WCAG 2.2 AA floor). */
        'icon-xs': 'h-8 w-8 md:h-6 md:w-6',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return (
      <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
    );
  }
);
Button.displayName = 'Button';

export { Button };
