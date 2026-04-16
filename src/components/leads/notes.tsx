'use client';

import { useState } from 'react';
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
import { users } from '@/lib/data';
import { useToast } from '@/hooks/use-toast';


export function NotesSection({ notes: initialNotes }: { notes: Activity[] }) {
    const [notes, setNotes] = useState<Activity[]>(initialNotes);
    const [newNote, setNewNote] = useState('');
    const { toast } = useToast();

    const handleSaveNote = () => {
        if (!newNote.trim()) {
            toast({
                title: "Note is empty",
                description: "Please write something before saving.",
                variant: "destructive",
            });
            return;
        }

        const noteToAdd: Activity = {
            id: `note-${Date.now()}`,
            lead_name: '', // This is not available but also not needed for the display logic here
            event_type: 'note_added',
            channel: 'system',
            description: newNote,
            timestamp: new Date().toISOString(),
            user: users[0], // Assume current user is the first user from data
        };

        setNotes(prevNotes => [noteToAdd, ...prevNotes]);
        setNewNote('');
        toast({
            title: "Note saved",
            description: "Your note has been successfully added.",
        });
    };

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle className="font-headline text-lg">Add a note</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        <Textarea 
                            placeholder="Write your note here..." 
                            className="bg-background min-h-[100px]"
                            value={newNote}
                            onChange={(e) => setNewNote(e.target.value)}
                         />
                        <Button onClick={handleSaveNote}>Save Note</Button>
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
