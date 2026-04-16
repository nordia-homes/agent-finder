'use client';

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { ScrapeJob } from "@/lib/types";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { Skeleton } from "../ui/skeleton";
import { AlertCircle, CheckCircle2, Clock, FileDown, HardDrive, Link, Loader, ServerCrash } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

interface ScrapeJobStatusProps {
    job?: ScrapeJob;
    totalImports?: number;
    isLoading: boolean;
}

const StatusCard = ({ title, value, icon: Icon, isLoading, className }: { title: string; value: React.ReactNode; icon: React.ElementType; isLoading: boolean, className?: string; }) => (
    <Card className={cn("p-4 flex items-center gap-4", className)}>
        <div className="p-2 bg-muted rounded-md">
            <Icon className="h-6 w-6 text-muted-foreground" />
        </div>
        <div>
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            {isLoading ? <Skeleton className="h-6 w-24 mt-1" /> : <p className="text-xl font-bold">{value}</p>}
        </div>
    </Card>
);

const statusConfig: Record<ScrapeJob['status'], { text: string; icon: React.ElementType; className: string }> = {
    running: { text: "Running", icon: Loader, className: "bg-blue-100 text-blue-800 animate-spin" },
    completed: { text: "Completed", icon: CheckCircle2, className: "bg-green-100 text-green-800" },
    failed: { text: "Failed", icon: ServerCrash, className: "bg-red-100 text-red-800" },
};


export function ScrapeJobStatus({ job, totalImports, isLoading }: ScrapeJobStatusProps) {
    
    const JobStatusBadge = () => {
        if (isLoading) return <Skeleton className="h-7 w-24 rounded-full" />;
        if (!job) return <Badge variant="outline" className="bg-gray-100 text-gray-800 border-gray-200">No Job Data</Badge>;
        
        const config = statusConfig[job.status];
        const Icon = config.icon;

        return (
            <Badge variant="outline" className={cn("text-base py-1 px-3 border-none", config.className)}>
                <Icon className="h-4 w-4 mr-2" />
                {config.text}
            </Badge>
        );
    }
    
    const timeAgo = (date: any) => {
        if (!date) return '-';
        try {
            return formatDistanceToNow(date.toDate(), { addSuffix: true });
        } catch(e) {
            return "-"
        }
    }

    return (
        <Card className="p-4 bg-card">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4">
                <h3 className="text-lg font-semibold text-foreground font-headline mb-2 sm:mb-0">Latest Scrape Job</h3>
                <JobStatusBadge />
            </div>

            {job?.error && (
                 <Card className="bg-destructive/10 border-destructive/20 p-0 mb-4">
                     <Accordion type="single" collapsible className="w-full">
                        <AccordionItem value="error-details" className="border-none">
                            <AccordionTrigger className="p-4 hover:no-underline text-destructive-foreground">
                                 <div className="flex items-start gap-3 text-left">
                                    <AlertCircle className="h-5 w-5 text-destructive mt-0.5 flex-shrink-0" />
                                    <div>
                                        <p className="font-bold text-destructive">Scraping Job Failed</p>
                                        <p className="text-sm text-destructive/90">A critical error occurred. Click for details.</p>
                                    </div>
                                </div>
                            </AccordionTrigger>
                            <AccordionContent className="px-4 pb-4">
                                <pre className="text-xs font-mono text-destructive/90 bg-destructive/10 p-2 rounded-md whitespace-pre-wrap break-all">
                                    {job.error}
                                </pre>
                            </AccordionContent>
                        </AccordionItem>
                    </Accordion>
                </Card>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatusCard
                    title="Source"
                    value={isLoading ? '...' : job?.source || '-'}
                    icon={HardDrive}
                    isLoading={isLoading}
                />
                <StatusCard
                    title="Pages Processed"
                    value={isLoading ? '...' : job?.pagesProcessed?.toString() || '0'}
                    icon={FileDown}
                    isLoading={isLoading}
                />
                <StatusCard
                    title="Total Imported"
                    value={isLoading ? '...' : (totalImports ?? job?.totalImported)?.toString() || '0'}
                    icon={FileDown}
                    isLoading={isLoading}
                />
                 <StatusCard
                    title="Last Update"
                    value={isLoading ? '...' : timeAgo(job?.updatedAt)}
                    icon={Clock}
                    isLoading={isLoading}
                />
            </div>
            
             <div className="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-4">
                <Card className="p-3 bg-muted/50 text-sm">
                    <div className="flex items-center gap-2">
                        <Link className="h-4 w-4 text-muted-foreground"/>
                        <span className="font-medium text-muted-foreground mr-2">Current URL:</span>
                        {isLoading ? <Skeleton className="h-4 w-1/2"/> : <a href={job?.currentPageUrl} target="_blank" rel="noopener noreferrer" className="truncate text-primary hover:underline">{job?.currentPageUrl || 'N/A'}</a>}
                    </div>
                </Card>
                <Card className="p-3 bg-muted/50 text-sm">
                     <div className="flex items-center gap-2">
                        <Link className="h-4 w-4 text-muted-foreground"/>
                        <span className="font-medium text-muted-foreground mr-2">Next URL:</span>
                        {isLoading ? <Skeleton className="h-4 w-1/2"/> : <a href={job?.nextPageUrl} target="_blank" rel="noopener noreferrer" className="truncate text-primary hover:underline">{job?.nextPageUrl || 'N/A'}</a>}
                    </div>
                </Card>
             </div>
        </Card>
    );
}
