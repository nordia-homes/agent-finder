'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Edit, Save, X, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useFirestore } from '@/firebase';
import { doc, updateDoc, collection, query, where, getDocs } from 'firebase/firestore';

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
    
    if (fieldKey === 'phone' && currentValue) {
        const leadsRef = collection(firestore, 'leads');
        const q = query(leadsRef, where('phone', '==', currentValue));
        const querySnapshot = await getDocs(q);
        const foundDuplicates = querySnapshot.docs
            .map(d => ({ id: d.id, ...d.data() }))
            .filter(l => l.id !== leadId);

        if (foundDuplicates.length > 0) {
            toast({
                variant: "destructive",
                title: "Duplicate Phone Number",
                description: `This phone number is already used by ${foundDuplicates.length} other lead(s). Please check for duplicates.`,
                duration: 8000,
            });
        }
    }
    
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
    <div className="group rounded-[22px] border border-[#d8deea] bg-[linear-gradient(180deg,_rgba(255,255,255,0.98),_rgba(245,248,252,0.98))] p-4 text-sm shadow-[0_10px_24px_rgba(33,51,84,0.06)] transition-all hover:-translate-y-0.5 hover:shadow-[0_16px_34px_rgba(33,51,84,0.10)]">
      <div className="flex items-start gap-3">
        <div className="rounded-2xl bg-[#eef3fb] p-2 text-[#61739a]">
          <Icon className="h-4 w-4 flex-shrink-0" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[11px] uppercase tracking-[0.16em] text-[#7d8aa3]">{label}</p>
          {!isEditing ? (
            <div className="flex items-center justify-between gap-2">
              <div className="truncate pt-1 font-semibold text-[#1b2435]">
                {fieldKey === 'email' && value ? (
                  <a href={`mailto:${value}`} className="hover:text-[#44537b] hover:underline">{value}</a>
                ) : (
                  <span>{value || '-'}</span>
                )}
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 rounded-full text-[#7d8aa3] opacity-0 transition-opacity hover:bg-[#edf2fa] hover:text-[#44537b] group-hover:opacity-100"
                onClick={() => setIsEditing(true)}
              >
                <Edit className="h-3.5 w-3.5" />
              </Button>
            </div>
          ) : (
            <div className="mt-2 flex items-center gap-2">
              <Input
                type={fieldKey === 'email' ? 'email' : 'text'}
                value={currentValue}
                onChange={(e) => setCurrentValue(e.target.value)}
                className="h-9 border-[#d8deea] bg-white text-[#1b2435]"
                autoFocus
              />
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-full text-[#61739a] hover:bg-[#edf2fa] hover:text-[#44537b]"
                onClick={handleSave}
                disabled={isLoading}
              >
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-full text-[#61739a] hover:bg-[#edf2fa] hover:text-[#44537b]"
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
