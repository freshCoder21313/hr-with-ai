import React from 'react';
import { HelpCircle } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useTourStore } from '@/services/tour/tourStore';
import { getTourIdForRoute } from '@/services/tour/tourSteps';

interface TourHelpButtonProps {
  className?: string;
}

export const TourHelpButton: React.FC<TourHelpButtonProps> = ({ className }) => {
  const location = useLocation();
  const startTour = useTourStore((s) => s.startTour);

  const handleStartTour = () => {
    const tourId = getTourIdForRoute(location.pathname);
    if (tourId) {
      startTour(tourId, true);
    } else {
      // Default fallback: start general landing tour
      startTour('tour_landing', true);
    }
  };

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleStartTour}
          aria-label="Tour Guide"
          className={className ?? 'flex items-center gap-1.5 text-muted-foreground hover:text-primary'}
        >
          <HelpCircle className="w-4 h-4" />
          <span className="hidden lg:inline">Tour</span>
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        <p>Tour Guide (Hướng dẫn sử dụng)</p>
      </TooltipContent>
    </Tooltip>
  );
};
