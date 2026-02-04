import { NextResponse } from 'next/server';
import {
  getApiKey,
  setApiKey,
  getDefaultProvider,
  setDefaultProvider,
  getAllSettings,
  type ApiProvider,
} from '@/lib/db';

const PROVIDERS: ApiProvider[] = ['anthropic', 'openai', 'google', 'groq'];

export async function GET() {
  try {
    // Get all API key statuses (don't return actual keys for security)
    const apiKeys: Record<string, { configured: boolean; source: 'database' | 'environment' | 'none' }> = {};

    for (const provider of PROVIDERS) {
      const key = getApiKey(provider);
      const allSettings = getAllSettings();
      const dbKey = allSettings[`api_key_${provider}`];

      if (dbKey) {
        apiKeys[provider] = { configured: true, source: 'database' };
      } else if (key) {
        apiKeys[provider] = { configured: true, source: 'environment' };
      } else {
        apiKeys[provider] = { configured: false, source: 'none' };
      }
    }

    const defaultProvider = getDefaultProvider();

    return NextResponse.json({
      apiKeys,
      defaultProvider,
      providers: PROVIDERS,
    });
  } catch (error) {
    console.error('Settings fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch settings' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Update API keys
    if (body.apiKeys) {
      for (const provider of PROVIDERS) {
        if (body.apiKeys[provider] !== undefined) {
          const value = body.apiKeys[provider];
          // Empty string or null clears the key
          setApiKey(provider, value || null);
        }
      }
    }

    // Update default provider
    if (body.defaultProvider && PROVIDERS.includes(body.defaultProvider)) {
      setDefaultProvider(body.defaultProvider);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Settings update error:', error);
    return NextResponse.json(
      { error: 'Failed to update settings' },
      { status: 500 }
    );
  }
}

// Test API key endpoint
export async function PUT(request: Request) {
  try {
    const { provider, apiKey } = await request.json();

    if (!provider || !PROVIDERS.includes(provider)) {
      return NextResponse.json(
        { error: 'Invalid provider' },
        { status: 400 }
      );
    }

    const keyToTest = apiKey || getApiKey(provider as ApiProvider);
    if (!keyToTest) {
      return NextResponse.json(
        { valid: false, error: 'No API key configured' },
        { status: 200 }
      );
    }

    // Test the API key by making a simple request
    let valid = false;
    let error = '';

    try {
      if (provider === 'anthropic') {
        const response = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': keyToTest,
            'anthropic-version': '2023-06-01',
          },
          body: JSON.stringify({
            model: 'claude-3-5-haiku-20241022',
            max_tokens: 10,
            messages: [{ role: 'user', content: 'Hi' }],
          }),
        });

        if (response.ok || response.status === 200) {
          valid = true;
        } else {
          const data = await response.json();
          error = data.error?.message || `HTTP ${response.status}`;
        }
      } else if (provider === 'openai') {
        const response = await fetch('https://api.openai.com/v1/models', {
          headers: {
            'Authorization': `Bearer ${keyToTest}`,
          },
        });

        if (response.ok) {
          valid = true;
        } else {
          const data = await response.json();
          error = data.error?.message || `HTTP ${response.status}`;
        }
      } else if (provider === 'google') {
        // Google AI Studio API test
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models?key=${keyToTest}`
        );

        if (response.ok) {
          valid = true;
        } else {
          const data = await response.json();
          error = data.error?.message || `HTTP ${response.status}`;
        }
      } else if (provider === 'groq') {
        const response = await fetch('https://api.groq.com/openai/v1/models', {
          headers: {
            'Authorization': `Bearer ${keyToTest}`,
          },
        });

        if (response.ok) {
          valid = true;
        } else {
          const data = await response.json();
          error = data.error?.message || `HTTP ${response.status}`;
        }
      }
    } catch (err) {
      error = err instanceof Error ? err.message : 'Connection failed';
    }

    return NextResponse.json({ valid, error: error || undefined });
  } catch (error) {
    console.error('API key test error:', error);
    return NextResponse.json(
      { error: 'Failed to test API key' },
      { status: 500 }
    );
  }
}
