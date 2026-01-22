'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  FileText,
  ClipboardCheck,
  Stethoscope,
  Activity,
  ChevronRight,
  X,
} from 'lucide-react';
import type { PatientNoteSummary } from '@/lib/types';

interface PatientNotesHistoryProps {
  patientId: number;
}

const noteTypeConfig: Record<
  PatientNoteSummary['type'],
  { icon: React.ReactNode; label: string; color: string }
> = {
  hp: {
    icon: <FileText className="h-4 w-4" />,
    label: 'H&P',
    color: 'bg-blue-100 text-blue-800',
  },
  progress: {
    icon: <Activity className="h-4 w-4" />,
    label: 'Progress',
    color: 'bg-green-100 text-green-800',
  },
  discharge: {
    icon: <ClipboardCheck className="h-4 w-4" />,
    label: 'Discharge',
    color: 'bg-purple-100 text-purple-800',
  },
  analysis: {
    icon: <Stethoscope className="h-4 w-4" />,
    label: 'Analysis',
    color: 'bg-orange-100 text-orange-800',
  },
};

interface NoteDetail {
  id: number;
  type: string;
  input: unknown;
  output: {
    content?: string;
    differentialDiagnosis?: { diagnosis: string; likelihood: string }[];
  };
  createdAt: string;
}

export function PatientNotesHistory({ patientId }: PatientNotesHistoryProps) {
  const [notes, setNotes] = useState<PatientNoteSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedNote, setSelectedNote] = useState<NoteDetail | null>(null);
  const [loadingNote, setLoadingNote] = useState(false);

  useEffect(() => {
    fetchNotes();
  }, [patientId]);

  const fetchNotes = async () => {
    try {
      const response = await fetch(`/api/patients/${patientId}/notes`);
      if (response.ok) {
        const data = await response.json();
        setNotes(data);
      }
    } catch (error) {
      console.error('Failed to fetch notes:', error);
    } finally {
      setLoading(false);
    }
  };

  const viewNote = async (noteId: number) => {
    setLoadingNote(true);
    try {
      const response = await fetch(`/api/patients/${patientId}/notes?noteId=${noteId}`);
      if (response.ok) {
        const data = await response.json();
        setSelectedNote(data);
      }
    } catch (error) {
      console.error('Failed to fetch note:', error);
    } finally {
      setLoadingNote(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Notes History</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Loading notes...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">Notes History</CardTitle>
      </CardHeader>
      <CardContent>
        {notes.length === 0 ? (
          <p className="text-muted-foreground text-sm text-center py-4">
            No notes yet. Generate an H&P or run analysis to create notes.
          </p>
        ) : selectedNote ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {noteTypeConfig[selectedNote.type as PatientNoteSummary['type']]?.icon}
                <span className="font-medium">
                  {noteTypeConfig[selectedNote.type as PatientNoteSummary['type']]?.label}
                </span>
                <span className="text-sm text-muted-foreground">
                  {formatDate(selectedNote.createdAt)}
                </span>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setSelectedNote(null)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <ScrollArea className="h-[300px] rounded border p-3">
              {selectedNote.output.content ? (
                <pre className="whitespace-pre-wrap text-sm font-mono">
                  {selectedNote.output.content}
                </pre>
              ) : selectedNote.output.differentialDiagnosis ? (
                <div className="space-y-2">
                  <p className="font-medium text-sm">Differential Diagnosis:</p>
                  <ul className="space-y-1">
                    {selectedNote.output.differentialDiagnosis.map((dx, i) => (
                      <li key={i} className="text-sm flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          {dx.likelihood}
                        </Badge>
                        {dx.diagnosis}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <pre className="whitespace-pre-wrap text-sm">
                  {JSON.stringify(selectedNote.output, null, 2)}
                </pre>
              )}
            </ScrollArea>
          </div>
        ) : (
          <div className="space-y-2">
            {notes.map((note) => (
              <button
                key={note.id}
                onClick={() => viewNote(note.id)}
                disabled={loadingNote}
                className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 text-left transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Badge
                    variant="outline"
                    className={noteTypeConfig[note.type]?.color}
                  >
                    {noteTypeConfig[note.type]?.icon}
                    <span className="ml-1">{noteTypeConfig[note.type]?.label}</span>
                  </Badge>
                  <span className="text-sm text-muted-foreground">
                    {formatDate(note.createdAt)}
                  </span>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </button>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
