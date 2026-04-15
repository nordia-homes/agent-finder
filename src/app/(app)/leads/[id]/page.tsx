import { leads, users, recentActivities } from '@/lib/data';
import { notFound } from 'next/navigation';
import { PageHeader } from '@/components/shared/page-header';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Edit, Mail, MessageSquare, Phone, Plus } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { formatDistanceToNow } from 'date-fns';
import Link from 'next/link';
import { ScoringExplanation } from '@/components/leads/scoring-explanation';
import type { Lead } from '@/lib/types';

const classificationStyles: Record<Lead['classification'], string> = {
  likely_independent: 'bg-green-100 text-green-800 border-green-200',
  possible_independent: 'bg-amber-100 text-amber-800 border-amber-200',
  agency: 'bg-red-100 text-red-800 border-red-200',
};

export default function LeadDetailPage({ params }: { params: { id: string } }) {
  const lead = leads.find((l) => l.id === params.id);

  if (!lead) {
    notFound();
  }

  return (
    <div>
      <PageHeader title={lead.full_name || lead.company_name} description={`Lead from ${lead.source}`}>
        <Button variant="outline" asChild>
          <Link href="/leads">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Leads
          </Link>
        </Button>
        <Button>
          <Edit className="mr-2 h-4 w-4" />
          Edit
        </Button>
      </PageHeader>

      <div className="grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-8">
          <Card>
            <CardHeader>
              <CardTitle className="font-headline">Lead Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div><strong>Email:</strong> <a href={`mailto:${lead.email}`} className="text-primary hover:underline">{lead.email}</a></div>
                <div><strong>Phone:</strong> <a href={`tel:${lead.phone}`} className="text-primary hover:underline">{lead.phone}</a></div>
                <div><strong>Website:</strong> <a href={lead.website} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">{lead.website}</a></div>
                <div><strong>Location:</strong> {lead.city}, {lead.county}</div>
                <div><strong>Listings:</strong> {lead.active_listings_count}</div>
                <div><strong>Source:</strong> {lead.source}</div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="font-headline">Activity Timeline</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {recentActivities.map((activity, index) => (
                  <div key={activity.id} className="relative pl-8">
                    <div className="absolute left-3 top-1.5 h-full border-l"></div>
                     <div className="absolute left-0 top-1.5 transform">
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-muted">
                          {activity.channel === 'email' ? <Mail className="h-4 w-4 text-muted-foreground" /> : <MessageSquare className="h-4 w-4 text-muted-foreground" />}
                        </span>
                      </div>
                    <div className="pl-4">
                      <p className="text-sm font-medium">{activity.description}</p>
                      <p className="text-xs text-muted-foreground">
                        {activity.user.name} &bull; {formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-8">
          <Card>
            <CardHeader>
              <CardTitle className="font-headline">Scoring</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Independent Score</span>
                <span className="text-2xl font-bold font-headline text-primary">{lead.independent_score}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Classification</span>
                <Badge variant="outline" className={cn(classificationStyles[lead.classification], 'capitalize font-medium')}>
                  {lead.classification.replace('_', ' ')}
                </Badge>
              </div>
            </CardContent>
          </Card>
          
          <ScoringExplanation lead={lead} />

          <Card>
            <CardHeader>
              <CardTitle className="font-headline">Owner</CardTitle>
            </CardHeader>
            <CardContent className="flex items-center gap-3">
              <Avatar>
                <AvatarImage src={lead.owner.avatar} alt={lead.owner.name} />
                <AvatarFallback>{lead.owner.name.charAt(0)}</AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium">{lead.owner.name}</p>
                <p className="text-sm text-muted-foreground">Lead Owner</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
