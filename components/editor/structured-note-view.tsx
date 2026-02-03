'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  ChevronDown,
  ChevronRight,
  Copy,
  CheckCircle,
  FileText,
  Stethoscope,
  ClipboardList,
  ListChecks,
  CheckSquare,
  LayoutList,
  FileCode,
} from 'lucide-react';

interface SOAPSection {
  title: string;
  icon: React.ReactNode;
  content: string;
  color: string;
  key: string;
}

interface ActionItem {
  text: string;
  checked: boolean;
}

interface StructuredNoteViewProps {
  content: string;
  onContentChange?: (content: string) => void;
}

const SECTION_CONFIG: Record<string, { title: string; color: string; icon: React.ReactNode }> = {
  subjective: { title: 'Subjective', color: 'blue', icon: <FileText className="h-4 w-4" /> },
  objective: { title: 'Objective', color: 'green', icon: <Stethoscope className="h-4 w-4" /> },
  assessment: { title: 'Assessment', color: 'amber', icon: <ClipboardList className="h-4 w-4" /> },
  plan: { title: 'Plan', color: 'purple', icon: <ListChecks className="h-4 w-4" /> },
};

function parseSOAPNote(content: string): { sections: SOAPSection[]; actionItems: ActionItem[] } {
  const sections: SOAPSection[] = [];
  const actionItems: ActionItem[] = [];

  // Pattern matchers for each section (supports both plain and markdown-formatted headers)
  const patterns: { key: string; regex: RegExp }[] = [
    { key: 'subjective', regex: /^(\*{0,2})(SUBJECTIVE:|SUBJECTIVE|S:|HPI:|HISTORY:)(\*{0,2})/i },
    { key: 'objective', regex: /^(\*{0,2})(OBJECTIVE:|OBJECTIVE|O:|PHYSICAL EXAM:|EXAM:)(\*{0,2})/i },
    { key: 'assessment', regex: /^(\*{0,2})(ASSESSMENT:|ASSESSMENT|A:|ASSESSMENT AND PLAN:|A\/P:)(\*{0,2})/i },
    { key: 'plan', regex: /^(\*{0,2})(PLAN:|PLAN|P:|RECOMMENDATIONS:)(\*{0,2})/i },
  ];

  // Find section start positions
  const lines = content.split('\n');
  const sectionStarts: { key: string; start: number; matchedPattern: RegExp }[] = [];

  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();
    for (const pattern of patterns) {
      if (pattern.regex.test(trimmed)) {
        sectionStarts.push({ key: pattern.key, start: i, matchedPattern: pattern.regex });
        break;
      }
    }
  }

  // Extract sections
  for (let i = 0; i < sectionStarts.length; i++) {
    const current = sectionStarts[i];
    const nextStart = i < sectionStarts.length - 1 ? sectionStarts[i + 1].start : lines.length;

    const sectionLines = lines.slice(current.start, nextStart);
    // Remove the header from the first line
    const firstLine = sectionLines[0].replace(current.matchedPattern, '').trim();
    const sectionContent = [firstLine, ...sectionLines.slice(1)]
      .join('\n')
      .trim();

    const config = SECTION_CONFIG[current.key];
    if (config) {
      sections.push({
        key: current.key,
        title: config.title,
        icon: config.icon,
        content: sectionContent,
        color: config.color,
      });

      // Extract action items from Plan section
      if (current.key === 'plan') {
        const planLines = sectionContent.split('\n');
        for (const line of planLines) {
          const trimmed = line.trim();
          if (/^[\d]+[\.\)]\s*/.test(trimmed) || /^[-•*]\s*/.test(trimmed)) {
            const itemText = trimmed.replace(/^[\d]+[\.\)]\s*/, '').replace(/^[-•*]\s*/, '').trim();
            if (itemText.length > 5) {
              actionItems.push({ text: itemText, checked: false });
            }
          }
        }
      }
    }
  }

  // If no sections found, treat entire content as a single section
  if (sections.length === 0) {
    sections.push({
      key: 'content',
      title: 'Note Content',
      icon: <FileText className="h-4 w-4" />,
      content: content,
      color: 'gray',
    });
  }

  return { sections, actionItems };
}

function SectionCard({
  section,
  defaultExpanded = true,
}: {
  section: SOAPSection;
  defaultExpanded?: boolean;
}) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const [copied, setCopied] = useState(false);

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await navigator.clipboard.writeText(section.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const colorClasses: Record<string, { bg: string; border: string; text: string; iconBg: string }> = {
    blue: { bg: 'bg-blue-50 dark:bg-blue-950/30', border: 'border-blue-200 dark:border-blue-800', text: 'text-blue-700 dark:text-blue-300', iconBg: 'bg-blue-100 dark:bg-blue-900' },
    green: { bg: 'bg-green-50 dark:bg-green-950/30', border: 'border-green-200 dark:border-green-800', text: 'text-green-700 dark:text-green-300', iconBg: 'bg-green-100 dark:bg-green-900' },
    amber: { bg: 'bg-amber-50 dark:bg-amber-950/30', border: 'border-amber-200 dark:border-amber-800', text: 'text-amber-700 dark:text-amber-300', iconBg: 'bg-amber-100 dark:bg-amber-900' },
    purple: { bg: 'bg-purple-50 dark:bg-purple-950/30', border: 'border-purple-200 dark:border-purple-800', text: 'text-purple-700 dark:text-purple-300', iconBg: 'bg-purple-100 dark:bg-purple-900' },
    gray: { bg: 'bg-gray-50 dark:bg-gray-950/30', border: 'border-gray-200 dark:border-gray-800', text: 'text-gray-700 dark:text-gray-300', iconBg: 'bg-gray-100 dark:bg-gray-900' },
  };

  const colors = colorClasses[section.color] || colorClasses.gray;

  return (
    <Card className={`${colors.border} overflow-hidden`}>
      <CardHeader
        className={`${colors.bg} py-3 px-4 cursor-pointer`}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-1.5 rounded ${colors.iconBg} ${colors.text}`}>
              {section.icon}
            </div>
            <span className={`font-semibold ${colors.text}`}>{section.title}</span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCopy}
              className="h-8 w-8 p-0"
            >
              {copied ? (
                <CheckCircle className="h-4 w-4 text-green-600" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </Button>
            {isExpanded ? (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            )}
          </div>
        </div>
      </CardHeader>
      {isExpanded && (
        <CardContent className="pt-4 pb-4">
          <pre className="whitespace-pre-wrap text-sm font-mono leading-relaxed">
            {section.content}
          </pre>
        </CardContent>
      )}
    </Card>
  );
}

function ActionItemsCard({
  items,
  onToggle
}: {
  items: ActionItem[];
  onToggle: (index: number) => void;
}) {
  const [copied, setCopied] = useState(false);

  if (items.length === 0) return null;

  const handleCopy = async () => {
    const text = items.map((item, i) => `${i + 1}. ${item.text}`).join('\n');
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const completedCount = items.filter(i => i.checked).length;

  return (
    <Card className="border-indigo-200 dark:border-indigo-800">
      <CardHeader className="bg-indigo-50 dark:bg-indigo-950/30 py-3 px-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-1.5 rounded bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300">
              <CheckSquare className="h-4 w-4" />
            </div>
            <span className="font-semibold text-indigo-700 dark:text-indigo-300">
              Action Items
            </span>
            <Badge variant="outline" className="ml-2">
              {completedCount}/{items.length}
            </Badge>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCopy}
            className="h-8 w-8 p-0"
          >
            {copied ? (
              <CheckCircle className="h-4 w-4 text-green-600" />
            ) : (
              <Copy className="h-4 w-4" />
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="pt-4 pb-4">
        <div className="space-y-2">
          {items.map((item, index) => (
            <div
              key={index}
              className="flex items-start gap-3 p-2 rounded hover:bg-muted/50 cursor-pointer"
              onClick={() => onToggle(index)}
            >
              <Checkbox
                checked={item.checked}
                className="mt-0.5"
              />
              <span className={`text-sm ${item.checked ? 'line-through text-muted-foreground' : ''}`}>
                {item.text}
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export function StructuredNoteView({ content, onContentChange }: StructuredNoteViewProps) {
  const [viewMode, setViewMode] = useState<'structured' | 'raw'>('structured');
  const [copiedAll, setCopiedAll] = useState(false);
  const [actionItems, setActionItems] = useState<ActionItem[]>([]);
  const [initialized, setInitialized] = useState(false);

  const { sections, actionItems: parsedItems } = useMemo(() => {
    return parseSOAPNote(content);
  }, [content]);

  // Initialize action items once
  useMemo(() => {
    if (!initialized && parsedItems.length > 0) {
      setActionItems(parsedItems);
      setInitialized(true);
    }
  }, [parsedItems, initialized]);

  const handleCopyAll = async () => {
    await navigator.clipboard.writeText(content);
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 2000);
  };

  const handleToggleActionItem = (index: number) => {
    setActionItems(prev =>
      prev.map((item, i) =>
        i === index ? { ...item, checked: !item.checked } : item
      )
    );
  };

  return (
    <div className="space-y-4">
      {/* Header with view toggle and copy all */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 bg-muted rounded-lg p-1">
          <Button
            variant={viewMode === 'structured' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('structured')}
            className="gap-2"
          >
            <LayoutList className="h-4 w-4" />
            Structured
          </Button>
          <Button
            variant={viewMode === 'raw' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('raw')}
            className="gap-2"
          >
            <FileCode className="h-4 w-4" />
            Raw
          </Button>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleCopyAll}
          className="gap-2"
        >
          {copiedAll ? (
            <>
              <CheckCircle className="h-4 w-4 text-green-600" />
              Copied!
            </>
          ) : (
            <>
              <Copy className="h-4 w-4" />
              Copy All
            </>
          )}
        </Button>
      </div>

      {viewMode === 'structured' ? (
        <div className="space-y-3">
          {/* SOAP Section Cards */}
          {sections.map((section, index) => (
            <SectionCard
              key={index}
              section={section}
              defaultExpanded={true}
            />
          ))}

          {/* Action Items */}
          {actionItems.length > 0 && (
            <ActionItemsCard
              items={actionItems}
              onToggle={handleToggleActionItem}
            />
          )}
        </div>
      ) : (
        <Card>
          <CardContent className="pt-4">
            <pre className="whitespace-pre-wrap text-sm font-mono leading-relaxed">
              {content}
            </pre>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
