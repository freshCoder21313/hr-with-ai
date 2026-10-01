import React, { useRef, useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { Cloud, Menu, Settings2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetTitle,
  SheetDescription,
  SheetHeader,
} from '@/components/ui/sheet';
import { ThemeToggle } from '@/components/shared/theme-toggle';
import { CloudSyncModal } from '@/components/shared/CloudSyncModal';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

const NavLinks = ({ mobile = false, closeMenu }: { mobile?: boolean; closeMenu?: () => void }) => {
  // Local nav palette (not global tokens): `slate-500`/`blue-600` sit at ~4.4:1 on
  // the white header and fail WCAG AA for body text. slate-600 (7.6:1) and
  // blue-700 (6.7:1) clear 4.5:1 while staying visually distinct.
  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `text-sm font-medium transition-colors hover:text-blue-700 dark:hover:text-blue-400 ${
      isActive
        ? 'text-blue-700 dark:text-blue-400 font-semibold'
        : 'text-slate-600 dark:text-slate-400'
    } ${mobile ? 'text-lg py-2 border-b border-border' : ''}`;

  return (
    <>
      <NavLink to="/" className={linkClass} onClick={() => mobile && closeMenu?.()}>
        Home
      </NavLink>
      <NavLink to="/setup" className={linkClass} onClick={() => mobile && closeMenu?.()}>
        Mock Interview
      </NavLink>
      <NavLink to="/studio" className={linkClass} onClick={() => mobile && closeMenu?.()}>
        CV Studio
      </NavLink>
      <NavLink to="/skill-assessment" className={linkClass} onClick={() => mobile && closeMenu?.()}>
        Skill Assessment
      </NavLink>
      <NavLink to="/history" className={linkClass} onClick={() => mobile && closeMenu?.()}>
        History
      </NavLink>
    </>
  );
};

interface HeaderProps {
  /**
   * Opens the app-wide Settings modal (interview preferences + AI provider profiles).
   * Receives the element that launched it so the modal can restore focus on close
   * (a controlled Dialog has no trigger of its own to return focus to).
   */
  onOpenSettings: (trigger: HTMLElement) => void;
}

const Header: React.FC<HeaderProps> = ({ onOpenSettings }) => {
  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const menuTriggerRef = useRef<HTMLButtonElement | null>(null);

  const handleOpenSettings = (e: React.MouseEvent<HTMLButtonElement>) => {
    const invokedFromSheet = isMobileMenuOpen;
    setIsMobileMenuOpen(false);
    // The sheet's own button unmounts with the sheet, so hand back the hamburger
    // that stays on screen; otherwise return focus to the desktop button.
    onOpenSettings(
      invokedFromSheet && menuTriggerRef.current ? menuTriggerRef.current : e.currentTarget
    );
  };

  return (
    <>
      <CloudSyncModal isOpen={isSyncModalOpen} onClose={() => setIsSyncModalOpen(false)} />

      <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 print:hidden">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-2 font-bold text-xl">
            <Link to="/" aria-label="HR With AI home" className="flex items-center gap-2">
              <span className="bg-primary text-primary-foreground p-1 rounded-lg">HR</span>
              <span className="hidden sm:inline-block">With-AI</span>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-6">
            <NavLinks />
          </nav>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsSyncModalOpen(true)}
                  aria-label="Cloud Sync"
                  className="hidden sm:flex gap-2"
                >
                  <Cloud className="w-4 h-4" />
                  <span className="hidden lg:inline">Sync</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Cloud Sync</p>
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleOpenSettings}
                  aria-label="Settings"
                  className="hidden sm:flex gap-2 text-muted-foreground hover:text-primary"
                >
                  <Settings2 className="w-4 h-4" />
                  <span className="hidden lg:inline">Settings</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Settings</p>
              </TooltipContent>
            </Tooltip>

            <ThemeToggle />

            {/* Mobile Menu Trigger */}
            <div className="md:hidden">
              <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
                <SheetTrigger asChild>
                  <Button ref={menuTriggerRef} variant="ghost" size="icon">
                    <Menu className="w-5 h-5" />
                    <span className="sr-only">Toggle menu</span>
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="w-[300px] sm:w-[400px]">
                  <SheetHeader>
                    <SheetTitle>Menu</SheetTitle>
                    <SheetDescription>Navigate through the application</SheetDescription>
                  </SheetHeader>
                  <div className="flex flex-col gap-4 mt-8">
                    <NavLinks mobile closeMenu={() => setIsMobileMenuOpen(false)} />
                    <div className="flex flex-col gap-2 mt-4 pt-4 border-t border-border">
                      <Button
                        variant="outline"
                        onClick={() => {
                          setIsSyncModalOpen(true);
                          setIsMobileMenuOpen(false);
                        }}
                        className="justify-start gap-2"
                      >
                        <Cloud className="w-4 h-4" /> Cloud Sync
                      </Button>
                      <Button
                        variant="ghost"
                        onClick={handleOpenSettings}
                        className="justify-start gap-2 text-muted-foreground hover:text-primary"
                      >
                        <Settings2 className="w-4 h-4" /> Settings
                      </Button>
                    </div>
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          </div>
        </div>
      </header>
    </>
  );
};

export default Header;
