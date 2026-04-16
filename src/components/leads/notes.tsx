'use client';

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { formatDistanceToNow } from "date-fns";
import type { Activity } from "@/lib/types";

export function NotesSection({ notes }: { notes: Activity[] }) {
    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle className="font-headline text-lg">Add a note</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        <Textarea placeholder="Write your note here..." className="bg-background min-h-[100px]" />
                        <Button>Save Note</Button>
                    </div>
                </CardContent>
            </Card>

            {notes.length > 0 ? (
                <div>
                     <h3 className="text-base font-medium mb-4 font-headline">Recent Notes</h3>
                     <Accordion type="single" collapsible className="w-full space-y-2">
                        {notes.map(note => (
                            <AccordionItem value={note.id} key={note.id} className="bg-card border rounded-lg data-[state=open]:shadow-md">
                                <AccordionTrigger className="px-4 py-3 hover:no-underline">
                                    <div className="flex items-center gap-3 text-left">
                                        <Avatar className="h-7 w-7">
                                            <AvatarImage src={note.user.avatar} alt={note.user.name} />
                                            <AvatarFallback>{note.user.name.charAt(0)}</AvatarFallback>
                                        </Avatar>
                                        <div>
                                            <p className="text-sm font-medium">Note by {note.user.name}</p>
                                             <p className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(note.timestamp), { addSuffix: true })}</p>
                                        </div>
                                    </div>
                                </AccordionTrigger>
                                <AccordionContent className="px-4 pb-4">
                                    <div className="prose prose-sm max-w-none text-foreground/80 dark:prose-invert">
                                     {note.description}
                                    </div>
                                </AccordionContent>
                            </AccordionItem>
                        ))}
                    </Accordion>
                </div>
            ): (
                 <Card className="mt-6">
                    <CardContent className="pt-6 text-center text-muted-foreground">
                        <p>No notes for this lead yet.</p>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
