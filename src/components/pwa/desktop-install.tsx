'use client';

import { useEffect, useMemo, useState } from 'react';
import { Download, LaptopMinimal, X } from 'lucide-react';
import { usePathname } from 'next/navigation';

import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
};

function isStandaloneDisplay() {
  if (typeof window === 'undefined') return false;

  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    window.matchMedia('(display-mode: window-controls-overlay)').matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

export function DesktopInstall() {
  const pathname = usePathname();
  const { toast } = useToast();
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [installing, setInstalling] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    setIsInstalled(isStandaloneDisplay());

    if ('serviceWorker' in navigator && (window.isSecureContext || window.location.hostname === 'localhost')) {
      navigator.serviceWorker.register('/sw.js').catch((error) => {
        console.error('Service worker registration failed', error);
      });
    }

    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallEvent(event as BeforeInstallPromptEvent);
    };

    const handleInstalled = () => {
      setInstallEvent(null);
      setIsInstalled(true);
      toast({
        title: 'Desktop app installed',
        description: 'Agent Finder Pro can now be opened like a native desktop app.',
      });
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleInstalled);
    };
  }, [toast]);

  const promptDescription = useMemo(() => {
    if (pathname.startsWith('/login')) {
      return 'Install on desktop for faster launch and a cleaner app window.';
    }

    return 'Open Agent Finder Pro in its own desktop window with one click.';
  }, [pathname]);

  async function handleInstall() {
    if (!installEvent) {
      toast({
        title: 'Install not available yet',
        description: 'Use Chrome or Edge on HTTPS, then refresh this page if the install prompt does not appear.',
      });
      return;
    }

    setInstalling(true);
    await installEvent.prompt();
    const choice = await installEvent.userChoice;
    setInstalling(false);

    if (choice.outcome === 'dismissed') {
      toast({
        title: 'Install dismissed',
        description: 'You can install the desktop app later from this banner.',
      });
      return;
    }

    setInstallEvent(null);
  }

  if (isInstalled || dismissed) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 w-[min(360px,calc(100vw-2rem))]">
      <div
        className={cn(
          'rounded-[28px] border border-[#d6e0ee] bg-[linear-gradient(180deg,_rgba(255,255,255,0.96),_rgba(241,246,255,0.98))] p-4 shadow-[0_22px_60px_rgba(32,49,83,0.18)] backdrop-blur-md'
        )}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="rounded-2xl bg-[#e9f0fb] p-3 text-[#5c7198]">
              <LaptopMinimal className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900">Install desktop app</p>
              <p className="mt-1 text-sm leading-6 text-slate-500">{promptDescription}</p>
            </div>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-full text-slate-500"
            onClick={() => setDismissed(true)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <Button className="rounded-full" onClick={() => void handleInstall()} disabled={installing}>
            <Download className="mr-2 h-4 w-4" />
            {installing ? 'Opening prompt...' : 'Install now'}
          </Button>
          <Button variant="outline" className="rounded-full" onClick={() => setDismissed(true)}>
            Later
          </Button>
        </div>
      </div>
    </div>
  );
}
