'use client';

import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { SpeechInputButton } from './speech-input-button';

interface SpeechInputProps {
  id: string;
  name: string;
  label: string;
  value: string | undefined;
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  placeholder?: string;
  required?: boolean;
  multiline?: boolean;
  rows?: number;
  maxLength?: number;
  type?: string;
  min?: number;
  className?: string;
}

export function SpeechInput({
  id,
  name,
  label,
  value,
  onChange,
  placeholder,
  required = false,
  multiline = false,
  rows = 2,
  maxLength,
  type = 'text',
  min,
  className = '',
}: SpeechInputProps) {
  const handleSpeechTranscript = (transcript: string) => {
    // Create a synthetic event to match the onChange signature
    const currentValue = value || '';
    const syntheticEvent = {
      target: {
        name,
        value: currentValue ? `${currentValue} ${transcript}` : transcript,
      },
    } as React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>;
    onChange(syntheticEvent);
  };

  const displayValue = value || '';

  return (
    <div className={`space-y-2 ${className}`}>
      <div className="flex items-center justify-between">
        <Label htmlFor={id}>
          {label}
          {required && ' *'}
        </Label>
        <SpeechInputButton onTranscript={handleSpeechTranscript} />
      </div>
      {multiline ? (
        <Textarea
          id={id}
          name={name}
          placeholder={placeholder}
          value={displayValue}
          onChange={onChange}
          required={required}
          rows={rows}
          maxLength={maxLength}
        />
      ) : (
        <Input
          id={id}
          name={name}
          type={type}
          placeholder={placeholder}
          value={displayValue}
          onChange={onChange}
          required={required}
          maxLength={maxLength}
          min={min}
        />
      )}
    </div>
  );
}
