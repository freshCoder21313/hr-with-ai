import React, { useRef, useState } from 'react';
import { toPng, toBlob } from 'html-to-image';
import { Share2, Download, Copy, Loader2, Check } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Interview } from '@/types';
import ShareableResultCard from './ShareableResultCard';

interface ShareModalProps {
  interview: Interview;
  trigger?: React.ReactNode;
}

const ShareModal: React.FC<ShareModalProps> = ({ interview, trigger }) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleDownload = async () => {
    if (!cardRef.current) return;
    setIsGenerating(true);
    try {
      const dataUrl = await toPng(cardRef.current, { cacheBust: true, pixelRatio: 2 });
      const link = document.createElement('a');
      link.download = `hr-with-ai-result-${interview.id}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Failed to generate image', err);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = async () => {
    if (!cardRef.current) return;
    setIsGenerating(true);
    try {
      const blob = await toBlob(cardRef.current, { cacheBust: true, pixelRatio: 2 });
      if (blob) {
        await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    } catch (err) {
      console.error('Failed to copy image', err);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm" className="gap-2">
            <Share2 size={16} />
            Share
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Share Your Achievement</DialogTitle>
          <DialogDescription>
            Show off your interview performance! Download the image or copy it to your clipboard.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center gap-6 py-4">
          <div className="relative rounded-xl overflow-hidden shadow-lg border border-border max-w-full overflow-x-auto">
            {/* Render the card - it needs to be visible for html-to-image but we can scale it down for preview if needed.
                 However, since it's 600px wide, it fits in a max-w-3xl modal. */}
            <div className="min-w-[600px]">
              <ShareableResultCard ref={cardRef} interview={interview} />
            </div>
          </div>

          <div className="flex gap-4 w-full justify-center">
            <Button
              onClick={handleDownload}
              disabled={isGenerating}
              className="gap-2 min-w-[140px]"
            >
              {isGenerating ? (
                <Loader2 className="animate-spin" size={16} />
              ) : (
                <Download size={16} />
              )}
              Download PNG
            </Button>
            <Button
              onClick={handleCopy}
              disabled={isGenerating}
              variant="secondary"
              className="gap-2 min-w-[140px]"
            >
              {isGenerating ? (
                <Loader2 className="animate-spin" size={16} />
              ) : copied ? (
                <Check size={16} className="text-emerald-500" />
              ) : (
                <Copy size={16} />
              )}
              {copied ? 'Copied!' : 'Copy to Clipboard'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ShareModal;
