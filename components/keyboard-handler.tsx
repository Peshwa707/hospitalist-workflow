'use client';

import { useEffect, useCallback, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Keyboard } from 'lucide-react';

interface ShortcutDef {
  key: string;
  label: string;
  description: string;
  action: () => void;
  global?: boolean;
}

interface KeyboardHandlerProps {
  children: React.ReactNode;
}

export function KeyboardHandler({ children }: KeyboardHandlerProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [showHelp, setShowHelp] = useState(false);

  const shortcuts: ShortcutDef[] = [
    {
      key: 'g h',
      label: 'G H',
      description: 'Go to Home/Workflow',
      action: () => router.push('/'),
      global: true,
    },
    {
      key: 'g r',
      label: 'G R',
      description: 'Go to Rounding Dashboard',
      action: () => router.push('/rounding'),
      global: true,
    },
    {
      key: 'g t',
      label: 'G T',
      description: 'Go to Tasks',
      action: () => router.push('/tasks'),
      global: true,
    },
    {
      key: 'g p',
      label: 'G P',
      description: 'Go to Patients',
      action: () => router.push('/patients'),
      global: true,
    },
    {
      key: '?',
      label: '?',
      description: 'Show keyboard shortcuts',
      action: () => setShowHelp(true),
      global: true,
    },
  ];

  // Track key sequence for multi-key shortcuts (e.g., "g h")
  const [keySequence, setKeySequence] = useState<string[]>([]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      // Don't trigger shortcuts when typing in inputs
      const target = e.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        return;
      }

      // Close help modal on Escape
      if (e.key === 'Escape') {
        setShowHelp(false);
        setKeySequence([]);
        return;
      }

      // Build key sequence
      const key = e.key.toLowerCase();
      const newSequence = [...keySequence, key].slice(-2);
      setKeySequence(newSequence);

      // Check for matching shortcuts
      const sequenceStr = newSequence.join(' ');

      // Single key shortcuts
      if (key === '?') {
        e.preventDefault();
        setShowHelp(true);
        return;
      }

      // Two-key shortcuts (g + second key)
      for (const shortcut of shortcuts) {
        if (shortcut.key === sequenceStr) {
          e.preventDefault();
          shortcut.action();
          setKeySequence([]);
          return;
        }
      }

      // Clear sequence after a delay if no match
      setTimeout(() => {
        setKeySequence((prev) => (prev.length > 0 ? [] : prev));
      }, 1000);
    },
    [keySequence, shortcuts]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  return (
    <>
      {children}

      {/* Help Modal */}
      {showHelp && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          onClick={() => setShowHelp(false)}
        >
          <Card
            className="max-w-md w-full mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 mb-4">
                <Keyboard className="h-5 w-5" />
                <h2 className="text-lg font-semibold">Keyboard Shortcuts</h2>
              </div>

              <div className="space-y-3">
                <div className="text-sm text-muted-foreground mb-2">
                  Navigation
                </div>
                {shortcuts
                  .filter((s) => s.global)
                  .map((shortcut) => (
                    <div
                      key={shortcut.key}
                      className="flex items-center justify-between"
                    >
                      <span className="text-sm">{shortcut.description}</span>
                      <Badge variant="secondary" className="font-mono">
                        {shortcut.label}
                      </Badge>
                    </div>
                  ))}
              </div>

              <div className="mt-6 pt-4 border-t">
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <span>Press Escape to close</span>
                  <Badge variant="outline" className="font-mono">
                    ESC
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Key sequence indicator */}
      {keySequence.length > 0 && (
        <div className="fixed bottom-4 right-4 z-40">
          <Badge variant="secondary" className="font-mono text-lg px-3 py-1">
            {keySequence.join(' ')}
          </Badge>
        </div>
      )}
    </>
  );
}
