'use client';

import { cn } from '@/lib/utils';
import { Check } from 'lucide-react';
import type { Lead } from '@/lib/types';
import React, { useState } from 'react';
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

const STAGES = [
    { id: 'new', label: 'New', status: 'new' as const },
    { id: 'contacted', label: 'Contacted', status: 'contacted' as const },
    { id: 'qualified', label: 'Qualified', status: 'qualified' as const },
    { id: 'demo_booked', label: 'Demo Booked', status: 'demo_booked' as const },
    { id: 'closed_won', label: 'Won', status: 'closed_won' as const },
];

const LOST_STAGES = [
    { id: 'closed_lost', label: 'Lost', status: 'closed_lost' as const },
    { id: 'not_relevant', label: 'Not Relevant', status: 'not_relevant' as const },
];


const STATUS_TO_STAGE_MAP: Record<Lead['lead_status'], string> = {
  new: 'new',
  reviewed: 'new',
  contacted: 'contacted',
  replied: 'contacted',
  qualified: 'qualified',
  demo_booked: 'demo_booked',
  closed_won: 'closed_won',
  closed_lost: 'lost',
  not_relevant: 'lost',
};

// A wrapper for the trigger button to avoid having a button inside a button
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

    const currentStageId = STATUS_TO_STAGE_MAP[lead.lead_status];
    const currentStageIndex = STAGES.findIndex(s => s.id === currentStageId);
    
    const isLostOrNotRelevant = currentStageId === 'lost';

    const handleStageChangeConfirm = () => {
        if (pendingStatus) {
            setLead(prevLead => ({ ...prevLead, lead_status: pendingStatus }));
            toast({
                title: "Status Updated",
                description: `Lead status has been changed to "${getStageLabel(pendingStatus)}".`,
            });
            setPendingStatus(null);
        }
    };
    
    const getStageLabel = (status: Lead['lead_status'] | null) => {
        if (!status) return '';
        const allStages = [...STAGES, ...LOST_STAGES];
        const stage = allStages.find(s => s.status === status);
        return stage ? stage.label : status.replace('_', ' ');
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
                {isLostOrNotRelevant ? (
                    <>
                        <div className="h-0.5 w-4 flex-shrink-0 rounded-full bg-destructive" />
                        <div
                            className='flex h-8 flex-1 items-center justify-center rounded-md bg-destructive px-3 text-xs font-medium text-destructive-foreground'
                        >
                            <span>{lead.lead_status === 'closed_lost' ? 'Lost' : 'Not Relevant'}</span>
                        </div>
                    </>
                ) : (
                    <>
                        <div className="h-0.5 w-4 flex-shrink-0 rounded-full bg-border" />
                        {LOST_STAGES.map(stage => renderStageButton(stage, false, true))}
                    </>
                )}
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
