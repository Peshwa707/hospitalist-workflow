'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Settings,
  Key,
  CheckCircle2,
  XCircle,
  Loader2,
  Eye,
  EyeOff,
  Save,
  RefreshCw,
} from 'lucide-react';

type ApiProvider = 'anthropic' | 'openai' | 'google' | 'groq';

interface ApiKeyStatus {
  configured: boolean;
  source: 'database' | 'environment' | 'none';
}

interface SettingsData {
  apiKeys: Record<string, ApiKeyStatus>;
  defaultProvider: ApiProvider;
  providers: ApiProvider[];
}

const providerLabels: Record<ApiProvider, string> = {
  anthropic: 'Anthropic (Claude)',
  openai: 'OpenAI (GPT)',
  google: 'Google (Gemini)',
  groq: 'Groq',
};

const providerDescriptions: Record<ApiProvider, string> = {
  anthropic: 'Powers most analysis features (Claude Sonnet/Haiku)',
  openai: 'Used for embeddings and alternative analysis',
  google: 'Google AI Studio / Gemini models',
  groq: 'Fast inference for supported models',
};

export default function SettingsPage() {
  const [settings, setSettings] = useState<SettingsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<Record<string, { valid: boolean; error?: string }>>({});

  // Form state for API keys (only store new values being entered)
  const [apiKeyInputs, setApiKeyInputs] = useState<Record<string, string>>({});
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});
  const [defaultProvider, setDefaultProvider] = useState<ApiProvider>('anthropic');

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/settings');
      if (response.ok) {
        const data: SettingsData = await response.json();
        setSettings(data);
        setDefaultProvider(data.defaultProvider);
      }
    } catch (error) {
      console.error('Failed to fetch settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const response = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apiKeys: apiKeyInputs,
          defaultProvider,
        }),
      });

      if (response.ok) {
        // Clear inputs after successful save
        setApiKeyInputs({});
        // Refresh settings
        await fetchSettings();
      }
    } catch (error) {
      console.error('Failed to save settings:', error);
    } finally {
      setSaving(false);
    }
  };

  const testApiKey = async (provider: ApiProvider) => {
    setTesting(provider);
    try {
      const response = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider,
          apiKey: apiKeyInputs[provider] || undefined,
        }),
      });

      if (response.ok) {
        const result = await response.json();
        setTestResults((prev) => ({ ...prev, [provider]: result }));
      }
    } catch (error) {
      setTestResults((prev) => ({
        ...prev,
        [provider]: { valid: false, error: 'Test failed' },
      }));
    } finally {
      setTesting(null);
    }
  };

  const clearApiKey = async (provider: ApiProvider) => {
    setApiKeyInputs((prev) => ({ ...prev, [provider]: '' }));
    // Save empty string to clear from database
    try {
      await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apiKeys: { [provider]: '' },
        }),
      });
      await fetchSettings();
      setTestResults((prev) => {
        const newResults = { ...prev };
        delete newResults[provider];
        return newResults;
      });
    } catch (error) {
      console.error('Failed to clear API key:', error);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto py-6 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Settings className="h-6 w-6" />
          Settings
        </h1>
        <p className="text-muted-foreground">
          Configure API keys and application preferences
        </p>
      </div>

      {/* API Keys Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            API Keys
          </CardTitle>
          <CardDescription>
            Configure API keys for different AI providers. Keys stored in the database take precedence over environment variables.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {settings?.providers.map((provider) => {
            const status = settings.apiKeys[provider];
            const testResult = testResults[provider];

            return (
              <div key={provider} className="space-y-2 p-4 border rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-base font-medium">
                      {providerLabels[provider]}
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      {providerDescriptions[provider]}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {status?.configured ? (
                      <Badge
                        variant="outline"
                        className={
                          status.source === 'database'
                            ? 'bg-green-50 text-green-700 border-green-200'
                            : 'bg-blue-50 text-blue-700 border-blue-200'
                        }
                      >
                        {status.source === 'database' ? 'Database' : 'Environment'}
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="bg-gray-50 text-gray-500">
                        Not configured
                      </Badge>
                    )}
                  </div>
                </div>

                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Input
                      type={showKeys[provider] ? 'text' : 'password'}
                      placeholder={status?.configured ? '••••••••••••••••' : 'Enter API key'}
                      value={apiKeyInputs[provider] || ''}
                      onChange={(e) =>
                        setApiKeyInputs((prev) => ({ ...prev, [provider]: e.target.value }))
                      }
                      className="pr-10"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
                      onClick={() =>
                        setShowKeys((prev) => ({ ...prev, [provider]: !prev[provider] }))
                      }
                    >
                      {showKeys[provider] ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => testApiKey(provider)}
                    disabled={testing === provider}
                  >
                    {testing === provider ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      'Test'
                    )}
                  </Button>
                  {status?.configured && status.source === 'database' && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => clearApiKey(provider)}
                      className="text-red-600 hover:text-red-700"
                    >
                      Clear
                    </Button>
                  )}
                </div>

                {testResult && (
                  <div
                    className={`flex items-center gap-2 text-sm ${
                      testResult.valid ? 'text-green-600' : 'text-red-600'
                    }`}
                  >
                    {testResult.valid ? (
                      <>
                        <CheckCircle2 className="h-4 w-4" />
                        API key is valid
                      </>
                    ) : (
                      <>
                        <XCircle className="h-4 w-4" />
                        {testResult.error || 'API key is invalid'}
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Default Provider Section */}
      <Card>
        <CardHeader>
          <CardTitle>Default Provider</CardTitle>
          <CardDescription>
            Select the default AI provider for analysis features
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <Select value={defaultProvider} onValueChange={(v) => setDefaultProvider(v as ApiProvider)}>
              <SelectTrigger className="w-64">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {settings?.providers.map((provider) => (
                  <SelectItem key={provider} value={provider}>
                    {providerLabels[provider]}
                    {!settings.apiKeys[provider]?.configured && (
                      <span className="text-muted-foreground ml-2">(not configured)</span>
                    )}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={fetchSettings}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              Save Settings
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
