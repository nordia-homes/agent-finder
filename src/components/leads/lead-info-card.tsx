import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { Lead } from "@/lib/types";
import { Mail, MessageSquare, Phone, MapPin } from "lucide-react";

export function LeadInfoCard({ lead }: { lead: Lead }) {
    return (
        <Card>
            <CardContent className="p-6">
                <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
                    <Avatar className="h-20 w-20 border-2 border-primary">
                         <AvatarImage src={lead.owner.avatar} alt={lead.full_name} />
                        <AvatarFallback>{lead.full_name ? lead.full_name.charAt(0) : 'L'}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                        <h1 className="text-2xl font-bold font-headline text-primary tracking-tight">{lead.full_name || lead.company_name}</h1>
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-muted-foreground mt-2 text-sm">
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
                    <div className="flex gap-2 self-start md:self-center">
                         <Button>
                            <MessageSquare className="mr-2 h-4 w-4" />
                            WhatsApp
                        </Button>
                        <Button variant="outline">
                            <Phone className="mr-2 h-4 w-4" />
                            Call
                        </Button>
                        <Button variant="outline">
                            <Mail className="mr-2 h-4 w-4" />
                            Email
                        </Button>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
