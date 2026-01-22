'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Search,
  FileText,
  FileOutput,
  Brain,
  Trash2,
  Eye,
  Loader2,
} from 'lucide-react';
import type { NoteHistoryItem } from '@/lib/types';

const typeIcons = {
  hp: FileText,
  progress: FileText,
  discharge: FileOutput,
  analysis: Brain,
};

const typeLabels = {
  hp: 'H&P',
  progress: 'Progress Note',
  discharge: 'Discharge Summary',
  analysis: 'Analysis',
};

export default function HistoryPage() {
  const [notes, setNotes] = useState<NoteHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const [selectedNote, setSelectedNote] = useState<{
    type: string;
    input: object;
    output: object;
  } | null>(null);

  const fetchNotes = useCallback(async () => {
    setLoading(true);
    try {
      let url = '/api/notes?limit=100';
      if (searchTerm) {
        url = `/api/notes?search=${encodeURIComponent(searchTerm)}`;
      } else if (activeTab !== 'all') {
        url = `/api/notes?type=${activeTab}`;
      }

      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        setNotes(data);
      }
    } catch (error) {
      console.error('Failed to fetch notes:', error);
    } finally {
      setLoading(false);
    }
  }, [searchTerm, activeTab]);

  useEffect(() => {
    fetchNotes();
  }, [fetchNotes]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchNotes();
  };

  const handleViewNote = async (id: number) => {
    try {
      const response = await fetch(`/api/notes?id=${id}`);
      if (response.ok) {
        const data = await response.json();
        setSelectedNote({
          type: data.type,
          input: data.input,
          output: data.output,
        });
      }
    } catch (error) {
      console.error('Failed to fetch note:', error);
    }
  };

  const handleDeleteNote = async (id: number) => {
    if (!confirm('Are you sure you want to delete this note?')) return;

    try {
      const response = await fetch(`/api/notes?id=${id}`, {
        method: 'DELETE',
      });
      if (response.ok) {
        setNotes((prev) => prev.filter((n) => n.id !== id));
        if (selectedNote) {
          setSelectedNote(null);
        }
      }
    } catch (error) {
      console.error('Failed to delete note:', error);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Note History</h1>
        <p className="text-muted-foreground mt-2">
          Browse and search your previously generated notes and analyses.
        </p>
      </div>

      {/* Search */}
      <form onSubmit={handleSearch} className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by patient MRN or content..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button type="submit">Search</Button>
      </form>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="progress">Progress Notes</TabsTrigger>
          <TabsTrigger value="discharge">Discharge Summaries</TabsTrigger>
          <TabsTrigger value="analysis">Analyses</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-4">
          <div className="grid lg:grid-cols-2 gap-6">
            {/* Notes List */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">
                  {loading ? 'Loading...' : `${notes.length} Notes`}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : notes.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">
                    No notes found.
                  </p>
                ) : (
                  <ScrollArea className="h-[500px] pr-4">
                    <div className="space-y-3">
                      {notes.map((note) => {
                        const Icon = typeIcons[note.type];
                        return (
                          <div
                            key={note.id}
                            className="flex items-start gap-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                          >
                            <Icon className="h-5 w-5 mt-0.5 text-muted-foreground flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <Badge variant="outline" className="text-xs">
                                  {note.patientMrn}
                                </Badge>
                                <Badge variant="secondary" className="text-xs">
                                  {typeLabels[note.type]}
                                </Badge>
                              </div>
                              <p className="text-sm text-muted-foreground truncate">
                                {note.summary}
                              </p>
                              <p className="text-xs text-muted-foreground mt-1">
                                {new Date(note.createdAt).toLocaleString()}
                              </p>
                            </div>
                            <div className="flex gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleViewNote(note.id)}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDeleteNote(note.id)}
                              >
                                <Trash2 className="h-4 w-4 text-red-500" />
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>

            {/* Selected Note Preview */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Note Preview</CardTitle>
              </CardHeader>
              <CardContent>
                {selectedNote ? (
                  <ScrollArea className="h-[500px]">
                    <div className="space-y-4">
                      <div>
                        <h4 className="font-medium text-sm text-muted-foreground mb-2">
                          Type
                        </h4>
                        <Badge>{typeLabels[selectedNote.type as keyof typeof typeLabels]}</Badge>
                      </div>

                      {selectedNote.type !== 'analysis' && (
                        <div>
                          <h4 className="font-medium text-sm text-muted-foreground mb-2">
                            Generated Content
                          </h4>
                          <div className="bg-muted/50 rounded-lg p-4 font-mono text-sm whitespace-pre-wrap border">
                            {(selectedNote.output as { content?: string }).content ||
                              'No content available'}
                          </div>
                        </div>
                      )}

                      {selectedNote.type === 'analysis' && (
                        <div>
                          <h4 className="font-medium text-sm text-muted-foreground mb-2">
                            Analysis Results
                          </h4>
                          <pre className="bg-muted/50 rounded-lg p-4 text-sm overflow-x-auto border">
                            {JSON.stringify(selectedNote.output, null, 2)}
                          </pre>
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                ) : (
                  <p className="text-muted-foreground text-center py-8">
                    Select a note to preview
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
