import { Header } from '@/components/layout/header';
import { Sidebar, SidebarProvider } from "@/components/ui/sidebar";
import { SidebarNav, SidebarFooterNav } from '@/components/layout/sidebar-nav';
import { Building } from 'lucide-react';
import { cookies } from 'next/headers';
import { AppProviders } from './providers';

export default function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const sidebarCookie = cookies();
  const sidebarState = typeof (sidebarCookie as any).get === 'function'
    ? (sidebarCookie as any).get('sidebar_state')
    : undefined;
  const defaultOpen = sidebarState?.value !== 'false';

  return (
    <AppProviders>
      <SidebarProvider defaultOpen={defaultOpen}>
        <div className="flex min-h-screen w-full">
          <Sidebar collapsible="icon" className="hidden md:flex flex-col border-r bg-card">
            <div className="flex h-16 items-center justify-between px-4 border-b">
               <div className="flex items-center gap-2 font-bold font-headline text-primary">
                <Building className="h-6 w-6" />
                <span className="group-data-[collapsible=icon]:hidden">Agent Finder Pro</span>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto py-4">
              <SidebarNav />
            </div>
            <div className="mt-auto p-4 border-t">
              <SidebarFooterNav />
            </div>
          </Sidebar>
          <div className="flex flex-col flex-1">
            <Header />
            <main className="flex-1 p-4 md:p-6 lg:p-8 bg-background">
              {children}
            </main>
          </div>
        </div>
      </SidebarProvider>
    </AppProviders>
  );
}
