import React from 'react';
import { Button, ButtonProps } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LoadingButtonProps extends ButtonProps {
  isLoading?: boolean;
  loadingText?: string;
  leftIcon?: React.ReactNode;
  children: React.ReactNode;
}

export const LoadingButton = React.forwardRef<HTMLButtonElement, LoadingButtonProps>(
  ({ isLoading = false, loadingText, leftIcon, children, className, disabled, ...props }, ref) => {
    return (
      <Button ref={ref} disabled={disabled || isLoading} className={cn(className)} {...props}>
        {isLoading ? (
          <>
            <Loader2 className={cn('h-4 w-4 animate-spin', loadingText && 'mr-2')} />
            {loadingText}
          </>
        ) : (
          <>
            {leftIcon && <span className="mr-2">{leftIcon}</span>}
            {children}
          </>
        )}
      </Button>
    );
  }
);

LoadingButton.displayName = 'LoadingButton';
