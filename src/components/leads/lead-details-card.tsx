import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Lead } from "@/lib/types";
import { format } from "date-fns";
import { Edit } from "lucide-react";

const DetailItem = ({ label, value }: { label: string, value?: React.ReactNode }) => {
    if (!value) return null;
    return (
        <div className="space-y-1">
            <p className="text-sm text-muted-foreground">{label}</p>
            <div className="font-medium text-sm">{value}</div>
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
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-8 gap-y-6">
                    <DetailItem label="Company" value={lead.company_name} />
                    <div className="space-y-1">
                         <p className="text-sm text-muted-foreground">Email</p>
                        <div className="flex items-center gap-1">
                            <a href={`mailto:${lead.email}`} className="font-medium text-primary hover:underline text-sm">{lead.email}</a>
                            <Button variant="ghost" size="icon" className="h-6 w-6">
                                <Edit className="h-3 w-3" />
                            </Button>
                        </div>
                    </div>
                     <DetailItem label="Website" value={
                        <a href={lead.website} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">{lead.website}</a>
                     } />
                     <DetailItem label="Lead Owner" value={lead.owner.name} />
                     <DetailItem label="Source" value={lead.source} />
                     <DetailItem label="Created At" value={format(new Date(lead.created_at), 'MMM d, yyyy')} />
                     <DetailItem label="Listings" value={lead.active_listings_count} />
                </div>
            </CardContent>
        </Card>
    );
}
