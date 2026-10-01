import * as React from 'react';
import { cn } from '@/lib/utils';

const TabsContext = React.createContext<{
  value: string;
  onValueChange: (value: string) => void;
  orientation: 'horizontal' | 'vertical';
  /**
   * Values of the TabsContent children that have mounted. Tabs are used two ways in
   * this app: as real tab sets (with TabsContent) and as segmented switchers that
   * swap sibling content rendered outside the Tabs root. Only the former may claim
   * role="tablist"/"tab", so the list opts into the APG pattern once a panel exists.
   */
  panels: Set<string>;
  registerPanel: (value: string, mounted: boolean) => void;
} | null>(null);

const Tabs = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    value: string;
    onValueChange: (value: string) => void;
    orientation?: 'horizontal' | 'vertical';
  }
>(
  (
    { className, value, onValueChange, orientation = 'horizontal', ...props },
    ref
  ): React.ReactElement => {
    const [panels, setPanels] = React.useState<Set<string>>(() => new Set());
    const registerPanel = React.useCallback((panelValue: string, mounted: boolean) => {
      setPanels((prev) => {
        const next = new Set(prev);
        if (mounted) next.add(panelValue);
        else next.delete(panelValue);
        return next;
      });
    }, []);
    const context = React.useMemo(
      () => ({ value, onValueChange, orientation, panels, registerPanel }),
      [value, onValueChange, orientation, panels, registerPanel]
    );

    return (
      <TabsContext.Provider value={context}>
        <div
          ref={ref}
          className={cn(
            'flex',
            orientation === 'vertical' ? 'flex-row gap-4' : 'flex-col space-y-2',
            className
          )}
          {...props}
        />
      </TabsContext.Provider>
    );
  }
);
Tabs.displayName = 'Tabs';

const TabsList = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, onKeyDown, ...props }, ref): React.ReactElement => {
    const context = React.useContext(TabsContext);
    const hasPanels = (context?.panels.size ?? 0) > 0;

    const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
      onKeyDown?.(event);
      if (!hasPanels || event.defaultPrevented) return;
      const isHorizontal = context?.orientation !== 'vertical';
      const nextKey = isHorizontal ? 'ArrowRight' : 'ArrowDown';
      const prevKey = isHorizontal ? 'ArrowLeft' : 'ArrowUp';
      const { key } = event;
      if (key !== nextKey && key !== prevKey && key !== 'Home' && key !== 'End') return;

      const triggers = Array.from(
        event.currentTarget.querySelectorAll<HTMLButtonElement>('[role="tab"]:not([disabled])')
      );
      if (triggers.length === 0) return;
      event.preventDefault();

      const current = triggers.indexOf(document.activeElement as HTMLButtonElement);
      let next: number;
      if (key === 'Home') next = 0;
      else if (key === 'End') next = triggers.length - 1;
      else if (current === -1) next = 0;
      else next = (current + (key === nextKey ? 1 : -1) + triggers.length) % triggers.length;
      triggers[next].focus();
    };

    return (
      <div
        ref={ref}
        role={hasPanels ? 'tablist' : undefined}
        aria-orientation={hasPanels ? context?.orientation : undefined}
        onKeyDown={handleKeyDown}
        className={cn(
          'inline-flex h-10 items-center justify-center rounded-md bg-muted p-1 text-muted-foreground',
          className
        )}
        {...props}
      />
    );
  }
);
TabsList.displayName = 'TabsList';

const TabsTrigger = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & { value: string }
>(({ className, value, onClick, ...props }, ref): React.ReactElement => {
  const context = React.useContext(TabsContext);
  const isActive = context?.value === value;
  const hasPanels = (context?.panels.size ?? 0) > 0;

  return (
    <button
      ref={ref}
      type="button"
      role={hasPanels ? 'tab' : undefined}
      aria-selected={hasPanels ? isActive : undefined}
      tabIndex={hasPanels ? (isActive ? 0 : -1) : undefined}
      className={cn(
        'inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
        isActive
          ? 'bg-background text-foreground shadow-sm data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm'
          : 'hover:bg-background/50 hover:text-foreground',
        className
      )}
      onClick={(event) => {
        onClick?.(event);
        context?.onValueChange(value);
      }}
      data-state={isActive ? 'active' : 'inactive'}
      {...props}
    />
  );
});
TabsTrigger.displayName = 'TabsTrigger';

const TabsContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { value: string }
>(({ className, value, ...props }, ref): React.ReactElement | null => {
  const context = React.useContext(TabsContext);
  const { registerPanel } = context ?? {};

  React.useEffect(() => {
    registerPanel?.(value, true);
    return () => registerPanel?.(value, false);
  }, [registerPanel, value]);

  if (context?.value !== value) return null;

  return (
    <div
      ref={ref}
      role="tabpanel"
      tabIndex={0}
      className={cn(
        'mt-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
        className
      )}
      {...props}
    />
  );
});
TabsContent.displayName = 'TabsContent';

export { Tabs, TabsList, TabsTrigger, TabsContent };
