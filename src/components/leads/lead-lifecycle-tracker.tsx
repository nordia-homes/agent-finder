'use client';

import { cn } from '@/lib/utils';
import { Check } from 'lucide-react';
import type { Lead } from '@/lib/types';
import React, { useState } from 'react';
import {
  LEAD_STATUS_DROPDOWN_STATUSES,
  LEAD_STATUS_LABELS,
  PIPELINE_LEAD_STATUSES,
  normalizeLeadStatus,
} from '@/lib/lead-status';
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
import { useToast } from '@/hooks/use-toast';
import { useFirestore } from '@/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const STAGES = PIPELINE_LEAD_STATUSES.map((status) => ({
  id: status,
  label: LEAD_STATUS_LABELS[status],
  status,
}));

const DROPDOWN_STAGES = LEAD_STATUS_DROPDOWN_STATUSES.map((status) => ({
  id: status,
  label: LEAD_STATUS_LABELS[status],
  status,
}));

const StageButton = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement>
>(({ children, ...props }, ref) => {
  return (
    <button ref={ref} {...props}>
      {children}
    </button>
  );
});
StageButton.displayName = 'StageButton';


export function LeadLifecycleTracker({ lead: initialLead }: { lead: Lead }) {
    const [lead, setLead] = useState(initialLead);
    const [pendingStatus, setPendingStatus] = useState<Lead['lead_status'] | null>(null);
    const { toast } = useToast();
    const firestore = useFirestore();

    const currentStageId = normalizeLeadStatus(lead.lead_status);
    const currentStageIndex = STAGES.findIndex(s => s.id === currentStageId);
    const isDropdownStatus = DROPDOWN_STAGES.some((stage) => stage.status === currentStageId);

    const handleStageChangeConfirm = async () => {
        if (pendingStatus && firestore) {
            const leadRef = doc(firestore, 'leads', lead.id);
            try {
                await updateDoc(leadRef, { lead_status: pendingStatus });
                setLead(prevLead => ({ ...prevLead, lead_status: pendingStatus! }));
                toast({
                    title: "Status Updated",
                    description: `Lead status has been changed to "${getStageLabel(pendingStatus)}".`,
                });
            } catch (error) {
                console.error("Error updating lead status:", error);
                toast({
                    title: "Error",
                    description: "Failed to update lead status.",
                    variant: "destructive"
                });
            } finally {
                 setPendingStatus(null);
            }
        }
    };
    
    const getStageLabel = (status: Lead['lead_status'] | null) => {
        if (!status) return '';
        const allStages = [...STAGES, ...DROPDOWN_STAGES];
        const stage = allStages.find(s => s.status === status);
        return stage ? stage.label : LEAD_STATUS_LABELS[normalizeLeadStatus(status)];
    }

    const renderStageButton = (stage: { id: string; label: string; status: Lead['lead_status'] }, isCompleted: boolean, isLostButton = false) => {
        const Trigger = (
             <StageButton
                onClick={() => setPendingStatus(stage.status)}
                disabled={lead.lead_status === stage.status}
                className={cn(
                    'flex h-8 flex-1 items-center justify-center rounded-md px-3 text-xs font-medium transition-colors',
                    isLostButton 
                        ? 'bg-muted text-muted-foreground hover:bg-destructive/90 hover:text-destructive-foreground'
                        : isCompleted 
                            ? 'bg-primary/90 text-primary-foreground' 
                            : 'bg-muted text-muted-foreground hover:bg-primary/80 hover:text-primary-foreground',
                    'disabled:cursor-not-allowed disabled:opacity-70 disabled:hover:bg-primary/90'
                )}
            >
                {!isLostButton && <Check className={cn('mr-1.5 h-3 w-3', isCompleted ? 'opacity-100' : 'opacity-0')} />}
                <span>{stage.label}</span>
            </StageButton>
        )

        return (
            <AlertDialogTrigger asChild key={stage.id}>
                {Trigger}
            </AlertDialogTrigger>
        )
    };

    return (
        <AlertDialog open={!!pendingStatus} onOpenChange={(open) => !open && setPendingStatus(null)}>
            <div className="flex flex-wrap items-center gap-2">
                {STAGES.map((stage, index) => {
                    const isCompleted = currentStageIndex >= index && currentStageIndex !== -1;
                    return (
                        <React.Fragment key={stage.id}>
                            {renderStageButton(stage, isCompleted)}
                            {index < STAGES.length - 1 && (
                                <div className={cn("h-0.5 w-4 flex-shrink-0 rounded-full", isCompleted ? 'bg-primary/90' : 'bg-border' )} />
                            )}
                        </React.Fragment>
                    );
                })}
                <div className="h-0.5 w-4 flex-shrink-0 rounded-full bg-border" />
                <Select value={isDropdownStatus ? currentStageId : undefined} onValueChange={(value) => setPendingStatus(value as Lead['lead_status'])}>
                    <SelectTrigger className={cn("h-8 w-[170px] text-xs", isDropdownStatus ? "border-amber-300 bg-amber-50 text-amber-900" : "")}>
                        <SelectValue placeholder="Outcome" />
                    </SelectTrigger>
                    <SelectContent>
                        {DROPDOWN_STAGES.map((stage) => (
                            <SelectItem key={stage.id} value={stage.status}>
                                {stage.label}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Confirm Status Change</AlertDialogTitle>
                    <AlertDialogDescription>
                        Are you sure you want to change the lead status to "{getStageLabel(pendingStatus)}"?
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel onClick={() => setPendingStatus(null)}>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleStageChangeConfirm}>Confirm</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}
