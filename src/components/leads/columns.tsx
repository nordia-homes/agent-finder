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

const classificationStyles: Record<Lead['classification'], string> = {
  likely_independent: 'bg-green-100 text-green-800 border-green-200 hover:bg-green-200',
  possible_independent: 'bg-amber-100 text-amber-800 border-amber-200 hover:bg-amber-200',
  agency: 'bg-red-100 text-red-800 border-red-200 hover:bg-red-200',
};

const leadStatusStyles: Record<Lead['lead_status'], string> = {
  new: 'bg-blue-100 text-blue-800',
  reviewed: 'bg-gray-100 text-gray-800',
  qualified: 'bg-sky-100 text-sky-800',
  contacted: 'bg-purple-100 text-purple-800',
  replied: 'bg-indigo-100 text-indigo-800',
  demo_booked: 'bg-teal-100 text-teal-800',
  closed_won: 'bg-green-100 text-green-800',
  closed_lost: 'bg-red-100 text-red-800',
  not_relevant: 'bg-stone-100 text-stone-800',
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
          <Avatar className="h-8 w-8">
            <AvatarFallback>{name?.charAt(0)}</AvatarFallback>
          </Avatar>
          <div>
            <Link href={`/leads/${lead.id}`} className="font-medium hover:underline">
              {name}
            </Link>
            <div className="text-xs text-muted-foreground">{lead.email}</div>
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
        const color = score > 75 ? 'text-green-600' : score > 50 ? 'text-amber-600' : 'text-red-600';
        return <div className={cn("font-medium", color)}>{score}</div>
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
    cell: ({ row }) => (
      <Badge variant="secondary" className={cn(leadStatusStyles[row.original.lead_status], 'capitalize font-medium')}>
        {row.original.lead_status.replace('_', ' ')}
      </Badge>
    ),
  },
  {
    accessorKey: 'city',
    header: 'Location',
     cell: ({ row }) => `${row.original.city}, ${row.original.county}`,
  },
  {
    accessorKey: 'active_listings_count',
    header: 'Listings',
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
     cell: ({ row }) => format(row.original.created_at.toDate(), 'MMM d, yyyy'),
  },
  {
    id: 'actions',
    cell: ({ row }) => {
      const lead = row.original;
      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
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
