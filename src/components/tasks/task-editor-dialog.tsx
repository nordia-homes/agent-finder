'use client';

import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { addDoc, collection, doc, Timestamp, updateDoc } from 'firebase/firestore';
import { CalendarIcon, Loader2 } from 'lucide-react';
import { endOfDay, format } from 'date-fns';

import { useCollection, useFirestore, useUser } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import type { Lead, Task } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { taskTypes, TASK_TYPE_META } from '@/components/tasks/task-meta';

const taskFormSchema = z.object({
  lead_id: z.string().min(1, 'Please select a lead.'),
  type: z.enum(taskTypes, {
    required_error: 'Please select a task type.',
  }),
  due_date: z.date({
    required_error: 'A due date is required.',
  }),
});

type TaskFormValues = z.infer<typeof taskFormSchema>;

type TaskEditorDialogProps = {
  mode: 'create' | 'edit';
  task?: Task;
  leadId?: string;
  leadName?: string;
  leads?: Lead[];
  children: React.ReactNode;
};

function getSafeDate(input: Task['due_date'] | Task['completed_at'] | null | undefined) {
  if (!input || typeof input.toDate !== 'function') {
    return new Date();
  }

  try {
    return input.toDate();
  } catch {
    return new Date();
  }
}

export function TaskEditorDialog({ mode, task, leadId, leadName, leads: leadsProp, children }: TaskEditorDialogProps) {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const firestore = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();

  const leadsQuery = useMemo(() => {
    if (leadsProp) return null;
    if (!firestore || !user) return null;
    return collection(firestore, 'leads');
  }, [firestore, leadsProp, user]);

  const { data: leads } = useCollection<Lead>(leadsQuery);

  const availableLeads = useMemo(() => {
    return [...(leadsProp || leads || [])]
      .filter((lead) => !lead.archived_at && lead.lead_status !== 'merged')
      .sort((a, b) => {
        const left = (a.full_name || a.company_name || '').trim().toLowerCase();
        const right = (b.full_name || b.company_name || '').trim().toLowerCase();
        return left.localeCompare(right);
      });
  }, [leads, leadsProp]);

  const defaultLeadId = task?.lead_id || leadId || '';
  const defaultLeadName = task?.lead_name || leadName || '';

  const form = useForm<TaskFormValues>({
    resolver: zodResolver(taskFormSchema),
    defaultValues: {
      lead_id: defaultLeadId,
      type: task?.type ?? 'follow_up',
      due_date: task ? getSafeDate(task.due_date) : new Date(),
    },
  });

  useEffect(() => {
    if (!open) return;

    form.reset({
      lead_id: task?.lead_id || leadId || '',
      type: task?.type ?? 'follow_up',
      due_date: task ? getSafeDate(task.due_date) : new Date(),
    });
  }, [form, leadId, open, task]);

  const selectedLeadId = form.watch('lead_id');
  const selectedLead = availableLeads.find((lead) => lead.id === selectedLeadId);
  const selectedLeadName = selectedLead?.full_name || selectedLead?.company_name || defaultLeadName;

  const onSubmit = async (data: TaskFormValues) => {
    if (!firestore || !user) {
      toast({ title: 'Error', description: 'Not authenticated.', variant: 'destructive' });
      return;
    }

    const resolvedLead = availableLeads.find((lead) => lead.id === data.lead_id);
    const resolvedLeadName = resolvedLead?.full_name || resolvedLead?.company_name || leadName || task?.lead_name;

    if (!resolvedLeadName) {
      toast({ title: 'Error', description: 'Could not resolve the selected lead.', variant: 'destructive' });
      return;
    }

    setIsSubmitting(true);

    try {
      if (mode === 'create') {
        await addDoc(collection(firestore, 'tasks'), {
          lead_id: data.lead_id,
          lead_name: resolvedLeadName,
          owner_id: user.uid,
          type: data.type,
          due_date: Timestamp.fromDate(data.due_date),
          is_overdue: endOfDay(data.due_date) < new Date(),
          completed: false,
          completed_at: null,
          created_at: Timestamp.now(),
        });

        toast({
          title: 'Task created',
          description: `A new ${TASK_TYPE_META[data.type].label.toLowerCase()} task was created for ${resolvedLeadName}.`,
        });
      } else if (task) {
        await updateDoc(doc(firestore, 'tasks', task.id), {
          lead_id: data.lead_id,
          lead_name: resolvedLeadName,
          type: data.type,
          due_date: Timestamp.fromDate(data.due_date),
          is_overdue: !task.completed && endOfDay(data.due_date) < new Date(),
        });

        toast({
          title: 'Task updated',
          description: `${resolvedLeadName} was updated with the new schedule.`,
        });
      }

      setOpen(false);
    } catch (error) {
      console.error('Error saving task:', error);
      toast({
        title: 'Error',
        description: mode === 'create' ? 'Failed to create task.' : 'Failed to update task.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-w-xl rounded-[28px] border border-[#d9dfeb] bg-[linear-gradient(180deg,_rgba(255,255,255,0.99),_rgba(245,248,253,0.99))] p-0 shadow-[0_30px_80px_rgba(33,51,84,0.18)]">
        <div className="p-6 sm:p-7">
          <DialogHeader className="text-left">
            <DialogTitle className="text-2xl font-semibold tracking-[-0.04em] text-[#152033]">
              {mode === 'create' ? 'Add task' : 'Edit task'}
            </DialogTitle>
            <DialogDescription className="mt-2 text-sm leading-6 text-[#667691]">
              {mode === 'create'
                ? 'Create a task directly from the tasks board and attach it to any active lead.'
                : 'Reprogram the due date or adjust the task details without leaving this list.'}
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="mt-6 space-y-5">
              <FormField
                control={form.control}
                name="lead_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#7d8aa3]">Lead</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value} disabled={Boolean(leadId && leadName)}>
                      <FormControl>
                        <SelectTrigger className="h-12 rounded-[18px] border-[#d6e0ed] bg-white/92">
                          <SelectValue placeholder="Select a lead" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="max-h-80 rounded-[18px] border-[#d6e0ed] bg-white/95">
                        {leadId && leadName ? (
                          <SelectItem value={leadId}>{leadName}</SelectItem>
                        ) : (
                          availableLeads.map((lead) => {
                            const name = lead.full_name || lead.company_name;
                            return (
                              <SelectItem key={lead.id} value={lead.id}>
                                {name}
                              </SelectItem>
                            );
                          })
                        )}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#7d8aa3]">Task type</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="h-12 rounded-[18px] border-[#d6e0ed] bg-white/92">
                          <SelectValue placeholder="Select a task type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="rounded-[18px] border-[#d6e0ed] bg-white/95">
                        {taskTypes.map((type) => (
                          <SelectItem key={type} value={type}>
                            {TASK_TYPE_META[type].label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="due_date"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#7d8aa3]">Due date</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={cn(
                              'h-12 rounded-[18px] border-[#d6e0ed] bg-white/92 pl-4 text-left font-normal',
                              !field.value && 'text-muted-foreground'
                            )}
                          >
                            {field.value ? format(field.value, 'PPP') : <span>Pick a date</span>}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto rounded-[20px] border-[#d6e0ed] p-0" align="start">
                        <Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="rounded-[22px] border border-[#d8deea] bg-white/80 px-4 py-3 text-sm text-[#667691] shadow-[0_10px_24px_rgba(33,51,84,0.05)]">
                {selectedLeadName ? (
                  <span>
                    This task will be attached to <span className="font-semibold text-[#152033]">{selectedLeadName}</span>.
                  </span>
                ) : (
                  'Pick a lead to attach this task.'
                )}
              </div>

              <DialogFooter className="gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  className="rounded-full border-[#d6e0ed] bg-white/90"
                  onClick={() => setOpen(false)}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="rounded-full bg-[#152033] px-5 text-white shadow-[0_14px_30px_rgba(21,32,51,0.18)] hover:bg-[#101827]"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  {mode === 'create' ? 'Save task' : 'Save changes'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
