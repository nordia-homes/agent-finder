'use client';

import { ColumnDef } from '@tanstack/react-table';
import { Import } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowUpDown } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

const classificationStyles: Record<NonNullable<Import['classification']>, string> = {
  likely_independent: 'bg-green-100 text-green-800 border-green-200',
  possible_independent: 'bg-amber-100 text-amber-800 border-amber-200',
  agency: 'bg-red-100 text-red-800 border-red-200',
};

const phoneStatusStyles: Record<NonNullable<Import['phone_status']>, string> = {
  found: 'bg-green-100 text-green-800 border-green-200',
  missing: 'bg-gray-100 text-gray-800 border-gray-200',
  not_found: 'bg-gray-100 text-gray-800 border-gray-200',
  click_failed: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  challenge_detected: 'bg-amber-100 text-amber-800 border-amber-200',
  partial_visible: 'bg-orange-100 text-orange-800 border-orange-200',
};


export const columns: ColumnDef<Import>[] = [
  {
    accessorKey: 'company_name',
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        className="-ml-4"
      >
        Company
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => {
      const imp = row.original;
      const name = imp.company_name || imp.full_name;
      return (
        <div className="font-medium">{name}</div>
      );
    },
  },
  {
    accessorKey: 'city',
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        className="-ml-4"
      >
        City
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    filterFn: (row, id, value) => {
      return value === row.getValue(id);
    },
  },
  {
    accessorKey: 'source',
    header: 'Source',
    cell: ({ row }) => {
        const imp = row.original;
        if (!imp.source) return '-';
        const url = imp.source_url;
        const sourceName = imp.source.replace(/_/g, ' ');
        if (!url) return <span className="capitalize">{sourceName}</span>;
        return <a href={url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline capitalize">{sourceName}</a>
    },
    filterFn: (row, id, value) => {
        return value === row.getValue(id);
    }
  },
  {
    accessorKey: 'phone_status',
    header: 'Phone Status',
    cell: ({ row }) => {
      const status = row.original.phone_status;
      if (!status) return null;
      return (
        <Badge variant="outline" className={cn(phoneStatusStyles[status], 'font-medium capitalize')}>
          {status.replace(/_/g, ' ')}
        </Badge>
      );
    },
    filterFn: (row, id, value) => {
      return value === row.getValue(id);
    },
  },
  {
    accessorKey: 'sales_count',
    header: 'Listings (S/R)',
    cell: ({ row }) => {
        const { sales_count, rent_count } = row.original;
        const s = typeof sales_count === 'number' ? sales_count : '-';
        const r = typeof rent_count === 'number' ? rent_count : '-';
        return <span>{s} / {r}</span>
    }
  },
  {
    accessorKey: 'independent_score',
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        className="text-right w-full -mr-4 justify-end"
      >
        Score
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => {
      const score = row.original.independent_score;
      if (typeof score !== 'number') return null;
      const color = score > 70 ? 'text-green-600' : score > 50 ? 'text-amber-600' : 'text-red-600';
      return <div className={cn("font-medium text-right", color)}>{score}</div>
    }
  },
  {
    accessorKey: 'classification',
    header: 'Classification',
    cell: ({ row }) => {
      const classification = row.original.classification;
      if (!classification) return null;
      return (
        <Badge variant="outline" className={cn(classificationStyles[classification], 'font-medium')}>
          {classification.replace('_', ' ')}
        </Badge>
      );
    },
    filterFn: (row, id, value) => {
      return value === row.getValue(id);
    },
  },
  {
    accessorKey: 'importedAt',
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        className="-ml-4"
      >
        Imported
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => format(row.original.importedAt.toDate(), 'MMM d, yyyy'),
  },
];
