'use client';

import { TaskEditorDialog } from '@/components/tasks/task-editor-dialog';

interface AddTaskDialogProps {
  leadId: string;
  leadName: string;
  children: React.ReactNode;
}

export function AddTaskDialog({ leadId, leadName, children }: AddTaskDialogProps) {
  return (
    <TaskEditorDialog mode="create" leadId={leadId} leadName={leadName}>
      {children}
    </TaskEditorDialog>
  );
}
