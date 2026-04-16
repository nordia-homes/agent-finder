'use client';

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
  SheetClose
} from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { Import } from "@/lib/types";
import { format } from "date-fns";
import { CheckCircle, XCircle, Copy, Briefcase, Globe, AtSign, Database, List, Calendar, Hash, Phone, MapPin, FileText, Star, Euro, Image as ImageIcon } from "lucide-react";
import { ScrollArea } from "../ui/scroll-area";


interface IntakeDetailDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedImport: Import | null;
  onApprove: (imp: Import) => void;
  onReject: (id: string) => void;
  onMarkDuplicate: (id: string) => void;
}

const DetailItem = ({ label, value, icon: Icon, isUrl = false }: { label: string; value?: React.ReactNode, icon: React.ElementType, isUrl?: boolean }) => {
    if (!value && value !== 0) return null;
    return (
        <div className="flex items-start gap-3">
            <Icon className="h-4 w-4 text-muted-foreground mt-1 flex-shrink-0" />
            <div>
                <p className="text-xs text-muted-foreground">{label}</p>
                <div className={cn("font-medium text-sm", isUrl && "truncate")}>{value}</div>
            </div>
        </div>
    );
};

const classificationStyles: Record<NonNullable<Import['classification']>, string> = {
  likely_independent: 'bg-green-100 text-green-800 border-green-200',
  possible_independent: 'bg-amber-100 text-amber-800 border-amber-200',
  agency: 'bg-red-100 text-red-800 border-red-200',
};

const reviewStatusStyles: Record<Import['review_status'], string> = {
  pending_review: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  approved: 'bg-blue-100 text-blue-800 border-blue-200',
  rejected: 'bg-red-100 text-red-800 border-red-200',
  duplicate: 'bg-gray-100 text-gray-800 border-gray-200',
};

const phoneStatusStyles: Record<NonNullable<Import['phone_status']>, string> = {
  found: 'bg-green-100 text-green-800 border-green-200',
  missing: 'bg-gray-100 text-gray-800 border-gray-200',
  not_found: 'bg-gray-100 text-gray-800 border-gray-200',
  click_failed: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  challenge_detected: 'bg-amber-100 text-amber-800 border-amber-200',
  partial_visible: 'bg-orange-100 text-orange-800 border-orange-200',
};


export function IntakeDetailDrawer({ open, onOpenChange, selectedImport, onApprove, onReject, onMarkDuplicate }: IntakeDetailDrawerProps) {
  if (!selectedImport) return null;

  const {
      id,
      full_name,
      company_name,
      address,
      city,
      county,
      phone,
      phone_prefix,
      phone_status,
      email,
      website,
      image_url,
      description,
      source,
      source_url,
      active_listings_count,
      sales_count,
      rent_count,
      sales_price_from,
      sales_price_to,
      rent_price_from,
      rent_price_to,
      independent_score,
      classification,
      review_status,
      importedAt,
      listed_since,
      jobId,
      pageNumber,
      pageUrl,
      seller_id,
  } = selectedImport;

  const name = company_name || full_name;
  
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-lg p-0 flex flex-col">
        <SheetHeader className="p-6">
          <SheetTitle className="font-headline text-2xl">{name}</SheetTitle>
          <SheetDescription>{email}</SheetDescription>
        </SheetHeader>
        <div className="flex items-center gap-4 px-6 pb-4">
             {classification && <Badge variant="outline" className={cn(classificationStyles[classification], 'font-medium capitalize')}>
                {classification.replace('_', ' ')}
            </Badge>}
            <Badge variant="outline" className={cn(reviewStatusStyles[review_status], 'capitalize font-medium')}>
                {review_status.replace('_', ' ')}
            </Badge>
        </div>
        <Separator />
        <ScrollArea className="flex-1">
            <div className="grid grid-cols-1 gap-5 p-6">
                <DetailItem label="Full Name" value={full_name} icon={Briefcase} />
                <DetailItem label="Company Name" value={company_name} icon={Briefcase} />
                <DetailItem label="Address" value={address} icon={MapPin} />
                <DetailItem label="Location" value={city && county ? `${city}, ${county}` : city} icon={MapPin} />
                <DetailItem label="Phone" value={phone ? phone : (phone_prefix ? `${phone_prefix}...` : null)} icon={Phone} />
                <DetailItem label="Phone Status" value={phone_status ? <Badge variant="outline" className={cn(phoneStatusStyles[phone_status], 'font-medium capitalize')}>{phone_status.replace(/_/g, ' ')}</Badge> : null} icon={Phone} />
                <DetailItem label="Email" value={email ? <a href={`mailto:${email}`} className="text-primary hover:underline">{email}</a> : '-'} icon={AtSign} />
                <DetailItem label="Website" value={website ? <a href={website} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">{website}</a> : '-'} icon={Globe} />
                <DetailItem label="Image URL" value={image_url ? <a href={image_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline truncate block">{image_url}</a> : '-'} icon={ImageIcon} isUrl />
                <DetailItem label="Description" value={description} icon={FileText} />
                <Separator />
                 <DetailItem label="Source" value={source ? <a href={source_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline capitalize">{source.replace(/_/g, ' ')}</a> : '-'} icon={Database} />
                <DetailItem label="Listings for Sale" value={sales_count} icon={List} />
                <DetailItem label="Sale Price Range" value={sales_price_from && sales_price_to ? `${sales_price_from.toLocaleString()} - ${sales_price_to.toLocaleString()} €` : '-'} icon={Euro} />
                <DetailItem label="Listings for Rent" value={rent_count} icon={List} />
                <DetailItem label="Rent Price Range" value={rent_price_from && rent_price_to ? `${rent_price_from.toLocaleString()} - ${rent_price_to.toLocaleString()} €` : '-'} icon={Euro} />
                <DetailItem label="Active Listings (Total)" value={active_listings_count} icon={List} />
                <DetailItem label="Independent Score" value={independent_score} icon={Star} />
                <Separator />
                <DetailItem label="Listed Since" value={listed_since} icon={Calendar} />
                <DetailItem label="Imported At" value={importedAt ? format(new Date(importedAt), 'PPP p') : '-'} icon={Calendar} />
                <DetailItem label="Seller ID" value={seller_id} icon={Hash} />
                <DetailItem label="Job ID" value={jobId} icon={Hash} />
                <DetailItem label="Source Page Number" value={pageNumber} icon={Hash} />
                <DetailItem label="Source Page URL" value={pageUrl ? <a href={pageUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">{pageUrl}</a> : '-'} icon={Globe} isUrl />
            </div>
        </ScrollArea>
        <SheetFooter className="p-4 bg-muted/50 border-t mt-auto">
          <div className="flex w-full gap-2">
            <SheetClose asChild>
                <Button variant="outline">Close</Button>
            </SheetClose>
            {review_status === 'pending_review' && (
                <>
                    <Button variant="destructive" onClick={() => onReject(id)}><XCircle className="mr-2 h-4 w-4" />Reject</Button>
                    <Button variant="secondary" onClick={() => onMarkDuplicate(id)}><Copy className="mr-2 h-4 w-4" />Duplicate</Button>
                    <Button className="flex-1" onClick={() => onApprove(selectedImport)}><CheckCircle className="mr-2 h-4 w-4" />Approve to CRM</Button>
                </>
            )}
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
