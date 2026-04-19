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
import { useState } from 'react';
import { Input } from '../ui/input';
import { Skeleton } from '../ui/skeleton';

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  isLoading?: boolean;
}

export function DataTable<TData, TValue>({
  columns,
  data,
  isLoading,
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onSortingChange: setSorting,
    getSortedRowModel: getSortedRowModel(),
    onColumnFiltersChange: setColumnFilters,
    getFilteredRowModel: getFilteredRowModel(),
    state: {
      sorting,
      columnFilters,
    },
  });

  if (isLoading) {
    return (
      <div className="rounded-[32px] border border-[#d9dfeb] bg-[linear-gradient(180deg,_rgba(255,255,255,0.98),_rgba(246,249,253,0.98))] p-6 shadow-[0_22px_60px_rgba(33,51,84,0.08)]">
        <div className="flex items-center justify-between gap-4 pb-6">
          <div className="space-y-2">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-8 w-52" />
          </div>
          <Skeleton className="h-10 w-full max-w-sm" />
        </div>
        <div className="overflow-hidden rounded-[26px] border border-[#dde4ef] bg-white/90">
          <Table className="min-w-full">
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id} className="border-b border-[#e5eaf2] bg-[#f8fbff]">
                  {headerGroup.headers.map((header) => (
                    <TableHead key={header.id} className="h-14 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#7b89a4]">
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {[...Array(10)].map((_, i) => (
                <TableRow key={i} className="border-b border-[#eef2f7] last:border-b-0">
                  {columns.map((column, j) => (
                    <TableCell key={j} className="py-4">
                      <Skeleton className="h-6" />
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        <div className="flex items-center justify-end space-x-2 pt-6">
          <Skeleton className="h-9 w-24" />
          <Skeleton className="h-9 w-24" />
        </div>
      </div>
    );
  }


  return (
    <div className="rounded-[32px] border border-[#d9dfeb] bg-[linear-gradient(180deg,_rgba(255,255,255,0.98),_rgba(246,249,253,0.98))] p-6 shadow-[0_22px_60px_rgba(33,51,84,0.08)]">
       <div className="flex flex-col gap-4 pb-6 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#7d8aa3]">Lead directory</p>
          <p className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-[#152033]">
            {table.getFilteredRowModel().rows.length} visible leads
          </p>
        </div>
        <Input
          placeholder="Search by name or email..."
          value={(table.getColumn("full_name")?.getFilterValue() as string) ?? ""}
          onChange={(event) =>
            table.getColumn("full_name")?.setFilterValue(event.target.value)
          }
          className="h-11 max-w-md rounded-full border-[#d9dfeb] bg-white/90 px-5 shadow-[0_10px_20px_rgba(33,51,84,0.04)]"
        />
      </div>
      <div className="overflow-hidden rounded-[26px] border border-[#dde4ef] bg-white/90">
        <Table className="min-w-full">
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id} className="border-b border-[#e5eaf2] bg-[#f8fbff]">
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead key={header.id} className="h-14 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#7b89a4]">
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
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && 'selected'}
                  className="border-b border-[#eef2f7] transition-colors hover:bg-[#f8fbff] data-[state=selected]:bg-[#f3f7fc]"
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id} className="py-4 align-middle">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-28 text-center text-[#7d8aa3]">
                  No leads match your current filters.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <div className="flex items-center justify-end space-x-2 pt-6">
        <Button
          variant="outline"
          size="sm"
          onClick={() => table.previousPage()}
          disabled={!table.getCanPreviousPage()}
          className="rounded-full border-[#d9dfeb] bg-white/90 px-4"
        >
          Previous
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => table.nextPage()}
          disabled={!table.getCanNextPage()}
          className="rounded-full border-[#d9dfeb] bg-white/90 px-4"
        >
          Next
        </Button>
      </div>
    </div>
  );
}
