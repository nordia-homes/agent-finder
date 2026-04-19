'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BarChart2, CheckSquare, FileText, Import, Inbox, LayoutDashboard, Send, Settings, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import type { NavItem } from '@/lib/types';
import { useSidebar } from '@/components/ui/sidebar';

const navItems: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/inbox', label: 'Inbox', icon: Inbox },
  { href: '/intake', label: 'Intake Queue', icon: Import },
  { href: '/leads', label: 'Leads', icon: Users },
  { href: '/campaigns', label: 'Campaigns', icon: Send },
  { href: '/templates', label: 'Templates', icon: FileText },
  { href: '/tasks', label: 'Tasks', icon: CheckSquare },
  { href: '/analytics', label: 'Analytics', icon: BarChart2 },
];

export function SidebarNav() {
  const pathname = usePathname();
  const { state } = useSidebar();

  const isCollapsed = state === 'collapsed';

  return (
    <nav className="flex flex-col gap-1 px-2">
      {navItems.map((item) => {
        const isActive = pathname.startsWith(item.href);
        return (
          <Tooltip key={item.href}>
            <TooltipTrigger asChild>
              <Link
                href={item.href}
                className={cn(
                  'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-primary text-primary-foreground shadow hover:bg-primary/90'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                   isCollapsed && "justify-center"
                )}
              >
                <item.icon className="h-5 w-5" />
                {!isCollapsed && <span className="truncate">{item.label}</span>}
              </Link>
            </TooltipTrigger>
            {isCollapsed && (
              <TooltipContent side="right" sideOffset={5}>
                {item.label}
              </TooltipContent>
            )}
          </Tooltip>
        );
      })}
    </nav>
  );
}

export function SidebarFooterNav() {
  const pathname = usePathname();
  const { state } = useSidebar();
  const isCollapsed = state === 'collapsed';
  const isActive = pathname.startsWith('/settings');

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Link
          href="/settings"
          className={cn(
            'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
            isActive
              ? 'bg-primary text-primary-foreground shadow hover:bg-primary/90'
              : 'text-muted-foreground hover:bg-muted hover:text-foreground',
            isCollapsed && "justify-center"
          )}
        >
          <Settings className="h-5 w-5" />
          {!isCollapsed && <span>Settings</span>}
        </Link>
      </TooltipTrigger>
      {isCollapsed && (
        <TooltipContent side="right" sideOffset={5}>
          Settings
        </TooltipContent>
      )}
    </Tooltip>
  );
}
