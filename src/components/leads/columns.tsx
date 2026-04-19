'use client';

import { ColumnDef } from '@tanstack/react-table';
import { Lead } from '@/lib/types';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { ArrowUpDown, MoreHorizontal } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import {
  LEAD_STATUS_BADGE_STYLES,
  getLeadStatusLabel,
  normalizeLeadStatus,
} from '@/lib/lead-status';

const classificationStyles: Record<Lead['classification'], string> = {
  likely_independent: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  possible_independent: 'border-amber-200 bg-amber-50 text-amber-700',
  agency: 'border-rose-200 bg-rose-50 text-rose-700',
};

export const columns: ColumnDef<Lead>[] = [
  {
    id: 'select',
    header: ({ table }) => (
      <Checkbox
        checked={table.getIsAllPageRowsSelected()}
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label="Select all"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label="Select row"
      />
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: 'full_name',
    header: ({ column }) => (
       <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        className="-ml-4"
      >
        Name
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => {
      const lead = row.original;
      const name = lead.full_name || lead.company_name;
      return (
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10 border border-[#dbe2ee] bg-[#eef3fb]">
            <AvatarFallback className="bg-[#eef3fb] text-[#5f7399]">{name?.charAt(0)}</AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <Link href={`/leads/${lead.id}`} className="truncate text-sm font-semibold text-[#152033] transition-colors hover:text-[#415782]">
              {name}
            </Link>
            <div className="truncate text-xs text-[#7d8aa3]">{lead.email || lead.company_name || '-'}</div>
          </div>
        </div>
      );
    },
  },
   {
    accessorKey: 'independent_score',
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        className="-ml-4"
      >
        Score
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => {
        const score = row.original.independent_score;
        const color = score > 75 ? 'text-emerald-700 bg-emerald-50 border-emerald-200' : score > 50 ? 'text-amber-700 bg-amber-50 border-amber-200' : 'text-rose-700 bg-rose-50 border-rose-200';
        return <div className={cn("inline-flex min-w-12 items-center justify-center rounded-full border px-3 py-1 text-sm font-semibold", color)}>{score}</div>
    }
  },
  {
    accessorKey: 'classification',
    header: 'Classification',
    cell: ({ row }) => (
      <Badge variant="outline" className={cn(classificationStyles[row.original.classification], 'font-medium')}>
        {row.original.classification.replace('_', ' ')}
      </Badge>
    ),
  },
  {
    accessorKey: 'lead_status',
    header: 'Status',
    cell: ({ row }) => {
      const normalizedStatus = normalizeLeadStatus(row.original.lead_status);
      return (
        <Badge variant="secondary" className={cn(LEAD_STATUS_BADGE_STYLES[normalizedStatus], 'font-medium')}>
          {getLeadStatusLabel(normalizedStatus)}
        </Badge>
      );
    },
  },
  {
    accessorKey: 'city',
    header: 'Location',
     cell: ({ row }) => (
      <div className="text-sm text-[#4d5d7b]">
        {row.original.city}, {row.original.county}
      </div>
     ),
  },
  {
    accessorKey: 'active_listings_count',
    header: 'Listings',
    cell: ({ row }) => (
      <div className="text-sm font-medium text-[#152033]">{row.original.active_listings_count ?? 0}</div>
    ),
  },
  {
    accessorKey: 'created_at',
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        Created
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
     cell: ({ row }) => <div className="text-sm text-[#4d5d7b]">{format(row.original.created_at.toDate(), 'MMM d, yyyy')}</div>,
  },
  {
    id: 'actions',
    cell: ({ row }) => {
      const lead = row.original;
      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-9 w-9 rounded-full p-0 text-[#61739a] hover:bg-[#eef3fb] hover:text-[#415782]">
              <span className="sr-only">Open menu</span>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Actions</DropdownMenuLabel>
            <DropdownMenuItem asChild>
              <Link href={`/leads/${lead.id}`}>View Details</Link>
            </DropdownMenuItem>
            <DropdownMenuItem>Start Outreach</DropdownMenuItem>
            <DropdownMenuItem>Create Task</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive">Delete Lead</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
  },
];
