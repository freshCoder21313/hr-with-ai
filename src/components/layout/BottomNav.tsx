import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { Home, Bot, FileText, Award, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

interface NavItem {
  to: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  exact?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { to: '/', label: 'Home', icon: Home, exact: true },
  { to: '/setup', label: 'Practice', icon: Bot },
  { to: '/studio', label: 'CV Studio', icon: FileText },
  { to: '/skill-assessment', label: 'Skills', icon: Award },
  { to: '/history', label: 'History', icon: Clock },
];

/**
 * Mobile Bottom Navigation Bar.
 * Visible on mobile viewports (< md breakpoint), hidden in fullscreen session views
 * (active interview room and resume editor) and print mode.
 */
export const BottomNav: React.FC = () => {
  const location = useLocation();

  // Hide bottom nav in focused workspaces where screen estate is critical
  const isFullScreenRoom =
    location.pathname.startsWith('/interview/') ||
    (location.pathname.includes('/resumes/') && location.pathname.endsWith('/edit'));

  if (isFullScreenRoom) {
    return null;
  }

  return (
    <nav
      aria-label="Mobile Bottom Navigation"
      className="fixed bottom-0 left-0 right-0 z-40 md:hidden border-t border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 pb-[var(--safe-bottom,0px)] print:hidden"
    >
      <div className="flex items-center justify-around h-16 max-w-lg mx-auto px-2">
        {NAV_ITEMS.map(({ to, label, icon: Icon, exact }) => (
          <NavLink
            key={to}
            to={to}
            end={exact}
            className={({ isActive }) =>
              cn(
                'relative flex flex-col items-center justify-center flex-1 py-1.5 px-1 rounded-xl transition-colors duration-150',
                isActive
                  ? 'text-primary font-semibold'
                  : 'text-muted-foreground hover:text-foreground'
              )
            }
          >
            {({ isActive }) => (
              <>
                <div
                  className={cn(
                    'flex items-center justify-center w-8 h-8 rounded-full transition-transform',
                    isActive ? 'bg-primary/10 text-primary scale-105' : 'text-muted-foreground'
                  )}
                >
                  <Icon className="w-5 h-5" />
                </div>
                <span className="text-[11px] leading-tight mt-0.5 tracking-tight truncate max-w-full">
                  {label}
                </span>
                {isActive && (
                  <span
                    className="absolute top-1 right-1/4 w-1.5 h-1.5 rounded-full bg-primary"
                    aria-hidden="true"
                  />
                )}
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
};

export default BottomNav;
