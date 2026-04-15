import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Lead } from "@/lib/types";
import { format } from "date-fns";
import { Edit, Briefcase, Globe, Info, Calendar, Hash, Mail } from "lucide-react";

const DetailItem = ({ icon, label, value }: { icon: React.ReactNode; label: string; value?: React.ReactNode }) => {
    if (value === null || value === undefined || value === '') return null;
    return (
         <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted/60">
                {icon}
            </div>
            <div>
                <p className="text-xs text-muted-foreground">{label}</p>
                <div className="text-sm font-medium">{value}</div>
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
            <CardContent>
                <div className="grid grid-cols-1 gap-y-6 md:grid-cols-2 md:gap-x-6">
                    <DetailItem 
                        icon={<Briefcase className="h-4 w-4 text-muted-foreground"/>}
                        label="Company" 
                        value={lead.company_name} 
                    />
                     <div className="flex items-center justify-between">
                        <DetailItem 
                            icon={<Mail className="h-4 w-4 text-muted-foreground"/>}
                            label="Email" 
                            value={<a href={`mailto:${lead.email}`} className="text-primary hover:underline">{lead.email}</a>}
                        />
                         <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0">
                            <Edit className="h-4 w-4" />
                        </Button>
                    </div>
                    <DetailItem 
                        icon={<Globe className="h-4 w-4 text-muted-foreground"/>}
                        label="Website" 
                        value={
                            lead.website && <a href={lead.website} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">{lead.website}</a>
                        } 
                    />
                    <DetailItem 
                        icon={<Info className="h-4 w-4 text-muted-foreground"/>}
                        label="Source" 
                        value={lead.source} 
                    />
                     <DetailItem 
                        icon={<Calendar className="h-4 w-4 text-muted-foreground"/>}
                        label="Created At" 
                        value={format(new Date(lead.created_at), 'MMM d, yyyy')} 
                    />
                    <DetailItem 
                        icon={<Hash className="h-4 w-4 text-muted-foreground"/>}
                        label="Listings" 
                        value={lead.active_listings_count} 
                    />
                </div>
            </CardContent>
        </Card>
    );
}
