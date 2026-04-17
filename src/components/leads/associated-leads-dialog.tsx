'use client';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
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
import { ArrowRight, GitMerge } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface AssociatedLeadsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  potentialDuplicates: Lead[];
  mergedLeads: Lead[];
  onMerge: (masterLeadId: string) => void;
  currentLeadName: string;
}

export function AssociatedLeadsDialog({ open, onOpenChange, potentialDuplicates, mergedLeads, onMerge, currentLeadName }: AssociatedLeadsDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Associated Leads</DialogTitle>
          <DialogDescription>
            Manage potential duplicates or view leads that have been merged into this one.
          </DialogDescription>
        </DialogHeader>
        <div className="max-h-[60vh] overflow-y-auto space-y-6 pt-4">
            {potentialDuplicates.length > 0 && (
                <div>
                    <h3 className="text-lg font-semibold mb-2">Potential Duplicates</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                        The following leads have the same phone number. You can merge the current lead (<strong className="text-foreground">{currentLeadName}</strong>) into one of them. Merging is permanent and will archive the current lead.
                    </p>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Name</TableHead>
                                <TableHead>Company</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {potentialDuplicates.map((lead) => (
                                <TableRow key={lead.id}>
                                    <TableCell>{lead.full_name || '-'}</TableCell>
                                    <TableCell>{lead.company_name || '-'}</TableCell>
                                    <TableCell>{lead.lead_status}</TableCell>
                                    <TableCell className="text-right space-x-2">
                                        <Button asChild variant="ghost" size="sm">
                                            <Link href={`/leads/${lead.id}`} target="_blank">
                                                View <ArrowRight className="ml-2 h-4 w-4" />
                                            </Link>
                                        </Button>
                                        <AlertDialog>
                                            <AlertDialogTrigger asChild>
                                                <Button variant="destructive" size="sm">
                                                    <GitMerge className="mr-2 h-4 w-4" />
                                                    Merge
                                                </Button>
                                            </AlertDialogTrigger>
                                            <AlertDialogContent>
                                                <AlertDialogHeader>
                                                    <AlertDialogTitle>Confirm Merge</AlertDialogTitle>
                                                    <AlertDialogDescription>
                                                        Are you sure you want to merge <strong className="text-foreground">{currentLeadName}</strong> into <strong className="text-foreground">{lead.full_name || lead.company_name}</strong>? This action cannot be undone. The current lead will be archived.
                                                    </AlertDialogDescription>
                                                </AlertDialogHeader>
                                                <AlertDialogFooter>
                                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                    <AlertDialogAction onClick={() => onMerge(lead.id)}>
                                                        Confirm Merge
                                                    </AlertDialogAction>
                                                </AlertDialogFooter>
                                            </AlertDialogContent>
                                        </AlertDialog>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            )}

            {mergedLeads.length > 0 && (
                 <div>
                    <h3 className="text-lg font-semibold mb-2">Leads Merged Into This One</h3>
                     <p className="text-sm text-muted-foreground mb-4">
                        The following leads have been previously merged into this one.
                    </p>
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
                             {mergedLeads.map((lead) => (
                                <TableRow key={lead.id} className="bg-muted/50">
                                    <TableCell>{lead.full_name || '-'}</TableCell>
                                    <TableCell>{lead.company_name || '-'}</TableCell>
                                    <TableCell><Badge variant="outline">Merged</Badge></TableCell>
                                    <TableCell className="text-right">
                                        {/* Merged leads are archived, so viewing them directly is disabled */}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            )}

            {potentialDuplicates.length === 0 && mergedLeads.length === 0 && (
                <p className="text-center text-muted-foreground py-8">No associated leads found.</p>
            )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
