'use client';

import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  useReactTable,
  SortingState,
  ColumnFiltersState,
  VisibilityState,
} from '@tanstack/react-table';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { useState, useMemo } from 'react';
import { Input } from '../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Slider } from '../ui/slider';
import { Skeleton } from '../ui/skeleton';
import { cn } from '@/lib/utils';
import type { Import } from '@/lib/types';


interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  onRowClick: (row: TData) => void;
  isLoading?: boolean;
}

export function DataTable<TData extends {id: string, independent_score?: number, classification?: string, company_name?: string, full_name?: string}, TValue>({
  columns,
  data,
  onRowClick,
  isLoading,
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = useState<SortingState>([{ id: 'importedAt', desc: true }]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [globalFilter, setGlobalFilter] = useState('');
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});


  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onSortingChange: setSorting,
    getSortedRowModel: getSortedRowModel(),
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      globalFilter,
    },
    globalFilterFn: (row, columnId, filterValue) => {
        const search = filterValue.toLowerCase();
        const value = row.original as Import;
        const companyName = value.company_name?.toLowerCase() || '';
        const fullName = value.full_name?.toLowerCase() || '';
        return companyName.includes(search) || fullName.includes(search);
    }
  });

  const cities = useMemo(() => {
    const citySet = new Set(data.map(item => (item as any).city).filter(Boolean));
    return Array.from(citySet);
  }, [data]);
  
  const sources = useMemo(() => {
    const sourceSet = new Set(data.map(item => (item as any).source).filter(Boolean));
    return Array.from(sourceSet).map(s => s.replace(/_/g, ' '));
  }, [data]);

  const scoreRange = (table.getColumn('independent_score')?.getFilterValue() as [number, number]) ?? [0, 100];

  if (isLoading) {
      return (
          <div className="rounded-lg border bg-card p-4">
              <div className="space-y-4">
                  <Skeleton className="h-10 w-full" />
                   <Skeleton className="h-40 w-full" />
              </div>
          </div>
      )
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-4 py-4">
        <Input
          placeholder="Search by name or company..."
          value={globalFilter}
          onChange={(event) => setGlobalFilter(event.target.value)}
          className="max-w-xs bg-card"
        />
        <div className="flex flex-wrap items-center gap-2">
            <Select onValueChange={(value) => table.getColumn('city')?.setFilterValue(value === 'all' ? undefined : value)}>
                <SelectTrigger className="w-[160px] bg-card">
                    <SelectValue placeholder="Filter by City" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">All Cities</SelectItem>
                    {cities.map(city => <SelectItem key={city} value={city}>{city}</SelectItem>)}
                </SelectContent>
            </Select>

            <Select onValueChange={(value) => table.getColumn('source')?.setFilterValue(value === 'all' ? undefined : value.replace(/ /g, '_'))}>
                <SelectTrigger className="w-[160px] bg-card capitalize">
                    <SelectValue placeholder="Filter by Source" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">All Sources</SelectItem>
                    {sources.map(source => <SelectItem key={source} value={source} className="capitalize">{source}</SelectItem>)}
                </SelectContent>
            </Select>

             <Select onValueChange={(value) => table.getColumn('classification')?.setFilterValue(value === 'all' ? undefined : value)}>
                <SelectTrigger className="w-[180px] bg-card">
                    <SelectValue placeholder="Classification" />
                </SelectTrigger>
                <SelectContent>
                     <SelectItem value="all">All Classifications</SelectItem>
                     <SelectItem value="likely_independent">Likely Independent</SelectItem>
                     <SelectItem value="possible_independent">Possible Independent</SelectItem>
                     <SelectItem value="agency">Agency</SelectItem>
                </SelectContent>
            </Select>

            <Select onValueChange={(value) => table.getColumn('phone_status')?.setFilterValue(value === 'all' ? undefined : value)}>
                <SelectTrigger className="w-[180px] bg-card">
                    <SelectValue placeholder="Phone Status" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">All Phone Statuses</SelectItem>
                    <SelectItem value="found">Found</SelectItem>
                    <SelectItem value="missing">Missing</SelectItem>
                    <SelectItem value="not_found">Not Found</SelectItem>
                    <SelectItem value="click_failed">Click Failed</SelectItem>
                    <SelectItem value="challenge_detected">Challenge Detected</SelectItem>
                </SelectContent>
            </Select>

             <Select onValueChange={(value) => table.getColumn('review_status')?.setFilterValue(value === 'all' ? undefined : value)}>
                <SelectTrigger className="w-[180px] bg-card">
                    <SelectValue placeholder="Review Status" />
                </SelectTrigger>
                <SelectContent>
                     <SelectItem value="all">All Statuses</SelectItem>
                     <SelectItem value="pending_review">Pending Review</SelectItem>
                     <SelectItem value="approved">Approved</SelectItem>
                     <SelectItem value="rejected">Rejected</SelectItem>
                     <SelectItem value="duplicate">Duplicate</SelectItem>
                </SelectContent>
            </Select>
        </div>
        <div className="flex items-center gap-2 w-full max-w-xs">
            <span className="text-sm text-muted-foreground w-32 shrink-0">Score: {scoreRange[0]} - {scoreRange[1]}</span>
            <Slider
                defaultValue={[0, 100]}
                min={0}
                max={100}
                step={1}
                value={scoreRange}
                onValueChange={(value) => table.getColumn('independent_score')?.setFilterValue(value)}
            />
        </div>
      </div>
      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead key={header.id}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => {
                const importData = row.original as Import;
                const score = importData.independent_score || 0;
                return (
                    <TableRow
                    key={row.id}
                    onClick={() => onRowClick(row.original)}
                    className={cn(
                        "cursor-pointer",
                        score > 70 && 'bg-green-500/5 hover:bg-green-500/10',
                        importData.classification === 'agency' && 'bg-red-500/5 hover:bg-red-500/10'
                    )}
                    >
                    {row.getVisibleCells().map((cell) => (
                        <TableCell key={cell.id}>
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </TableCell>
                    ))}
                    </TableRow>
                )
              })
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  No results found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <div className="flex items-center justify-end space-x-2 py-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => table.previousPage()}
          disabled={!table.getCanPreviousPage()}
        >
          Previous
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => table.nextPage()}
          disabled={!table.getCanNextPage()}
        >
          Next
        </Button>
      </div>
    </div>
  );
}
