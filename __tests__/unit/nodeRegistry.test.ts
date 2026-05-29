import { describe, expect, it } from 'vitest';

import { nodeRegistry } from '@/app/_registry/nodeRegistry';

describe('nodeRegistry', () => {
  it('creates valid default data for every toolbar and quick-add node type', () => {
    const definitions = [
      ...nodeRegistry.getByPlacement('toolbar'),
      ...nodeRegistry.getByPlacement('quickAdd'),
    ];
    const uniqueDefinitions = Array.from(new Map(definitions.map((definition) => [definition.type, definition])).values());

    for (const definition of uniqueDefinitions) {
      const data = nodeRegistry.createDefaultData(definition.type, { storyCount: 2 });
      expect(data.type).toBe(definition.type);
    }
  });

  it('does not expose removed route-only surfaces as node types', () => {
    const nodeTypes = nodeRegistry.getAll().map((definition) => definition.type);

    expect(nodeTypes).not.toContain('generate');
    expect(nodeTypes).not.toContain('engine');
    expect(nodeTypes).not.toContain('admin');
    expect(nodeTypes).not.toContain('branch');
    expect(nodeTypes).not.toContain('asset');
  });
});
