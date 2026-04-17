'use client';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import type { Lead } from "@/lib/types";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

interface DuplicateLeadsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  duplicates: Lead[];
  originalLeadPhone: string;
}

export function DuplicateLeadsDialog({ open, onOpenChange, duplicates, originalLeadPhone }: DuplicateLeadsDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Duplicate Leads Found</DialogTitle>
          <DialogDescription>
            The phone number <strong>{originalLeadPhone}</strong> is used by the following leads.
          </DialogDescription>
        </DialogHeader>
        <div className="max-h-[60vh] overflow-y-auto">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Company</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead></TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {duplicates.map((lead) => (
                        <TableRow key={lead.id}>
                            <TableCell>{lead.full_name || '-'}</TableCell>
                            <TableCell>{lead.company_name || '-'}</TableCell>
                            <TableCell>{lead.lead_status}</TableCell>
                            <TableCell className="text-right">
                                <Button asChild variant="ghost" size="sm">
                                    <Link href={`/leads/${lead.id}`}>
                                        View <ArrowRight className="ml-2 h-4 w-4" />
                                    </Link>
                                </Button>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
      </DialogContent>
    </Dialog>
  );
}
