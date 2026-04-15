import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Lead } from "@/lib/types";
import { format } from "date-fns";
import { Edit, Briefcase, Globe, Info, Calendar, Hash, Mail } from "lucide-react";

const DetailItem = ({ icon, label, value, children }: { icon: React.ReactNode; label: string; value?: React.ReactNode; children?: React.ReactNode }) => {
    const isValueEmpty = value === null || value === undefined || value === '';
    
    if (isValueEmpty && !children) {
        return null;
    }

    return (
        <div className="rounded-lg border bg-background/50 p-4 flex items-center gap-4 transition-colors hover:bg-muted/40">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted/60 text-muted-foreground">
                {icon}
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-xs text-muted-foreground">{label}</p>
                <div className="text-sm font-medium truncate">{isValueEmpty ? '-' : value}</div>
            </div>
            {children && <div className="flex-shrink-0">{children}</div>}
        </div>
    );
};


export function LeadDetailsCard({ lead }: { lead: Lead }) {
    return (
        <Card>
            <CardHeader>
                <CardTitle className="font-headline text-lg">Lead Details</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <DetailItem 
                        icon={<Briefcase className="h-5 w-5"/>}
                        label="Company" 
                        value={lead.company_name} 
                    />
                    <DetailItem 
                        icon={<Globe className="h-5 w-5"/>}
                        label="Website" 
                        value={
                            lead.website ? <a href={lead.website} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">{lead.website}</a> : null
                        } 
                    />
                    <DetailItem 
                        icon={<Info className="h-5 w-5"/>}
                        label="Source" 
                        value={lead.source} 
                    />
                    <DetailItem 
                        icon={<Hash className="h-5 w-5"/>}
                        label="Listings" 
                        value={lead.active_listings_count} 
                    />
                     <DetailItem 
                        icon={<Calendar className="h-5 w-5"/>}
                        label="Created At" 
                        value={format(new Date(lead.created_at), 'MMM d, yyyy')} 
                    />
                     <DetailItem 
                        icon={<Mail className="h-5 w-5"/>}
                        label="Email" 
                        value={<a href={`mailto:${lead.email}`} className="text-primary hover:underline">{lead.email}</a>}
                    >
                         <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0">
                            <Edit className="h-4 w-4" />
                        </Button>
                    </DetailItem>
                </div>
            </CardContent>
        </Card>
    );
}
