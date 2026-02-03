'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useAutoSave, SaveStatus } from '@/lib/hooks/use-auto-save';
import { StructuredNoteView } from './structured-note-view';
import {
  RefreshCw,
  Loader2,
  CheckCircle,
  Save,
  AlertCircle,
  Clock,
  Pencil,
  Eye,
} from 'lucide-react';

interface RichNoteEditorProps {
  noteId: number | null;
  noteType: 'progress' | 'hp';
  initialContent: string;
  onContentChange?: (content: string) => void;
  onRegenerate?: () => void;
  isRegenerating?: boolean;
  title?: string;
}

function SaveStatusIndicator({ status, lastSavedAt }: { status: SaveStatus; lastSavedAt: Date | null }) {
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  switch (status) {
    case 'saved':
      return (
        <div className="flex items-center gap-1.5 text-xs text-green-600">
          <CheckCircle className="h-3.5 w-3.5" />
          <span>Saved{lastSavedAt && ` at ${formatTime(lastSavedAt)}`}</span>
        </div>
      );
    case 'saving':
      return (
        <div className="flex items-center gap-1.5 text-xs text-blue-600">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          <span>Saving...</span>
        </div>
      );
    case 'unsaved':
      return (
        <div className="flex items-center gap-1.5 text-xs text-amber-600">
          <Clock className="h-3.5 w-3.5" />
          <span>Unsaved changes</span>
        </div>
      );
    case 'error':
      return (
        <div className="flex items-center gap-1.5 text-xs text-red-600">
          <AlertCircle className="h-3.5 w-3.5" />
          <span>Save failed</span>
        </div>
      );
  }
}

export function RichNoteEditor({
  noteId,
  noteType,
  initialContent,
  onContentChange,
  onRegenerate,
  isRegenerating = false,
  title,
}: RichNoteEditorProps) {
  const [content, setContent] = useState(initialContent);
  const [mode, setMode] = useState<'view' | 'edit'>('view');

  const { saveStatus, lastSavedAt, save, isSaving } = useAutoSave(noteId, content, {
    debounceMs: 1500,
    onSaveSuccess: () => {
      onContentChange?.(content);
    },
  });

  // Update content when initial content changes (e.g., after regeneration)
  useEffect(() => {
    setContent(initialContent);
  }, [initialContent]);

  const handleManualSave = async () => {
    await save();
  };

  const displayTitle = title || (noteType === 'hp' ? 'H&P Document' : 'Progress Note');

  return (
    <Card className="flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            {displayTitle}
            <Badge variant="outline" className="text-xs">
              {noteType === 'hp' ? 'H&P' : 'Progress'}
            </Badge>
          </CardTitle>
          <div className="flex items-center gap-3">
            <SaveStatusIndicator status={saveStatus} lastSavedAt={lastSavedAt} />
            <div className="flex items-center gap-2">
              {/* View/Edit Toggle */}
              <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
                <Button
                  variant={mode === 'view' ? 'secondary' : 'ghost'}
                  size="sm"
                  onClick={() => setMode('view')}
                  className="h-7 px-2 gap-1"
                >
                  <Eye className="h-3.5 w-3.5" />
                  View
                </Button>
                <Button
                  variant={mode === 'edit' ? 'secondary' : 'ghost'}
                  size="sm"
                  onClick={() => setMode('edit')}
                  className="h-7 px-2 gap-1"
                >
                  <Pencil className="h-3.5 w-3.5" />
                  Edit
                </Button>
              </div>

              {saveStatus === 'unsaved' && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleManualSave}
                  disabled={isSaving}
                >
                  <Save className="h-4 w-4 mr-1" />
                  Save
                </Button>
              )}
              {onRegenerate && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onRegenerate}
                  disabled={isRegenerating}
                >
                  {isRegenerating ? (
                    <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4 mr-1" />
                  )}
                  Regenerate
                </Button>
              )}
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex-1">
        {mode === 'view' ? (
          <StructuredNoteView
            content={content}
            onContentChange={(newContent) => setContent(newContent)}
          />
        ) : (
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="min-h-[500px] font-mono text-sm resize-none"
            placeholder="Note content will appear here..."
          />
        )}
      </CardContent>
    </Card>
  );
}
