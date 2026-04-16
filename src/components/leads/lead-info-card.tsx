import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { Lead } from "@/lib/types";
import { Mail, MessageSquare, Phone, MapPin } from "lucide-react";

export function LeadInfoCard({ lead }: { lead: Lead }) {
    const whatsappPhoneNumber = lead.phone.replace(/[^0-9]/g, '');

    return (
        <Card className="bg-gradient-to-br from-primary/90 to-primary text-primary-foreground overflow-hidden">
            <CardContent className="p-6 relative">
                 <div className="absolute inset-0 bg-black/20 mix-blend-multiply"></div>
                 <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
                    <div className="flex-1">
                        <h1 className="text-3xl font-bold font-headline tracking-tight text-white shadow-sm">{lead.full_name || lead.company_name}</h1>
                        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-white/80 mt-2 text-sm">
                            <div className="flex items-center gap-2">
                                <MapPin className="h-4 w-4" />
                                <span>{lead.city}, {lead.county}</span>
                            </div>
                             <div className="flex items-center gap-2">
                                <Phone className="h-4 w-4" />
                                <span>{lead.phone}</span>
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                         <Button asChild variant="secondary" className="bg-white/90 text-primary hover:bg-white">
                            <a href={`https://wa.me/${whatsappPhoneNumber}`} target="_blank" rel="noopener noreferrer">
                                <MessageSquare className="mr-2 h-4 w-4" />
                                WhatsApp
                            </a>
                        </Button>
                        <Button asChild variant="outline" className="bg-transparent border-white/50 text-white hover:bg-white/10">
                            <a href={`tel:${lead.phone}`}>
                                <Phone className="mr-2 h-4 w-4" />
                                Call
                            </a>
                        </Button>
                        <Button asChild variant="outline" className="bg-transparent border-white/50 text-white hover:bg-white/10">
                            <a href={`mailto:${lead.email}`}>
                                <Mail className="mr-2 h-4 w-4" />
                                Email
                            </a>
                        </Button>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
