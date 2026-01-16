'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AIDisclaimer } from './ai-disclaimer';
import { Copy, Check, Edit, RotateCcw } from 'lucide-react';

interface NoteDisplayProps {
  title: string;
  content: string;
  generatedAt: string;
  onRegenerate?: () => void;
  isLoading?: boolean;
}

export function NoteDisplay({
  title,
  content,
  generatedAt,
  onRegenerate,
  isLoading,
}: NoteDisplayProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formattedDate = new Date(generatedAt).toLocaleString();

  return (
    <Card className="border-dashed border-2 border-amber-300 dark:border-amber-700">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CardTitle className="text-lg">{title}</CardTitle>
            <Badge variant="outline" className="text-amber-600 border-amber-400">
              AI Draft
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            {onRegenerate && (
              <Button
                variant="outline"
                size="sm"
                onClick={onRegenerate}
                disabled={isLoading}
              >
                <RotateCcw className="h-4 w-4 mr-1" />
                Regenerate
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopy}
              className="min-w-[100px]"
            >
              {copied ? (
                <>
                  <Check className="h-4 w-4 mr-1 text-green-600" />
                  Copied
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4 mr-1" />
                  Copy
                </>
              )}
            </Button>
          </div>
        </div>
        <p className="text-sm text-muted-foreground">Generated: {formattedDate}</p>
      </CardHeader>
      <CardContent className="space-y-4">
        <AIDisclaimer variant="inline" />
        <div className="bg-muted/50 rounded-lg p-4 font-mono text-sm whitespace-pre-wrap border">
          {content}
        </div>
      </CardContent>
    </Card>
  );
}
