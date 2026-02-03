'use client';

import { Button } from '@/components/ui/button';
import { FileText, ClipboardList } from 'lucide-react';

export type NoteType = 'progress' | 'hp';

interface NoteTypeSelectorProps {
  selected: NoteType;
  onSelect: (type: NoteType) => void;
  disabled?: boolean;
}

export function NoteTypeSelector({
  selected,
  onSelect,
  disabled = false,
}: NoteTypeSelectorProps) {
  return (
    <div className="flex gap-4 justify-center">
      <Button
        variant={selected === 'progress' ? 'default' : 'outline'}
        onClick={() => onSelect('progress')}
        disabled={disabled}
        className="flex-1 max-w-[200px]"
      >
        <FileText className="h-4 w-4 mr-2" />
        Progress Note
      </Button>
      <Button
        variant={selected === 'hp' ? 'default' : 'outline'}
        onClick={() => onSelect('hp')}
        disabled={disabled}
        className="flex-1 max-w-[200px]"
      >
        <ClipboardList className="h-4 w-4 mr-2" />
        H&P Document
      </Button>
    </div>
  );
}
