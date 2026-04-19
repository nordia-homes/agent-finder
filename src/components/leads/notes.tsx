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
import { useToast } from '@/hooks/use-toast';
import { useFirestore, useUser } from '@/firebase';
import { collection, addDoc, Timestamp } from 'firebase/firestore';


export function NotesSection({ notes, leadId, leadName }: { notes: Activity[], leadId: string, leadName: string }) {
    const [newNote, setNewNote] = useState('');
    const { toast } = useToast();
    const firestore = useFirestore();
    const { user } = useUser();

    const handleSaveNote = async () => {
        if (!newNote.trim()) {
            toast({
                title: "Note is empty",
                description: "Please write something before saving.",
                variant: "destructive",
            });
            return;
        }

        if (!firestore || !user) {
            toast({ title: "Error", description: "You must be logged in to add a note.", variant: "destructive" });
            return;
        }

        try {
            await addDoc(collection(firestore, 'activities'), {
                lead_id: leadId,
                lead_name: leadName,
                event_type: 'note_added',
                channel: 'system',
                description: newNote,
                timestamp: Timestamp.now(),
                user_id: user.uid,
                user_name: user.displayName,
                user_avatar: user.photoURL,
            });

            setNewNote('');
            toast({
                title: "Note saved",
                description: "Your note has been successfully added.",
            });

        } catch (error) {
            console.error("Error adding note:", error);
            toast({
                title: "Error saving note",
                description: "There was a problem saving your note.",
                variant: "destructive",
            });
        }
    };

    return (
        <div className="space-y-6">
            <Card className="overflow-hidden rounded-[28px] border border-[#d8deea] bg-[linear-gradient(180deg,_rgba(255,255,255,0.98),_rgba(245,248,252,0.98))] shadow-[0_18px_36px_rgba(33,51,84,0.08)]">
                <CardHeader className="border-b border-[#e5ebf4]">
                    <CardTitle className="font-headline text-lg text-[#172033]">Add a note</CardTitle>
                </CardHeader>
                <CardContent className="pt-6">
                    <div className="space-y-4">
                        <Textarea 
                            placeholder="Write your note here..." 
                            className="min-h-[120px] border-[#d8deea] bg-white text-[#1b2435] shadow-sm"
                            value={newNote}
                            onChange={(e) => setNewNote(e.target.value)}
                         />
                        <Button className="rounded-[18px] bg-[#536591] text-white hover:bg-[#46567b]" onClick={handleSaveNote}>Save Note</Button>
                    </div>
                </CardContent>
            </Card>

            {notes.length > 0 ? (
                <div>
                     <h3 className="mb-4 text-base font-medium font-headline text-[#172033]">Recent Notes</h3>
                     <Accordion type="single" collapsible className="w-full space-y-2">
                        {notes.map(note => (
                            <AccordionItem value={note.id} key={note.id} className="rounded-[22px] border border-[#d8deea] bg-[linear-gradient(180deg,_rgba(255,255,255,0.98),_rgba(245,248,252,0.98))] px-1 data-[state=open]:shadow-[0_16px_34px_rgba(33,51,84,0.10)]">
                                <AccordionTrigger className="px-4 py-4 hover:no-underline">
                                    <div className="flex items-center gap-3 text-left">
                                        <Avatar className="h-7 w-7">
                                            <AvatarImage src={note.user_avatar || ''} alt={note.user_name} />
                                            <AvatarFallback>{note.user_name.charAt(0)}</AvatarFallback>
                                        </Avatar>
                                        <div>
                                            <p className="text-sm font-medium text-[#172033]">Note by {note.user_name}</p>
                                             <p className="text-xs text-[#7c89a1]">{formatDistanceToNow(note.timestamp.toDate(), { addSuffix: true })}</p>
                                        </div>
                                    </div>
                                </AccordionTrigger>
                                <AccordionContent className="px-4 pb-4">
                                    <div className="prose prose-sm max-w-none text-[#465670]">
                                     {note.description}
                                    </div>
                                </AccordionContent>
                            </AccordionItem>
                        ))}
                    </Accordion>
                </div>
            ): (
                 <Card className="mt-6 rounded-[24px] border border-dashed border-[#d8deea] bg-white/70">
                    <CardContent className="pt-6 text-center text-[#7c89a1]">
                        <p>No notes for this lead yet.</p>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
