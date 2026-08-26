import type { ModelAliasRoute } from '@/modules/config/types';
import { isImageProxyExampleModel } from './proxy-example-models';

export interface ClaudeMappingDefinition {
  sourceAliases: readonly string[];
  defaultTarget: string;
}

export const CLAUDE_SONNET_MAPPING: ClaudeMappingDefinition = {
  sourceAliases: ['claude-sonnet-4-6-20260219', 'claude-sonnet-4-5-20250929'],
  defaultTarget: 'claude-sonnet-4-6-thinking',
};

export const CLAUDE_OPUS_MAPPING: ClaudeMappingDefinition = {
  sourceAliases: ['claude-opus-4-6-20260201', 'opus'],
  defaultTarget: 'claude-opus-4-6-thinking',
};

interface ClaudeMappingModel {
  id: string;
}

export function buildClaudeMappingTargets(
  models: readonly ClaudeMappingModel[],
  configuredTarget?: string,
): string[] {
  const targets: string[] = [];
  const normalizedTargets = new Set<string>();

  for (const rawTarget of [...models.map((model) => model.id), configuredTarget]) {
    const target = rawTarget?.trim();
    if (!target || isImageProxyExampleModel(target)) {
      continue;
    }

    const normalizedTarget = target.toLowerCase();
    if (normalizedTargets.has(normalizedTarget)) {
      continue;
    }

    normalizedTargets.add(normalizedTarget);
    targets.push(target);
  }

  return targets;
}

export function resolveClaudeMappingTarget(
  routes: readonly ModelAliasRoute[],
  mapping: ClaudeMappingDefinition,
): string {
  for (const alias of mapping.sourceAliases) {
    const configuredRoute = routes.find((route) => route.alias === alias && route.target.trim());
    if (configuredRoute) {
      return configuredRoute.target.trim();
    }
  }

  return mapping.defaultTarget;
}

export function upsertClaudeMappingTarget(
  routes: readonly ModelAliasRoute[],
  mapping: ClaudeMappingDefinition,
  target: string,
): ModelAliasRoute[] {
  const managedAliases = new Set(mapping.sourceAliases);
  const updatedAliases = new Set<string>();
  const nextRoutes = routes.map((route) => {
    if (!managedAliases.has(route.alias)) {
      return route;
    }

    updatedAliases.add(route.alias);
    return { ...route, target, enabled: true };
  });

  for (const alias of mapping.sourceAliases) {
    if (!updatedAliases.has(alias)) {
      nextRoutes.push({ alias, target, enabled: true });
    }
  }

  return nextRoutes;
}

export function restoreDefaultClaudeMappings(
  routes: readonly ModelAliasRoute[],
): ModelAliasRoute[] {
  const sonnetRoutes = upsertClaudeMappingTarget(
    routes,
    CLAUDE_SONNET_MAPPING,
    CLAUDE_SONNET_MAPPING.defaultTarget,
  );

  return upsertClaudeMappingTarget(
    sonnetRoutes,
    CLAUDE_OPUS_MAPPING,
    CLAUDE_OPUS_MAPPING.defaultTarget,
  );
}
