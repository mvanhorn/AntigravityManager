import { describe, expect, it } from 'vitest';

import {
  CLAUDE_OPUS_MAPPING,
  CLAUDE_SONNET_MAPPING,
  buildClaudeMappingTargets,
  resolveClaudeMappingTarget,
  restoreDefaultClaudeMappings,
  upsertClaudeMappingTarget,
} from '@/modules/proxy-gateway/components/claude-model-mapping';
import { buildProxyExampleModels } from '@/modules/proxy-gateway/components/proxy-example-models';
import type { ModelAliasRoute } from '@/modules/config/types';

describe('Claude model mapping', () => {
  it('exposes every account-advertised Gemini 3.6 Flash variant once', () => {
    const targets = buildClaudeMappingTargets([
      { id: 'gemini-3.6-flash-low' },
      { id: 'gemini-3.6-flash-medium' },
      { id: 'gemini-3.6-flash-high' },
      { id: 'gemini-3.6-flash-tiered' },
      { id: 'GEMINI-3.6-FLASH-HIGH' },
    ]);

    expect(targets).toEqual([
      'gemini-3.6-flash-low',
      'gemini-3.6-flash-medium',
      'gemini-3.6-flash-high',
      'gemini-3.6-flash-tiered',
    ]);
  });

  it('excludes image models while retaining Claude and Gemini text fallbacks', () => {
    const targets = buildClaudeMappingTargets(buildProxyExampleModels([]));

    expect(targets).toContain('gemini-3-flash');
    expect(targets).toContain('claude-sonnet-4-6-thinking');
    expect(targets).toContain('claude-opus-4-6-thinking');
    expect(targets.some((target) => target.includes('image'))).toBe(false);
  });

  it('retains a configured target that is absent from the live catalog', () => {
    expect(
      buildClaudeMappingTargets([{ id: 'gemini-3-flash' }], 'gemini-3.6-flash-preview'),
    ).toEqual(['gemini-3-flash', 'gemini-3.6-flash-preview']);
  });

  it('resolves a card target from any managed source alias, including a disabled route', () => {
    expect(
      resolveClaudeMappingTarget(
        [
          {
            alias: CLAUDE_SONNET_MAPPING.sourceAliases[1],
            target: 'gemini-3.6-flash-high',
            enabled: false,
          },
        ],
        CLAUDE_SONNET_MAPPING,
      ),
    ).toBe('gemini-3.6-flash-high');
  });

  it('updates and enables every alias represented by a card without moving unrelated routes', () => {
    const routes: ModelAliasRoute[] = [
      { alias: 'custom-first', target: 'custom-target', enabled: false },
      {
        alias: CLAUDE_SONNET_MAPPING.sourceAliases[0],
        target: 'old-sonnet-target',
        enabled: false,
      },
      { alias: 'custom-last', target: 'other-target', enabled: true },
    ];

    expect(
      upsertClaudeMappingTarget(routes, CLAUDE_SONNET_MAPPING, 'gemini-3.6-flash-high'),
    ).toEqual([
      { alias: 'custom-first', target: 'custom-target', enabled: false },
      {
        alias: CLAUDE_SONNET_MAPPING.sourceAliases[0],
        target: 'gemini-3.6-flash-high',
        enabled: true,
      },
      { alias: 'custom-last', target: 'other-target', enabled: true },
      {
        alias: CLAUDE_SONNET_MAPPING.sourceAliases[1],
        target: 'gemini-3.6-flash-high',
        enabled: true,
      },
    ]);
  });

  it('restores only managed Sonnet and Opus aliases to their defaults', () => {
    const routes: ModelAliasRoute[] = [
      { alias: 'custom-first', target: 'custom-target', enabled: false },
      ...CLAUDE_OPUS_MAPPING.sourceAliases.map((alias) => ({
        alias,
        target: 'gemini-3.6-flash-low',
        enabled: false,
      })),
      ...CLAUDE_SONNET_MAPPING.sourceAliases.map((alias) => ({
        alias,
        target: 'gemini-3.6-flash-medium',
        enabled: true,
      })),
      { alias: 'custom-last', target: 'other-target', enabled: true },
    ];

    expect(restoreDefaultClaudeMappings(routes)).toEqual([
      { alias: 'custom-first', target: 'custom-target', enabled: false },
      ...CLAUDE_OPUS_MAPPING.sourceAliases.map((alias) => ({
        alias,
        target: CLAUDE_OPUS_MAPPING.defaultTarget,
        enabled: true,
      })),
      ...CLAUDE_SONNET_MAPPING.sourceAliases.map((alias) => ({
        alias,
        target: CLAUDE_SONNET_MAPPING.defaultTarget,
        enabled: true,
      })),
      { alias: 'custom-last', target: 'other-target', enabled: true },
    ]);
  });
});
