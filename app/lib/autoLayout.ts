import dagre from 'dagre';
import { AppNode, AppEdge } from '../_types';
import { Position } from '@xyflow/react';

const nodeWidth = 300;
const nodeHeight = 150;

/**
 * Finds all connected components (subgraphs) in the graph.
 * Returns an array of node ID arrays, where each array represents a connected subgraph.
 */
const findConnectedComponents = (nodes: AppNode[], edges: AppEdge[]): string[][] => {
  const adj = new Map<string, string[]>();
  
  // Initialize adjacency list
  nodes.forEach(node => adj.set(node.id, []));
  
  // Build undirected graph for connectivity check
  edges.forEach(edge => {
    if (adj.has(edge.source)) adj.get(edge.source)?.push(edge.target);
    if (adj.has(edge.target)) adj.get(edge.target)?.push(edge.source);
  });

  const visited = new Set<string>();
  const components: string[][] = [];

  nodes.forEach(node => {
    if (!visited.has(node.id)) {
      const component: string[] = [];
      const stack = [node.id];
      visited.add(node.id);

      while (stack.length > 0) {
        const curr = stack.pop()!;
        component.push(curr);

        const neighbors = adj.get(curr) || [];
        neighbors.forEach(neighbor => {
          if (!visited.has(neighbor)) {
            visited.add(neighbor);
            stack.push(neighbor);
          }
        });
      }
      components.push(component);
    }
  });

  return components;
};

export const getLayoutedElements = (nodes: AppNode[], edges: AppEdge[], direction = 'LR') => {
  const isHorizontal = direction === 'LR';
  
  // 1. Identify independent subgraphs
  const components = findConnectedComponents(nodes, edges);
  
  let allLayoutedNodes: AppNode[] = [];
  
  // 2. Layout each subgraph independently
  // We'll arrange subgraphs vertically by default to keep them distinct
  let currentYOffset = 0;

  components.forEach(componentNodeIds => {
    const subgraphNodes = nodes.filter(n => componentNodeIds.includes(n.id));
    const subgraphEdges = edges.filter(e => componentNodeIds.includes(e.source) && componentNodeIds.includes(e.target));
    
    if (subgraphNodes.length === 0) return;

    const dagreGraph = new dagre.graphlib.Graph();
    dagreGraph.setDefaultEdgeLabel(() => ({}));
    
    dagreGraph.setGraph({ 
      rankdir: direction,
      align: 'UL',
      ranksep: 100,
      nodesep: 30,
    });

    subgraphNodes.forEach((node) => {
      dagreGraph.setNode(node.id, { width: nodeWidth, height: nodeHeight });
    });

    subgraphEdges.forEach((edge) => {
      dagreGraph.setEdge(edge.source, edge.target);
    });

    dagre.layout(dagreGraph);

    // Get subgraph bounds to stack them
    let minX = Infinity;
    let minY = Infinity;
    let maxY = -Infinity;

    const layoutedSubgraph = subgraphNodes.map(node => {
      const nodeWithPosition = dagreGraph.node(node.id);
      
      // Initial local position from dagre
      const x = nodeWithPosition.x - nodeWidth / 2;
      const y = nodeWithPosition.y - nodeHeight / 2;

      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y + nodeHeight);

      return {
        ...node,
        targetPosition: isHorizontal ? Position.Left : Position.Top,
        sourcePosition: isHorizontal ? Position.Right : Position.Bottom,
        position: { x, y },
        style: { ...node.style, opacity: 1 },
      };
    });

    // Shift subgraph to start at x=0 and stack vertically below previous subgraph
    // Add some padding between subgraphs (e.g. 100px)
    const subgraphHeight = maxY - minY;
    
    const finalSubgraph = layoutedSubgraph.map(node => ({
      ...node,
      position: {
        x: node.position.x - minX, // Align to left edge 0
        y: node.position.y - minY + currentYOffset // Stack vertically
      }
    }));

    allLayoutedNodes = [...allLayoutedNodes, ...finalSubgraph];
    
    // Update offset for next subgraph
    currentYOffset += subgraphHeight + 200; // 200px gap between independent trees
  });

  return { nodes: allLayoutedNodes, edges };
};
