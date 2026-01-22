'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Pencil,
  Save,
  X,
  RefreshCw,
  Loader2,
  Copy,
  CheckCircle,
  Plus,
} from 'lucide-react';

interface NoteEditorProps {
  noteId: number;
  noteType: 'hp' | 'progress';
  content: string;
  onContentChange: (newContent: string) => void;
  title?: string;
}

export function NoteEditor({
  noteId,
  noteType,
  content,
  onContentChange,
  title = 'Note',
}: NoteEditorProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState(content);
  const [saving, setSaving] = useState(false);
  const [showUpdateBox, setShowUpdateBox] = useState(false);
  const [newData, setNewData] = useState('');
  const [updating, setUpdating] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      const response = await fetch(`/api/notes/${noteId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: editedContent }),
      });

      if (response.ok) {
        onContentChange(editedContent);
        setIsEditing(false);
      }
    } catch (error) {
      console.error('Failed to save note:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async (mode: 'append' | 'replace') => {
    if (!newData.trim()) return;

    setUpdating(true);
    try {
      const response = await fetch(`/api/notes/${noteId}/regenerate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newData, mode }),
      });

      if (response.ok) {
        const result = await response.json();
        setEditedContent(result.content);
        onContentChange(result.content);
        setNewData('');
        setShowUpdateBox(false);
      }
    } catch (error) {
      console.error('Failed to update note:', error);
    } finally {
      setUpdating(false);
    }
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCancel = () => {
    setEditedContent(content);
    setIsEditing(false);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            {title}
            <Badge variant="outline" className="text-xs">
              {noteType === 'hp' ? 'H&P' : 'Progress Note'}
            </Badge>
          </CardTitle>
          <div className="flex items-center gap-2">
            {!isEditing && !showUpdateBox && (
              <>
                <Button variant="ghost" size="sm" onClick={handleCopy}>
                  {copied ? (
                    <CheckCircle className="h-4 w-4" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowUpdateBox(true)}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add Data
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsEditing(true)}
                >
                  <Pencil className="h-4 w-4 mr-1" />
                  Edit
                </Button>
              </>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Update with new data box */}
        {showUpdateBox && (
          <div className="space-y-3 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center justify-between">
              <h4 className="font-medium text-blue-900">Add New Clinical Data</h4>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setShowUpdateBox(false);
                  setNewData('');
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <Textarea
              value={newData}
              onChange={(e) => setNewData(e.target.value)}
              placeholder="Paste new vitals, labs, exam findings, or other clinical data..."
              rows={4}
              className="bg-white"
            />
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={() => handleUpdate('append')}
                disabled={updating || !newData.trim()}
              >
                {updating ? (
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                ) : (
                  <Plus className="h-4 w-4 mr-1" />
                )}
                Append to Note
              </Button>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => handleUpdate('replace')}
                disabled={updating || !newData.trim()}
              >
                {updating ? (
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4 mr-1" />
                )}
                Regenerate Note
              </Button>
            </div>
          </div>
        )}

        {/* Note content - editable or readonly */}
        {isEditing ? (
          <div className="space-y-3">
            <Textarea
              value={editedContent}
              onChange={(e) => setEditedContent(e.target.value)}
              rows={16}
              className="font-mono text-sm"
            />
            <div className="flex gap-2">
              <Button size="sm" onClick={handleSave} disabled={saving}>
                {saving ? (
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                ) : (
                  <Save className="h-4 w-4 mr-1" />
                )}
                Save Changes
              </Button>
              <Button size="sm" variant="outline" onClick={handleCancel}>
                <X className="h-4 w-4 mr-1" />
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <div className="bg-muted/50 rounded-lg p-4 max-h-96 overflow-y-auto">
            <pre className="whitespace-pre-wrap text-sm font-mono">{content}</pre>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
