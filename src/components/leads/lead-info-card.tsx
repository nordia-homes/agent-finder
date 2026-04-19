import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { Lead } from "@/lib/types";
import { Mail, MessageSquare, Phone, MapPin, Sparkles, List } from "lucide-react";
import { AIEnrichmentDialog } from "./ai-enrichment-dialog";

export function LeadInfoCard({ lead }: { lead: Lead }) {
    const hasPhone = !!lead.phone;
    const hasEmail = !!lead.email;
    const whatsappPhoneNumber = hasPhone ? (lead.phone || '').replace(/[^0-9]/g, '') : '';

    return (
        <Card className="bg-gradient-to-br from-primary/90 to-primary text-primary-foreground overflow-hidden">
            <CardContent className="p-6 relative">
                 <div className="absolute inset-0 bg-black/20 mix-blend-multiply"></div>
                 <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                    <div>
                        <h1 className="text-3xl font-bold font-headline tracking-tight text-white shadow-sm">{lead.full_name || lead.company_name}</h1>
                        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-white/80 mt-2 text-sm">
                            <div className="flex items-center gap-2">
                                <MapPin className="h-4 w-4" />
                                <span>{lead.city}, {lead.county}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <List className="h-4 w-4" />
                                <span>{lead.active_listings_count ?? 0} active listings</span>
                            </div>
                        </div>
                    </div>
                    <div className="flex shrink-0 flex-wrap items-center justify-start md:justify-end gap-2 w-full md:w-auto">
                         <Button asChild variant="secondary" className="bg-white/90 text-primary hover:bg-white" disabled={!hasPhone}>
                            <a href={hasPhone ? `https://wa.me/${whatsappPhoneNumber}` : undefined} target="_blank" rel="noopener noreferrer">
                                <MessageSquare />
                                WhatsApp
                            </a>
                        </Button>
                        <Button asChild variant="outline" className="bg-transparent border-white/50 text-white hover:bg-white/10" disabled={!hasPhone}>
                            <a href={hasPhone ? `tel:${lead.phone}` : undefined}>
                                <Phone />
                                Call
                            </a>
                        </Button>
                        <Button asChild variant="outline" className="bg-transparent border-white/50 text-white hover:bg-white/10" disabled={!hasEmail}>
                            <a href={hasEmail ? `mailto:${lead.email}` : undefined}>
                                <Mail />
                                Email
                            </a>
                        </Button>
                        <AIEnrichmentDialog lead={lead}>
                            <Button variant="secondary" className="bg-accent text-accent-foreground hover:bg-accent/90">
                                <Sparkles />
                                Enrich
                            </Button>
                        </AIEnrichmentDialog>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
