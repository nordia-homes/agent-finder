'use client';

import { cn } from '@/lib/utils';
import { Check } from 'lucide-react';
import type { Lead } from '@/lib/types';
import React, { useState } from 'react';

const STAGES = [
    { id: 'new', label: 'New', status: 'new' as const },
    { id: 'contacted', label: 'Contacted', status: 'contacted' as const },
    { id: 'qualified', label: 'Qualified', status: 'qualified' as const },
    { id: 'demo_booked', label: 'Demo Booked', status: 'demo_booked' as const },
    { id: 'closed_won', label: 'Won', status: 'closed_won' as const },
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

export function LeadLifecycleTracker({ lead: initialLead }: { lead: Lead }) {
    const [lead, setLead] = useState(initialLead);

    const currentStageId = STATUS_TO_STAGE_MAP[lead.lead_status];
    const currentStageIndex = STAGES.findIndex(s => s.id === currentStageId);
    
    const isLostOrNotRelevant = currentStageId === 'lost';

    const handleStageClick = (newStatus: Lead['lead_status']) => {
        setLead(prevLead => ({ ...prevLead, lead_status: newStatus }));
        // In a real app, you would also call an API to save this change.
    };

    return (
        <div className="flex flex-wrap items-center gap-2">
            {STAGES.map((stage, index) => {
                const isCompleted = currentStageIndex >= index && currentStageIndex !== -1;
                return (
                    <React.Fragment key={stage.id}>
                        <button
                            onClick={() => handleStageClick(stage.status)}
                            className={cn(
                                'flex h-8 flex-1 items-center justify-center rounded-md px-3 text-xs font-medium transition-colors cursor-pointer',
                                isCompleted 
                                ? 'bg-primary/90 text-primary-foreground' 
                                : 'bg-muted text-muted-foreground hover:bg-primary/80 hover:text-primary-foreground'
                            )}
                        >
                            <Check className={cn('mr-1.5 h-3 w-3', isCompleted ? 'opacity-100' : 'opacity-0')} />
                            <span>{stage.label}</span>
                        </button>
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
                     <button
                        onClick={() => handleStageClick('closed_lost')}
                        className='flex h-8 items-center justify-center rounded-md bg-muted px-3 text-xs font-medium text-muted-foreground transition-colors hover:bg-destructive/90 hover:text-destructive-foreground'
                    >
                        <span>Lost</span>
                    </button>
                    <button
                        onClick={() => handleStageClick('not_relevant')}
                        className='flex h-8 items-center justify-center rounded-md bg-muted px-3 text-xs font-medium text-muted-foreground transition-colors hover:bg-destructive/90 hover:text-destructive-foreground'
                    >
                        <span>Not Relevant</span>
                    </button>
                </>
            )}
        </div>
    );
}
