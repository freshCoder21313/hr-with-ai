import React, { useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { Cloud, Menu, Key } from 'lucide-react';
import { openApiKeyModal } from '@/events/apiKeyEvents';
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
  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `text-sm font-medium transition-colors hover:text-primary ${
      isActive ? 'text-primary font-semibold' : 'text-muted-foreground'
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

const Header: React.FC = () => {
  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleOpenSettings = () => {
    openApiKeyModal();
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
                  aria-label="API Key Settings"
                  className="hidden sm:flex gap-2 text-muted-foreground hover:text-primary"
                >
                  <Key className="w-4 h-4" />
                  <span className="hidden lg:inline">API Key</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>API Key Settings</p>
              </TooltipContent>
            </Tooltip>

            <ThemeToggle />

            {/* Mobile Menu Trigger */}
            <div className="md:hidden">
              <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon">
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
                        <Key className="w-4 h-4" /> API Key Settings
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
