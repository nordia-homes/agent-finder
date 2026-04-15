import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Lead } from "@/lib/types";
import { format } from "date-fns";
import { Edit } from "lucide-react";
import { Separator } from "@/components/ui/separator";

const DetailItem = ({ label, value, children }: { label: string; value?: React.ReactNode; children?: React.ReactNode }) => {
    const isValueEmpty = value === null || value === undefined || value === '';
    
    if (isValueEmpty && !children) {
        return null;
    }

    return (
        <div className="flex justify-between items-center">
            <p className="text-sm text-muted-foreground">{label}</p>
            <div className="flex items-center gap-2">
                 <div className="text-sm font-medium text-right truncate">{isValueEmpty ? '-' : value}</div>
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
            <CardContent className="grid gap-y-4">
                <DetailItem 
                    label="Company Name" 
                    value={lead.company_name} 
                />
                <Separator />
                <DetailItem 
                    label="Website" 
                    value={
                        lead.website ? <a href={lead.website} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">{lead.website}</a> : '-'
                    } 
                />
                <Separator />
                 <DetailItem 
                    label="Email Address" 
                    value={<a href={`mailto:${lead.email}`} className="text-primary hover:underline">{lead.email}</a>}
                >
                     <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0 -mr-2">
                        <Edit className="h-4 w-4" />
                    </Button>
                </DetailItem>
                <Separator />
                <DetailItem 
                    label="Lead Source" 
                    value={lead.source} 
                />
                <Separator />
                <DetailItem 
                    label="Active Listings" 
                    value={lead.active_listings_count} 
                />
                 <Separator />
                 <DetailItem 
                    label="Date Added" 
                    value={format(new Date(lead.created_at), 'MMM d, yyyy')} 
                />
            </CardContent>
        </Card>
    );
}
