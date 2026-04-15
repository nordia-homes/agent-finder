import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Lead } from "@/lib/types";
import { format } from "date-fns";
import { Edit } from "lucide-react";

const DetailItem = ({ label, value, children }: { label: string; value?: React.ReactNode; children?: React.ReactNode }) => {
    const isValueEmpty = value === null || value === undefined || value === '';
    
    const displayValue = isValueEmpty && !children ? '-' : value;

    return (
        <div className="text-foreground p-4 text-base rounded-lg bg-background cursor-pointer border border-transparent transition-all duration-300 shadow-neumorphic hover:border-card active:shadow-neumorphic-active group">
            <p className="text-xs text-muted-foreground mb-1">{label}</p>
            <div className="flex items-center justify-between">
                <div className="text-sm font-medium truncate">{displayValue}</div>
                 {children}
            </div>
        </div>
    );
};

export function LeadDetailsCard({ lead }: { lead: Lead }) {
    return (
        <Card>
            <CardHeader>
                <CardTitle className="font-headline text-lg">Lead Details</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <DetailItem 
                    label="Company Name" 
                    value={lead.company_name} 
                />
                <DetailItem 
                    label="Website" 
                    value={
                        lead.website ? <a href={lead.website} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">{lead.website}</a> : undefined
                    } 
                />
                 <DetailItem 
                    label="Email Address" 
                    value={<a href={`mailto:${lead.email}`} className="text-primary hover:underline">{lead.email}</a>}
                >
                     <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0 -mr-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Edit className="h-4 w-4" />
                    </Button>
                </DetailItem>
                <DetailItem 
                    label="Lead Source" 
                    value={lead.source} 
                />
                <DetailItem 
                    label="Active Listings" 
                    value={lead.active_listings_count} 
                />
                 <DetailItem 
                    label="Date Added" 
                    value={format(new Date(lead.created_at), 'MMM d, yyyy')} 
                />
            </CardContent>
        </Card>
    );
}
