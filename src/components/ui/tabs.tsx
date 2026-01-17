import * as React from "react"
import { cn } from "@/lib/utils"

const Tabs = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { value: string; onValueChange: (value: string) => void }
>(({ className, value, onValueChange, ...props }, ref) => (
  <div
    ref={ref}
    data-value={value}
    className={cn("flex flex-col space-y-2", className)}
    {...props}
  />
))
Tabs.displayName = "Tabs"

const TabsList = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "inline-flex h-10 items-center justify-center rounded-md bg-muted p-1 text-muted-foreground",
      className
    )}
    {...props}
  />
))
TabsList.displayName = "TabsList"

const TabsTrigger = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & { value: string }
>(({ className, value, ...props }, ref) => {
    // Simple mock context consumer logic replacement
    // In a real radix-ui implementation, this would use Context.
    // Here we rely on the parent updating state and us styling based on it?
    // Actually, without context, this simple implementation won't highlight correctly
    // or trigger change unless we pass props down.
    // For simplicity in this non-library environment, I'll rely on a basic implementation 
    // that assumes the parent handles the logic or we just render buttons.
    // But wait, the Tabs component above doesn't really pass down props to children automatically in raw React.
    // I need to use Context to make this work like the shadcn/ui component.
    
    // However, to keep it simple and robust without adding a full Context provider stack right here:
    // I will assume the user clicks the button and we just use the onClick from props if provided (it won't be by default).
    // Let's implement a minimal Context for this to work properly.
    
    return (
        <button
            ref={ref}
            className={cn(
            "inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
            // "data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm", 
            // We can't easily do data-state=active without context.
            // I'll make the buttons just look like buttons for now, or add a simple context.
            className
            )}
            onClick={(e) => {
                 // Traverse up to find the Tabs root and trigger change? No, too complex.
                 // Let's implement a tiny context.
                 const tabsRoot = e.currentTarget.closest('[data-value]');
                 // This is getting hacky.
                 // I will rewrite this file with a proper Context.
            }}
            {...props}
        />
    )
})
TabsTrigger.displayName = "TabsTrigger"

const TabsContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { value: string }
>(({ className, value, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "mt-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
      className
    )}
    {...props}
  />
))
TabsContent.displayName = "TabsContent"

// --- Context Implementation ---
const TabsContext = React.createContext<{
    value: string;
    onValueChange: (value: string) => void;
} | null>(null);

const TabsWithContext = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { value: string; onValueChange: (value: string) => void }
>(({ className, value, onValueChange, children, ...props }, ref) => (
    <TabsContext.Provider value={{ value, onValueChange }}>
        <div
            ref={ref}
            className={cn("flex flex-col space-y-2", className)}
            {...props}
        >
            {children}
        </div>
    </TabsContext.Provider>
))
TabsWithContext.displayName = "Tabs"

const TabsTriggerWithContext = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & { value: string }
>(({ className, value, ...props }, ref) => {
    const context = React.useContext(TabsContext);
    const isActive = context?.value === value;
    
    return (
        <button
            ref={ref}
            type="button"
            className={cn(
            "inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
            isActive ? "bg-background text-foreground shadow-sm" : "hover:bg-background/50",
            className
            )}
            onClick={() => context?.onValueChange(value)}
            {...props}
        />
    )
})
TabsTriggerWithContext.displayName = "TabsTrigger"

const TabsContentWithContext = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { value: string }
>(({ className, value, ...props }, ref) => {
    const context = React.useContext(TabsContext);
    if (context?.value !== value) return null;

    return (
        <div
            ref={ref}
            className={cn(
            "mt-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
            className
            )}
            {...props}
        />
    )
})
TabsContentWithContext.displayName = "TabsContent"

export {
  TabsWithContext as Tabs,
  TabsList,
  TabsTriggerWithContext as TabsTrigger,
  TabsContentWithContext as TabsContent,
}
