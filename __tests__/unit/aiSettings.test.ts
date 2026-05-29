import { describe, expect, it } from 'vitest';

import { getDefaultOpenFMVAiConfig, normalizeOpenFMVAiConfig, openfmvAgentDefinitions } from '@/app/_utils/aiSettings';

describe('OpenFMV AI settings config', () => {
  it('creates defaults for local CLI execution, media providers, and Codex reasoning', () => {
    const config = getDefaultOpenFMVAiConfig();

    expect(config.executionMode).toBe('cli');
    expect(config.selectedCliAgentId).toBe('codex');
    expect(config.cliSelections.find((item) => item.agentId === 'codex')?.reasoningEffort).toBe('medium');
    expect(config.mediaProviders.map((item) => item.providerId)).toContain('openai-image');
    expect(config.mediaProviders.map((item) => item.providerId)).toContain('minimax-tts');
  });

  it('forces local CLI execution and drops unknown providers and agents while preserving known values', () => {
    const config = normalizeOpenFMVAiConfig({
      executionMode: 'byok',
      selectedCliAgentId: 'unknown',
      selectedByokProviderId: 'google-gemini',
      cliSelections: [
        { agentId: 'codex', model: 'gpt-5', reasoningEffort: 'high' },
        { agentId: 'ghost', model: 'ghost-model' },
      ],
      byokProviders: [
        { providerId: 'anthropic', apiKey: 'anthropic-key', baseUrl: 'https://example.com', model: 'claude-test' },
        { providerId: 'ghost', apiKey: 'ghost-key', baseUrl: 'https://ghost.test', model: 'ghost-model' },
      ],
      mediaProviders: [
        { providerId: 'openai-image', apiKey: 'image-key', baseUrl: 'https://image.test', model: 'image-model' },
        { providerId: 'ghost-media', apiKey: 'ghost-key', baseUrl: 'https://ghost.test', model: 'ghost-model' },
      ],
    });

    expect(config.executionMode).toBe('cli');
    expect(config.selectedCliAgentId).toBe('codex');
    expect(config.selectedByokProviderId).toBe('google-gemini');
    expect(config.cliSelections).toHaveLength(openfmvAgentDefinitions.length);
    expect(config.cliSelections.find((item) => item.agentId === 'codex')).toMatchObject({ model: 'codex-default', reasoningEffort: 'high' });
    expect(config.byokProviders.find((item) => item.providerId === 'anthropic')).toMatchObject({ apiKey: 'anthropic-key', baseUrl: 'https://example.com', model: 'claude-test' });
    expect(config.mediaProviders.find((item) => item.providerId === 'openai-image')).toMatchObject({ apiKey: 'image-key', baseUrl: 'https://image.test', model: 'image-model' });
    expect(config.byokProviders.some((item) => item.providerId === ('ghost' as never))).toBe(false);
    expect(config.mediaProviders.some((item) => item.providerId === ('ghost-media' as never))).toBe(false);
  });
});
