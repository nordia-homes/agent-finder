import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { Lead } from "@/lib/types";
import { Mail, MessageSquare, Phone, MapPin } from "lucide-react";

export function LeadInfoCard({ lead }: { lead: Lead }) {
    return (
        <Card className="bg-gradient-to-br from-primary/90 to-primary text-primary-foreground overflow-hidden">
            <CardContent className="p-6 relative">
                 <div className="absolute inset-0 bg-black/20 mix-blend-multiply"></div>
                 <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center gap-6">
                    <Avatar className="h-24 w-24 border-4 border-white/80 shadow-lg">
                         <AvatarImage src={lead.owner.avatar} alt={lead.full_name} />
                        <AvatarFallback className="text-4xl bg-primary/50 text-white">{lead.full_name ? lead.full_name.charAt(0) : 'L'}</AvatarFallback>
                    </Avatar>
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
                    <div className="flex flex-col sm:flex-row md:flex-col gap-3 self-start md:self-center">
                         <Button variant="secondary" className="bg-white/90 text-primary hover:bg-white">
                            <MessageSquare className="mr-2 h-4 w-4" />
                            WhatsApp
                        </Button>
                        <Button variant="outline" className="bg-transparent border-white/50 text-white hover:bg-white/10">
                            <Phone className="mr-2 h-4 w-4" />
                            Call
                        </Button>
                        <Button variant="outline" className="bg-transparent border-white/50 text-white hover:bg-white/10">
                            <Mail className="mr-2 h-4 w-4" />
                            Email
                        </Button>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
