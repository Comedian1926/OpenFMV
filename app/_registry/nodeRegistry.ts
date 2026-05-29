import type { AppNode, NodeType } from '../_types';
import { NODE_DEFINITIONS, NodeDefinition, NodeFactoryContext, NodeMenuPlacement } from './nodeDefinitions';

class NodeRegistry {
  private definitions = new Map<NodeType, NodeDefinition>();

  constructor(definitions: NodeDefinition[]) {
    definitions.forEach((definition) => {
      this.definitions.set(definition.type, definition);
    });
  }

  get(type: NodeType): NodeDefinition | undefined {
    return this.definitions.get(type);
  }

  getAll(): NodeDefinition[] {
    return Array.from(this.definitions.values());
  }

  getByPlacement(placement: NodeMenuPlacement): NodeDefinition[] {
    return this.getAll().filter((definition) => definition.menuPlacement[placement]);
  }

  createDefaultData(type: NodeType, context?: Partial<NodeFactoryContext>): AppNode['data'] {
    const definition = this.get(type);
    if (!definition) {
      throw new Error(`[NodeRegistry] Unknown node type: ${type}`);
    }
    return definition.createDefaultData({ storyCount: context?.storyCount ?? 0 });
  }
}

export const nodeRegistry = new NodeRegistry(NODE_DEFINITIONS);
