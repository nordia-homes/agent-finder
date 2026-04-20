import type { Metadata, Viewport } from 'next';
import './globals.css';
import { Toaster } from "@/components/ui/toaster";
import { cn } from '@/lib/utils';
import { FirebaseClientProvider } from '@/firebase';
import { DesktopInstall } from '@/components/pwa/desktop-install';

export const metadata: Metadata = {
  title: 'Agent Finder Pro',
  description: 'Internal CRM for a real estate SaaS company.',
  manifest: '/manifest.webmanifest',
  applicationName: 'Agent Finder Pro',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Agent Finder Pro',
  },
  icons: {
    apple: '/icons/icon-192.png',
    icon: [
      { url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
  },
};

export const viewport: Viewport = {
  themeColor: '#445b84',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Space+Grotesk:wght@500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body className={cn(
          "font-body antialiased",
        )}>
        <FirebaseClientProvider>
          {children}
          <DesktopInstall />
        </FirebaseClientProvider>
        <Toaster />
      </body>
    </html>
  );
}
