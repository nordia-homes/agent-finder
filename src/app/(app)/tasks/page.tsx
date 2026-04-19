'use client';

import Link from 'next/link';
import { useDeferredValue, useMemo, useState, useTransition } from 'react';
import { addDays, differenceInCalendarDays, endOfDay, format, isSameDay, startOfDay } from 'date-fns';
import { collection, doc, query, updateDoc, where, serverTimestamp } from 'firebase/firestore';
import {
  AlarmClock,
  ArrowRight,
  CheckCheck,
  CheckCircle2,
  CircleDashed,
  Clock3,
  Edit3,
  ExternalLink,
  PlusCircle,
  Search,
  SlidersHorizontal,
  Sparkles,
} from 'lucide-react';

import { useCollection, useFirestore, useUser } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import type { Lead, Task } from '@/lib/types';
import { cn } from '@/lib/utils';
import { KpiCard } from '@/components/dashboard/kpi-card';
import { TaskEditorDialog } from '@/components/tasks/task-editor-dialog';
import { TASK_TYPE_META } from '@/components/tasks/task-meta';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

type StatusFilter = 'all' | 'open' | 'today' | 'upcoming' | 'overdue' | 'completed';
type TypeFilter = 'all' | Task['type'];
type SortOption = 'due_asc' | 'due_desc' | 'lead_asc' | 'type_asc' | 'created_desc';

const STATUS_OPTIONS: Array<{ value: StatusFilter; label: string }> = [
  { value: 'all', label: 'All tasks' },
  { value: 'open', label: 'Open' },
  { value: 'today', label: 'Due today' },
  { value: 'upcoming', label: 'Upcoming' },
  { value: 'overdue', label: 'Overdue' },
  { value: 'completed', label: 'Completed' },
];

const TYPE_OPTIONS: Array<{ value: TypeFilter; label: string }> = [
  { value: 'all', label: 'All types' },
  { value: 'call', label: 'Call' },
  { value: 'follow_up', label: 'Follow up' },
  { value: 'demo', label: 'Demo' },
  { value: 'review', label: 'Review' },
  { value: 'reply_check', label: 'Reply check' },
];

const SORT_OPTIONS: Array<{ value: SortOption; label: string }> = [
  { value: 'due_asc', label: 'Due date: soonest first' },
  { value: 'due_desc', label: 'Due date: latest first' },
  { value: 'lead_asc', label: 'Lead name: A to Z' },
  { value: 'type_asc', label: 'Task type' },
  { value: 'created_desc', label: 'Newest created' },
];

function getTaskDate(task: Task) {
  return task.due_date.toDate();
}

function getTaskCreatedAtMs(task: Task) {
  if (!task.created_at || typeof task.created_at.toDate !== 'function') return 0;

  try {
    return task.created_at.toDate().getTime();
  } catch {
    return 0;
  }
}

function isTaskOverdue(task: Task, now: Date) {
  return !task.completed && endOfDay(getTaskDate(task)) < now;
}

function isTaskDueToday(task: Task, now: Date) {
  return !task.completed && isSameDay(getTaskDate(task), now);
}

function getTaskTimingLabel(task: Task, now: Date) {
  const taskDate = getTaskDate(task);

  if (task.completed) {
    return task.completed_at ? `Completed ${format(task.completed_at.toDate(), 'MMM d')}` : 'Completed';
  }

  if (isTaskDueToday(task, now)) {
    return 'Due today';
  }

  const dayDelta = differenceInCalendarDays(startOfDay(taskDate), startOfDay(now));

  if (dayDelta < 0) {
    return `${Math.abs(dayDelta)}d overdue`;
  }

  if (dayDelta === 1) {
    return 'Due tomorrow';
  }

  return `Due in ${dayDelta}d`;
}

export default function TasksPage() {
  const firestore = useFirestore();
  const { user, loading: userLoading } = useUser();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('open');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [sortBy, setSortBy] = useState<SortOption>('due_asc');
  const [isPending, startTransition] = useTransition();

  const tasksQuery = useMemo(() => {
    if (!firestore || !user) return null;
    return query(collection(firestore, 'tasks'), where('owner_id', '==', user.uid));
  }, [firestore, user]);

  const leadsQuery = useMemo(() => {
    if (!firestore || !user) return null;
    return collection(firestore, 'leads');
  }, [firestore, user]);

  const { data: tasks, loading: tasksLoading } = useCollection<Task>(tasksQuery);
  const { data: leads, loading: leadsLoading } = useCollection<Lead>(leadsQuery);
  const deferredSearch = useDeferredValue(searchQuery.trim().toLowerCase());

  const now = useMemo(() => new Date(), [tasks]);

  const stats = useMemo(() => {
    const list = tasks || [];
    const overdue = list.filter((task) => isTaskOverdue(task, now)).length;
    const dueToday = list.filter((task) => isTaskDueToday(task, now)).length;
    const open = list.filter((task) => !task.completed).length;
    const completed = list.filter((task) => task.completed).length;
    const completionRate = list.length === 0 ? 0 : Math.round((completed / list.length) * 100);

    return { overdue, dueToday, open, completed, completionRate };
  }, [now, tasks]);

  const filteredTasks = useMemo(() => {
    return (tasks || [])
      .filter((task) => {
        const searchableText = [task.lead_name, TASK_TYPE_META[task.type].label].join(' ').toLowerCase();
        const matchesSearch = !deferredSearch || searchableText.includes(deferredSearch);
        const matchesType = typeFilter === 'all' || task.type === typeFilter;

        const overdue = isTaskOverdue(task, now);
        const dueToday = isTaskDueToday(task, now);
        const upcoming = !task.completed && !overdue && !dueToday;

        const matchesStatus =
          statusFilter === 'all' ||
          (statusFilter === 'open' && !task.completed) ||
          (statusFilter === 'today' && dueToday) ||
          (statusFilter === 'upcoming' && upcoming) ||
          (statusFilter === 'overdue' && overdue) ||
          (statusFilter === 'completed' && task.completed);

        return matchesSearch && matchesType && matchesStatus;
      })
      .sort((a, b) => {
        const completeDelta = Number(a.completed) - Number(b.completed);
        if (completeDelta !== 0) return completeDelta;

        switch (sortBy) {
          case 'due_desc':
            return getTaskDate(b).getTime() - getTaskDate(a).getTime();
          case 'lead_asc':
            return a.lead_name.localeCompare(b.lead_name);
          case 'type_asc':
            return TASK_TYPE_META[a.type].label.localeCompare(TASK_TYPE_META[b.type].label);
          case 'created_desc':
            return getTaskCreatedAtMs(b) - getTaskCreatedAtMs(a);
          case 'due_asc':
          default:
            return getTaskDate(a).getTime() - getTaskDate(b).getTime();
        }
      });
  }, [deferredSearch, now, sortBy, statusFilter, tasks, typeFilter]);

  const focusLists = useMemo(() => {
    const openTasks = filteredTasks.filter((task) => !task.completed);
    return {
      overdue: openTasks.filter((task) => isTaskOverdue(task, now)).slice(0, 4),
      today: openTasks.filter((task) => isTaskDueToday(task, now)).slice(0, 4),
      nextUp: openTasks
        .filter((task) => {
          const dueDate = getTaskDate(task);
          return !isTaskOverdue(task, now) && dueDate > endOfDay(now) && dueDate <= endOfDay(addDays(now, 7));
        })
        .slice(0, 4),
    };
  }, [filteredTasks, now]);

  const activeLeads = useMemo(() => {
    return [...(leads || [])]
      .filter((lead) => !lead.archived_at && lead.lead_status !== 'merged')
      .sort((a, b) => {
        const left = (a.full_name || a.company_name || '').trim().toLowerCase();
        const right = (b.full_name || b.company_name || '').trim().toLowerCase();
        return left.localeCompare(right);
      });
  }, [leads]);

  const isLoading = userLoading || tasksLoading || leadsLoading;
  const activeFilterCount = [searchQuery.trim(), statusFilter !== 'all', typeFilter !== 'all', sortBy !== 'due_asc'].filter(Boolean).length;

  const handleCompleteTask = async (task: Task) => {
    if (!firestore) return;

    startTransition(async () => {
      try {
        await updateDoc(doc(firestore, 'tasks', task.id), {
          completed: true,
          completed_at: serverTimestamp(),
          is_overdue: false,
        });

        toast({
          title: 'Task completed',
          description: `${TASK_TYPE_META[task.type].label} for ${task.lead_name} was marked as done.`,
        });
      } catch (error) {
        console.error('Failed to complete task:', error);
        toast({
          title: 'Update failed',
          description: 'The task could not be marked as completed.',
          variant: 'destructive',
        });
      }
    });
  };

  return (
    <div className="space-y-8">
      <div className="rounded-[34px] border border-[#d9dfeb] bg-[linear-gradient(135deg,_rgba(255,255,255,0.98),_rgba(242,247,253,0.98)_58%,_rgba(248,251,255,0.98))] px-8 py-7 shadow-[0_22px_60px_rgba(33,51,84,0.08)]">
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 rounded-full border border-[#d7deeb] bg-white/85 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-[#61739a] shadow-[0_8px_20px_rgba(33,51,84,0.06)]">
                <Sparkles className="h-3.5 w-3.5" />
                Follow-up workspace
              </div>
              <div>
                <h1 className="text-4xl font-semibold tracking-[-0.05em] text-[#152033]">Tasks</h1>
                <p className="mt-3 max-w-3xl text-base leading-7 text-[#667691]">
                  Keep follow-ups moving, recover overdue work, and close the loop on every lead action in one place.
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <TaskEditorDialog mode="create" leads={activeLeads}>
                <Button className="rounded-full bg-[#415782] px-5 text-white shadow-[0_14px_30px_rgba(47,66,104,0.22)] hover:bg-[#384d75]">
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Add task
                </Button>
              </TaskEditorDialog>
              <Button asChild variant="outline" className="rounded-full border-[#d6e0ed] bg-white/90 px-5 shadow-[0_12px_24px_rgba(33,51,84,0.06)]">
                <Link href="/leads">
                  Open leads
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <KpiCard
              eyebrow="Pipeline"
              title="Open tasks"
              value={isLoading ? '...' : String(stats.open)}
              icon={<CircleDashed className="h-5 w-5" />}
              meta={!isLoading ? `${stats.completionRate}% completion rate` : ' '}
              description="Tasks still active across your leads."
              className="bg-[linear-gradient(180deg,_rgba(255,255,255,0.98),_rgba(244,248,253,0.98))]"
            />
            <KpiCard
              eyebrow="Today"
              title="Due today"
              value={isLoading ? '...' : String(stats.dueToday)}
              icon={<Clock3 className="h-5 w-5" />}
              meta={!isLoading ? `${stats.dueToday} scheduled for today` : ' '}
              description="Work that should be cleared before the day closes."
              className="bg-[linear-gradient(180deg,_rgba(255,255,255,0.98),_rgba(244,249,255,0.98))]"
            />
            <KpiCard
              eyebrow="Attention"
              title="Overdue"
              value={isLoading ? '...' : String(stats.overdue)}
              icon={<AlarmClock className="h-5 w-5" />}
              meta={!isLoading ? `${stats.overdue} need recovery` : ' '}
              metaType={stats.overdue > 0 ? 'negative' : 'neutral'}
              description="Tasks already past their due date."
              className="bg-[linear-gradient(180deg,_rgba(255,255,255,0.98),_rgba(253,246,246,0.98))]"
            />
            <KpiCard
              eyebrow="Closed loop"
              title="Completed"
              value={isLoading ? '...' : String(stats.completed)}
              icon={<CheckCheck className="h-5 w-5" />}
              meta={!isLoading ? `${stats.completed} finished items` : ' '}
              metaType="positive"
              description="Tasks already checked off in this workspace."
              className="bg-[linear-gradient(180deg,_rgba(255,255,255,0.98),_rgba(245,251,247,0.98))]"
            />
          </div>
        </div>
      </div>

      <div className="grid gap-8 xl:grid-cols-[minmax(0,1.5fr)_380px]">
        <div className="space-y-6">
          <div className="relative overflow-hidden rounded-[34px] border border-[#d9dfeb] bg-[linear-gradient(135deg,_rgba(255,255,255,0.98),_rgba(241,246,253,0.98)_62%,_rgba(248,251,255,0.98))] p-6 shadow-[0_22px_60px_rgba(33,51,84,0.08)]">
            <div className="absolute inset-x-0 top-0 h-36 bg-[radial-gradient(circle_at_top_left,_rgba(86,121,180,0.18),_transparent_42%),radial-gradient(circle_at_top_right,_rgba(165,188,225,0.16),_transparent_34%)]" />
            <div className="relative space-y-5">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                <div>
                  <h2 className="text-3xl font-semibold tracking-[-0.05em] text-[#152033]">Task board</h2>
                  <p className="mt-2 max-w-3xl text-sm leading-6 text-[#667691]">
                    Search by lead, narrow by status and type, then sort the queue the way you want to work through it.
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2 text-sm text-[#5c6f90]">
                  <div className="inline-flex items-center gap-2 rounded-full border border-white/90 bg-white/92 px-4 py-2 shadow-[0_12px_30px_rgba(33,51,84,0.08)]">
                    <SlidersHorizontal className="h-4 w-4" />
                    <span>{activeFilterCount === 0 ? 'Default view' : `${activeFilterCount} active controls`}</span>
                  </div>
                  <div className="inline-flex items-center gap-2 rounded-full border border-white/90 bg-white/92 px-4 py-2 shadow-[0_12px_30px_rgba(33,51,84,0.08)]">
                    <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#7d8aa3]">Showing</span>
                    <span className="text-base font-semibold text-[#152033]">{isLoading ? '...' : filteredTasks.length}</span>
                  </div>
                </div>
              </div>

              <div className="rounded-[28px] border border-white/80 bg-[linear-gradient(145deg,_rgba(255,255,255,0.9),_rgba(245,249,255,0.82))] p-5 shadow-[0_20px_45px_rgba(33,51,84,0.08)] backdrop-blur-md">
                <div className="flex flex-col gap-4">
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#7083a8]" />
                    <Input
                      value={searchQuery}
                      onChange={(event) => setSearchQuery(event.target.value)}
                      placeholder="Search by lead name or task type..."
                      className="h-14 rounded-[22px] border-white/90 bg-[linear-gradient(145deg,_rgba(255,255,255,0.96),_rgba(246,249,255,0.96))] pl-12 pr-4 text-sm text-[#152033] shadow-[0_14px_30px_rgba(33,51,84,0.07)] placeholder:text-[#7d8aa3] focus-visible:ring-[#9eb2d5]"
                    />
                  </div>

                  <div className="grid gap-4 xl:grid-cols-3">
                    <div className="rounded-[24px] border border-white/75 bg-white/58 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.85)]">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#7d8aa3]">Status</p>
                      <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as StatusFilter)}>
                        <SelectTrigger className="mt-3 h-12 rounded-[18px] border-white/90 bg-[linear-gradient(145deg,_rgba(255,255,255,0.98),_rgba(244,248,255,0.96))] px-4 text-sm text-[#152033] shadow-[0_12px_24px_rgba(33,51,84,0.06)] focus:ring-[#9eb2d5]">
                          <SelectValue placeholder="All tasks" />
                        </SelectTrigger>
                        <SelectContent className="rounded-[18px] border-[#d6e0ed] bg-white/95">
                          {STATUS_OPTIONS.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="rounded-[24px] border border-white/75 bg-white/58 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.85)]">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#7d8aa3]">Type</p>
                      <Select value={typeFilter} onValueChange={(value) => setTypeFilter(value as TypeFilter)}>
                        <SelectTrigger className="mt-3 h-12 rounded-[18px] border-white/90 bg-[linear-gradient(145deg,_rgba(255,255,255,0.98),_rgba(244,248,255,0.96))] px-4 text-sm text-[#152033] shadow-[0_12px_24px_rgba(33,51,84,0.06)] focus:ring-[#9eb2d5]">
                          <SelectValue placeholder="All types" />
                        </SelectTrigger>
                        <SelectContent className="rounded-[18px] border-[#d6e0ed] bg-white/95">
                          {TYPE_OPTIONS.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="rounded-[24px] border border-white/75 bg-white/58 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.85)]">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#7d8aa3]">Sort by</p>
                      <Select value={sortBy} onValueChange={(value) => setSortBy(value as SortOption)}>
                        <SelectTrigger className="mt-3 h-12 rounded-[18px] border-white/90 bg-[linear-gradient(145deg,_rgba(255,255,255,0.98),_rgba(244,248,255,0.96))] px-4 text-sm text-[#152033] shadow-[0_12px_24px_rgba(33,51,84,0.06)] focus:ring-[#9eb2d5]">
                          <SelectValue placeholder="Choose sort order" />
                        </SelectTrigger>
                        <SelectContent className="rounded-[18px] border-[#d6e0ed] bg-white/95">
                          {SORT_OPTIONS.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {activeFilterCount > 0 ? (
                    <div className="flex items-center justify-between gap-3 border-t border-[#e0e7f1] pt-4">
                      <p className="text-sm text-[#667691]">Use the controls to isolate due-today work, overdue recovery, or reprogram the list in the order you prefer.</p>
                      <button
                        type="button"
                        onClick={() => {
                          setSearchQuery('');
                          setStatusFilter('all');
                          setTypeFilter('all');
                          setSortBy('due_asc');
                        }}
                        className="rounded-full border border-white/90 bg-white/92 px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-[#5d7398] shadow-[0_10px_22px_rgba(33,51,84,0.06)] transition-colors hover:border-[#b9c9e1] hover:text-[#1d2d49]"
                      >
                        Reset all
                      </button>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          </div>

          <Card className="overflow-hidden rounded-[30px] border border-[#d9dfeb] bg-[linear-gradient(180deg,_rgba(255,255,255,0.98),_rgba(246,249,253,0.98))] shadow-[0_20px_48px_rgba(33,51,84,0.08)]">
            <CardHeader className="border-b border-[#e5ebf4]">
              <CardTitle className="text-2xl tracking-[-0.04em] text-[#152033]">All matching tasks</CardTitle>
              <CardDescription>Each task is linked back to its lead so you can jump into the record, edit details, or reprogram it from this view.</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="space-y-3 p-6">
                  {Array.from({ length: 5 }).map((_, index) => (
                    <div key={index} className="h-24 rounded-[22px] border border-[#e2e8f2] bg-white/80" />
                  ))}
                </div>
              ) : filteredTasks.length === 0 ? (
                <div className="flex min-h-[320px] flex-col items-center justify-center px-6 text-center">
                  <div className="rounded-full bg-[#eef3fb] p-4 text-[#61739a]">
                    <CheckCircle2 className="h-6 w-6" />
                  </div>
                  <h3 className="mt-4 text-xl font-semibold text-[#152033]">No tasks match these filters</h3>
                  <p className="mt-2 max-w-md text-sm leading-6 text-[#667691]">
                    Try a broader status, remove the search term, or add a new task directly from this page.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-[#e7edf5]">
                  {filteredTasks.map((task) => {
                    const overdue = isTaskOverdue(task, now);
                    const dueToday = isTaskDueToday(task, now);

                    return (
                      <div key={task.id} className="flex flex-col gap-4 px-6 py-5 lg:flex-row lg:items-center lg:justify-between">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge variant="outline" className={cn('rounded-full border px-3 py-1 font-medium', TASK_TYPE_META[task.type].badgeClassName)}>
                              {TASK_TYPE_META[task.type].label}
                            </Badge>
                            {task.completed ? (
                              <Badge variant="outline" className="rounded-full border-emerald-200 bg-emerald-50 px-3 py-1 text-emerald-700">
                                Completed
                              </Badge>
                            ) : overdue ? (
                              <Badge variant="destructive" className="rounded-full px-3 py-1">
                                Overdue
                              </Badge>
                            ) : dueToday ? (
                              <Badge variant="outline" className="rounded-full border-amber-200 bg-amber-50 px-3 py-1 text-amber-700">
                                Due today
                              </Badge>
                            ) : null}
                          </div>

                          <div className="mt-3 flex flex-col gap-2 lg:flex-row lg:items-center lg:gap-4">
                            <Link href={`/leads/${task.lead_id}`} className="truncate text-lg font-semibold text-[#152033] transition-colors hover:text-[#415782]">
                              {task.lead_name}
                            </Link>
                            <span className="hidden text-[#c4cfde] lg:inline">•</span>
                            <p className="text-sm text-[#667691]">
                              Due <span className="font-medium text-[#21304f]">{format(getTaskDate(task), 'MMM d, yyyy')}</span>
                            </p>
                          </div>

                          <p className="mt-2 text-sm text-[#7a88a0]">{getTaskTimingLabel(task, now)}</p>
                        </div>

                        <div className="flex flex-wrap items-center gap-3">
                          <TaskEditorDialog mode="edit" task={task} leads={activeLeads}>
                            <Button type="button" variant="outline" className="rounded-full border-[#d6e0ed] bg-white/90">
                              <Edit3 className="mr-2 h-4 w-4" />
                              Edit
                            </Button>
                          </TaskEditorDialog>
                          <Button asChild variant="outline" className="rounded-full border-[#d6e0ed] bg-white/90">
                            <Link href={`/leads/${task.lead_id}`}>
                              View lead
                              <ExternalLink className="ml-2 h-4 w-4" />
                            </Link>
                          </Button>
                          {!task.completed ? (
                            <Button
                              type="button"
                              className="rounded-full bg-[#152033] px-5 text-white shadow-[0_14px_30px_rgba(21,32,51,0.18)] hover:bg-[#101827]"
                              onClick={() => handleCompleteTask(task)}
                              disabled={isPending}
                            >
                              <CheckCheck className="mr-2 h-4 w-4" />
                              Mark done
                            </Button>
                          ) : null}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="overflow-hidden rounded-[30px] border border-[#d9dfeb] bg-[linear-gradient(180deg,_rgba(255,255,255,0.98),_rgba(246,249,253,0.98))] shadow-[0_20px_48px_rgba(33,51,84,0.08)]">
            <CardHeader className="border-b border-[#e5ebf4]">
              <CardTitle className="text-xl text-[#152033]">Today&apos;s focus</CardTitle>
              <CardDescription>Small queues to help you decide what to do next.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5 p-5">
              {[
                { label: 'Overdue first', tasks: focusLists.overdue, empty: 'No overdue tasks right now.' },
                { label: 'Due today', tasks: focusLists.today, empty: 'Nothing due today yet.' },
                { label: 'Next 7 days', tasks: focusLists.nextUp, empty: 'No upcoming tasks in the next week.' },
              ].map((group) => (
                <div key={group.label} className="space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#7d8aa3]">{group.label}</p>
                    <span className="text-xs font-medium text-[#667691]">{group.tasks.length}</span>
                  </div>
                  {group.tasks.length === 0 ? (
                    <div className="rounded-[20px] border border-dashed border-[#d8deea] bg-white/70 px-4 py-3 text-sm text-[#7c89a1]">
                      {group.empty}
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {group.tasks.map((task) => (
                        <Link
                          key={task.id}
                          href={`/leads/${task.lead_id}`}
                          className="block rounded-[22px] border border-[#d8deea] bg-white/85 p-4 shadow-[0_10px_24px_rgba(33,51,84,0.05)] transition-all hover:-translate-y-0.5 hover:shadow-[0_16px_34px_rgba(33,51,84,0.10)]"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="truncate font-semibold text-[#152033]">{task.lead_name}</p>
                              <p className="mt-1 text-sm text-[#667691]">{TASK_TYPE_META[task.type].label}</p>
                            </div>
                            <ArrowRight className="mt-0.5 h-4 w-4 flex-shrink-0 text-[#8a98b5]" />
                          </div>
                          <p className="mt-3 text-xs font-medium uppercase tracking-[0.12em] text-[#7d8aa3]">
                            {format(getTaskDate(task), 'EEE, MMM d')}
                          </p>
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="overflow-hidden rounded-[30px] border border-[#d9dfeb] bg-[linear-gradient(135deg,_rgba(67,87,129,0.98),_rgba(28,40,68,0.98))] text-white shadow-[0_24px_60px_rgba(33,51,84,0.16)]">
            <CardContent className="p-6">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/65">Execution pulse</p>
              <p className="mt-3 text-4xl font-semibold tracking-[-0.05em]">{isLoading ? '...' : `${stats.completionRate}%`}</p>
              <p className="mt-3 text-sm leading-7 text-white/72">
                Completion rate across every task loaded in this workspace. A quick read on whether follow-up is keeping pace.
              </p>
              <div className="mt-6 h-3 overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-[linear-gradient(90deg,_#9fd3ff,_#8ef0c2)] transition-all duration-500"
                  style={{ width: `${stats.completionRate}%` }}
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
