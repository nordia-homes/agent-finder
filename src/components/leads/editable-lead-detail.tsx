'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Edit, Save, X, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useFirestore } from '@/firebase';
import { doc, updateDoc } from 'firebase/firestore';

interface EditableLeadDetailProps {
  leadId: string;
  fieldKey: 'phone' | 'email';
  label: string;
  value: string | null | undefined;
  icon: React.ElementType;
}

export function EditableLeadDetail({ leadId, fieldKey, label, value, icon: Icon }: EditableLeadDetailProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [currentValue, setCurrentValue] = useState(value || '');
  const [isLoading, setIsLoading] = useState(false);
  const firestore = useFirestore();
  const { toast } = useToast();

  const handleSave = async () => {
    if (!firestore) {
      toast({ title: "Error", description: "Firestore not available.", variant: "destructive" });
      return;
    }
    
    if (currentValue === value) {
        setIsEditing(false);
        return;
    }

    setIsLoading(true);
    const leadRef = doc(firestore, 'leads', leadId);
    try {
      await updateDoc(leadRef, {
        [fieldKey]: currentValue
      });
      toast({
        title: "Success",
        description: `${label} updated successfully.`,
      });
      setIsEditing(false);
    } catch (error) {
      console.error(`Error updating ${fieldKey}:`, error);
      toast({
        title: "Error",
        description: `Failed to update ${label}.`,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-black/10 backdrop-blur-sm border border-white/10 rounded-lg p-3 transition-all hover:bg-black/20 group text-sm">
        <div className="flex items-start gap-3">
            <Icon className="h-4 w-4 text-white/60 mt-0.5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
                <p className="text-xs text-white/70">{label}</p>
                {!isEditing ? (
                <div className="font-medium truncate text-white flex items-center justify-between">
                    {fieldKey === 'email' && value ? (
                        <a href={`mailto:${value}`} className="hover:underline">{value}</a>
                    ) : (
                        <span>{value || '-'}</span>
                    )}
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-white/70 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                        onClick={() => setIsEditing(true)}
                        >
                        <Edit className="h-3 w-3" />
                    </Button>
                </div>
                ) : (
                <div className="flex items-center gap-2 mt-1">
                    <Input
                    type={fieldKey === 'email' ? 'email' : 'text'}
                    value={currentValue}
                    onChange={(e) => setCurrentValue(e.target.value)}
                    className="h-8 bg-black/20 border-white/20 text-white"
                    autoFocus
                    />
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-white/70 hover:text-white flex-shrink-0"
                        onClick={handleSave}
                        disabled={isLoading}
                    >
                    {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-white/70 hover:text-white flex-shrink-0"
                        onClick={() => {
                            setIsEditing(false);
                            setCurrentValue(value || '');
                        }}
                        disabled={isLoading}
                    >
                    <X className="h-4 w-4" />
                    </Button>
                </div>
                )}
            </div>
        </div>
    </div>
  );
}
