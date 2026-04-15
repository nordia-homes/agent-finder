'use client';

import { cn } from '@/lib/utils';
import { Check } from 'lucide-react';
import type { Lead } from '@/lib/types';
import React from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';


const STAGES = [
    { id: 'new', label: 'New' },
    { id: 'contacted', label: 'Contacted' },
    { id: 'qualified', label: 'Qualified' },
    { id: 'demo_booked', label: 'Demo Booked' },
    { id: 'closed_won', label: 'Won' },
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

export function LeadLifecycleTracker({ lead }: { lead: Lead }) {
    const currentStageId = STATUS_TO_STAGE_MAP[lead.lead_status];
    const currentStageIndex = STAGES.findIndex(s => s.id === currentStageId);
    
    const isLost = currentStageId === 'lost';

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-4">
                <div>
                    <CardTitle className="font-headline text-lg">Lifecycle Stage</CardTitle>
                </div>
                <div className="w-[200px]">
                    <Select defaultValue={lead.lead_status}>
                        <SelectTrigger id="lead-status" className="bg-background h-9">
                            <SelectValue placeholder="Update status" />
                        </SelectTrigger>
                        <SelectContent>
                             <SelectItem value="new">New</SelectItem>
                            <SelectItem value="reviewed">Reviewed</SelectItem>
                            <SelectItem value="qualified">Qualified</SelectItem>
                            <SelectItem value="contacted">Contacted</SelectItem>
                            <SelectItem value="replied">Replied</SelectItem>
                            <SelectItem value="demo_booked">Demo Booked</SelectItem>
                            <SelectItem value="closed_won">Closed Won</SelectItem>
                            <SelectItem value="closed_lost">Closed Lost</SelectItem>
                            <SelectItem value="not_relevant">Not Relevant</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </CardHeader>
            <CardContent>
                <div className="flex items-center gap-1">
                    {STAGES.map((stage, index) => {
                        const isCompleted = currentStageIndex >= index;
                        return (
                            <React.Fragment key={stage.id}>
                                <div
                                    className={cn(
                                        'flex h-8 flex-1 items-center justify-center rounded-md px-3 text-xs font-medium transition-colors',
                                        isCompleted ? 'bg-primary/90 text-primary-foreground' : 'bg-muted text-muted-foreground'
                                    )}
                                >
                                    <Check className={cn('mr-1.5 h-3 w-3', isCompleted ? 'opacity-100' : 'opacity-0')} />
                                    <span>{stage.label}</span>
                                </div>
                                {index < STAGES.length - 1 && (
                                    <div className={cn("h-0.5 w-4 flex-shrink-0 rounded-full", isCompleted ? 'bg-primary/90' : 'bg-border' )} />
                                )}
                            </React.Fragment>
                        );
                    })}
                     {isLost && (
                        <>
                            <div className="h-0.5 w-4 flex-shrink-0 rounded-full bg-destructive" />
                            <div
                                className='flex h-8 flex-1 items-center justify-center rounded-md bg-destructive px-3 text-xs font-medium text-destructive-foreground'
                            >
                                <span>{lead.lead_status === 'closed_lost' ? 'Lost' : 'Not Relevant'}</span>
                            </div>
                        </>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
