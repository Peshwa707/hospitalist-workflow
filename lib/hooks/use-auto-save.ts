'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

export type SaveStatus = 'saved' | 'saving' | 'unsaved' | 'error';

interface UseAutoSaveOptions {
  debounceMs?: number;
  onSaveSuccess?: () => void;
  onSaveError?: (error: Error) => void;
}

interface UseAutoSaveReturn {
  saveStatus: SaveStatus;
  lastSavedAt: Date | null;
  save: () => Promise<void>;
  isSaving: boolean;
}

export function useAutoSave(
  noteId: number | null,
  content: string,
  options: UseAutoSaveOptions = {}
): UseAutoSaveReturn {
  const { debounceMs = 1500, onSaveSuccess, onSaveError } = options;

  const [saveStatus, setSaveStatus] = useState<SaveStatus>('saved');
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const lastSavedContentRef = useRef(content);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const save = useCallback(async () => {
    if (!noteId) return;
    if (content === lastSavedContentRef.current) return;

    // Cancel any pending save
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    abortControllerRef.current = new AbortController();
    setIsSaving(true);
    setSaveStatus('saving');

    try {
      const response = await fetch(`/api/notes/${noteId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        throw new Error(`Save failed: ${response.statusText}`);
      }

      lastSavedContentRef.current = content;
      setSaveStatus('saved');
      setLastSavedAt(new Date());
      onSaveSuccess?.();
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        return; // Ignore abort errors
      }
      setSaveStatus('error');
      onSaveError?.(error instanceof Error ? error : new Error('Unknown error'));
    } finally {
      setIsSaving(false);
      abortControllerRef.current = null;
    }
  }, [noteId, content, onSaveSuccess, onSaveError]);

  // Auto-save effect with debounce
  useEffect(() => {
    if (!noteId) return;

    // Check if content has changed
    if (content === lastSavedContentRef.current) {
      return;
    }

    setSaveStatus('unsaved');

    // Clear existing timer
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    // Set new debounced save
    timerRef.current = setTimeout(() => {
      save();
    }, debounceMs);

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [content, noteId, debounceMs, save]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  // Update ref when content is externally set (e.g., on initial load)
  useEffect(() => {
    if (saveStatus === 'saved') {
      lastSavedContentRef.current = content;
    }
  }, [noteId]);

  return {
    saveStatus,
    lastSavedAt,
    save,
    isSaving,
  };
}
