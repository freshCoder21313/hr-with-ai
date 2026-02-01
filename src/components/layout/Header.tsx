import React, { useState } from 'react';
import { Cloud, Menu, Key } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetTitle,
  SheetDescription,
  SheetHeader,
} from '@/components/ui/sheet';
import { ThemeToggle } from '@/components/theme-toggle';
import { CloudSyncModal } from '@/components/CloudSyncModal';

const Header: React.FC = () => {
  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleResetKey = () => {
    if (window.confirm('Remove API Key and reload?')) {
      localStorage.removeItem('gemini_api_key');
      window.location.reload();
    }
  };

  const NavLinks = ({ mobile = false }: { mobile?: boolean }) => (
    <>
      <a
        href="#/"
        className={`text-sm font-medium transition-colors hover:text-primary ${
          mobile ? 'text-lg py-2 border-b border-border' : 'text-muted-foreground'
        }`}
        onClick={() => mobile && setIsMobileMenuOpen(false)}
      >
        Home
      </a>
      <a
        href="#/cv-chat"
        className={`text-sm font-medium transition-colors hover:text-primary ${
          mobile ? 'text-lg py-2 border-b border-border' : 'text-muted-foreground'
        }`}
        onClick={() => mobile && setIsMobileMenuOpen(false)}
      >
        CV Chat
      </a>
      <a
        href="#/history"
        className={`text-sm font-medium transition-colors hover:text-primary ${
          mobile ? 'text-lg py-2 border-b border-border' : 'text-muted-foreground'
        }`}
        onClick={() => mobile && setIsMobileMenuOpen(false)}
      >
        History
      </a>
    </>
  );

  return (
    <>
      <CloudSyncModal isOpen={isSyncModalOpen} onClose={() => setIsSyncModalOpen(false)} />

      <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-2 font-bold text-xl">
            <a href="#" className="flex items-center gap-2">
              <span className="bg-primary text-primary-foreground p-1 rounded-lg">HR</span>
              <span className="hidden sm:inline-block">With-AI</span>
            </a>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-6">
            <NavLinks />
          </nav>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsSyncModalOpen(true)}
              className="hidden sm:flex gap-2"
              title="Cloud Sync"
            >
              <Cloud className="w-4 h-4" />
              <span className="hidden lg:inline">Sync</span>
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={handleResetKey}
              className="hidden sm:flex gap-2 text-muted-foreground hover:text-destructive"
              title="Reset API Key"
            >
              <Key className="w-4 h-4" />
            </Button>

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
                    <NavLinks mobile />
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
                        onClick={handleResetKey}
                        className="justify-start gap-2 text-destructive hover:text-destructive hover:bg-destructive/10"
                      >
                        <Key className="w-4 h-4" /> Reset API Key
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
