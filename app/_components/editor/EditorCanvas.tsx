'use client';

import React, { useMemo, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import {
  ReactFlow,
  Background,
  BackgroundVariant,
  Connection,
  Edge,
  ReactFlowProvider,
  useReactFlow,
  SelectionMode,
  reconnectEdge,
} from '@xyflow/react';
import { useShallow } from 'zustand/react/shallow';
import '@xyflow/react/dist/style.css';

import { useEditorStore } from '../../_store/useEditorStore';
import { AppNode, NodeType, AppEdge, OpenFMVAsset } from '../../_types';
import FloatingToolbar from './FloatingToolbar';
import PropertyPanel from './PropertyPanel';
import { getLayoutedElements } from '@/app/lib/autoLayout';

import AssetPicker from './AssetPicker';
import EditorLoading from './EditorLoading';
import { addAssetsToLocalProject, importAssetFromFile } from '@/app/_utils/localProjects';
import { isValidGraphConnection } from '@/app/_utils/graphRules';
import { getPickerAssetUpdate, PickerAsset } from './canvas/assetBinding';
import { edgeTypes, nodeTypes } from './canvas/flowTypes';
import { EmptyCanvasPrompt, FileDropOverlay, PendingConnectMenu, PendingConnectMenuState } from './canvas/CanvasOverlays';
import { createEditorNode, EditorNodeDefaults, getAvailableNodePosition } from './canvas/nodeFactory';
import {
  ConnectionStartState,
  createNodeDropConnection,
  createPendingNodeConnection,
  createPendingReconnectConnection,
  createReconnectToNodeConnection,
  getEventClientPoint,
} from './canvas/connectionStrategy';

const toPickerAsset = (asset: OpenFMVAsset): PickerAsset => ({
  id: asset.id,
  type: asset.type,
  url: asset.relativePath || asset.path,
  prompt: typeof asset.metadata?.title === 'string' ? asset.metadata.title : asset.name,
  metadata: asset.metadata || {},
  createdAt: new Date(asset.importedAt),
});

const createStoryNodeFromAsset = (asset: PickerAsset, position: { x: number; y: number }, currentNodes: AppNode[], fallbackTitle: string): AppNode | null => {
  if (asset.type === 'audio') return null;

  const node = createEditorNode('story', getAvailableNodePosition(position, currentNodes), currentNodes);
  const metadata = typeof asset.metadata === 'object' && asset.metadata ? asset.metadata as Record<string, unknown> : {};
  const title = typeof metadata.title === 'string' ? metadata.title : asset.prompt || fallbackTitle;
  const baseNode = {
    ...node,
    data: {
      ...node.data,
      title,
    },
  } as AppNode;
  const update = getPickerAssetUpdate(baseNode, asset);
  if (!update) return null;
  return {
    ...baseNode,
    data: {
      ...baseNode.data,
      ...update,
    },
  } as AppNode;
};

const EditorContent = ({ projectId }: { projectId?: string | null }) => {
  const t = useTranslations('editor');
  const assetsT = useTranslations('assets');
  const {
    nodes, 
    edges, 
    onNodesChange, 
    onEdgesChange, 
    onConnectStore, 
    addNode, 
    addNodeAndConnect,
    setSelectedNodeId, 
    setNodes, 
    setEdges, 
    reset,
    updateNodeData,
    currentProjectId,
    isAssetPickerOpen,
    setAssetPickerOpen,
    targetNodeIdForAsset,
    setTargetNodeIdForAsset
  } = useEditorStore(
    useShallow((state) => ({
      nodes: state.nodes,
      edges: state.edges,
      onNodesChange: state.onNodesChange,
      onEdgesChange: state.onEdgesChange,
      onConnectStore: state.onConnect,
      addNode: state.addNode,
      addNodeAndConnect: state.addNodeAndConnect,
      setSelectedNodeId: state.setSelectedNodeId,
      setNodes: state.setNodes,
      setEdges: state.setEdges,
      reset: state.reset,
      updateNodeData: state.updateNodeData,
      currentProjectId: state.currentProjectId,
      isAssetPickerOpen: state.isAssetPickerOpen,
      setAssetPickerOpen: state.setAssetPickerOpen,
      targetNodeIdForAsset: state.targetNodeIdForAsset,
      setTargetNodeIdForAsset: state.setTargetNodeIdForAsset
    }))
  );

  const [isInitialized, setIsInitialized] = React.useState(false);

  React.useEffect(() => {
    if (projectId && projectId !== currentProjectId) {
      setIsInitialized(false);
    } else {
      setIsInitialized(true);
    }
  }, [projectId, currentProjectId]);

  const [toolMode, setToolMode] = React.useState<'hand' | 'select'>('hand');
  const [pendingConnectMenu, setPendingConnectMenu] = React.useState<PendingConnectMenuState | null>(null);
  const [isFileDragging, setIsFileDragging] = React.useState(false);
  const skipNextPaneClickRef = React.useRef(false);
  const nodeDefaults = useMemo<EditorNodeDefaults>(() => ({
    startLabel: t('startNode'),
    endLabel: t('endNode'),
    storyTitlePrefix: t('storyTitlePrefix'),
  }), [t]);

  const { screenToFlowPosition, getViewport, fitView, getNodes: _getNodes, getEdges } = useReactFlow();
  const getNodes = useCallback(() => _getNodes() as unknown as AppNode[], [_getNodes]);

  const getClosestHandleId = useCallback(
    (nodeElement: Element, clientX: number, clientY: number, handleType: 'source' | 'target') => {
      const allHandles = Array.from(nodeElement.querySelectorAll('.react-flow__handle')) as HTMLElement[];
      if (!allHandles.length) return null;

      const handlesByType = allHandles.filter((handle) => {
        const className = handle.className;
        if (typeof className !== 'string') return false;
        return className.includes(`react-flow__handle-${handleType}`) || className.includes(` ${handleType} `) || className.endsWith(` ${handleType}`);
      });

      const candidateHandles = handlesByType.length ? handlesByType : allHandles;

      let closest: HTMLElement | null = null;
      let minDistance = Number.POSITIVE_INFINITY;

      for (const handle of candidateHandles) {
        const rect = handle.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        const dist = (cx - clientX) ** 2 + (cy - clientY) ** 2;
        if (dist < minDistance) {
          minDistance = dist;
          closest = handle;
        }
      }

      if (!closest) return null;
      return closest.getAttribute('data-handleid') ?? closest.getAttribute('data-id') ?? null;
    },
    []
  );

  const isValidConnection = useCallback((connection: Connection | Edge) => {
    return isValidGraphConnection(connection, getEdges(), getNodes());
  }, [getEdges, getNodes]);

  const onConnect = useCallback((params: Connection | Edge) => {
    onConnectStore(params as Connection);
  }, [onConnectStore]);

  const handleLayout = useCallback(() => {
    const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(
      getNodes(),
      getEdges()
    );

    setNodes([...layoutedNodes]);
    setEdges([...layoutedEdges]);

    window.requestAnimationFrame(() => {
        fitView({ duration: 400 });
    });
  }, [getNodes, getEdges, setNodes, setEdges, fitView]);

  const handleReset = useCallback(() => {
    if (confirm(t('resetCanvasConfirm'))) {
        reset();
    }
  }, [reset, t]);

  const handleClearCache = useCallback(() => {
    if (confirm(t('clearLocalCacheConfirm'))) {
        localStorage.removeItem('openfmv-editor-storage');
        window.location.reload();
    }
  }, [t]);

  const handleAssetSelect = useCallback((asset: PickerAsset) => {
    if (targetNodeIdForAsset) {
        const targetNode = getNodes().find(n => n.id === targetNodeIdForAsset);
        if (targetNode) {
            const update = getPickerAssetUpdate(targetNode, asset);
            if (update) updateNodeData(targetNode.id, update);
        }
        setTargetNodeIdForAsset(null);
        setAssetPickerOpen(false);
        return;
    }

    const centerX = window.innerWidth / 2;
    const centerY = window.innerHeight / 2;
    const position = screenToFlowPosition({ x: centerX, y: centerY });
    const currentNodes = getNodes();
    const newNode = createStoryNodeFromAsset(asset, position, currentNodes, t('assetStoryFallback'));
    if (newNode) addNode(newNode);
    if (!newNode) alert(assetsT('audioCannotBind'));
    setAssetPickerOpen(false);
  }, [addNode, assetsT, screenToFlowPosition, targetNodeIdForAsset, getNodes, updateNodeData, setAssetPickerOpen, setTargetNodeIdForAsset, t]);

  const displayEdges = useMemo(
    () =>
      edges.map((edge) => ({
        ...edge,
        type: 'comfy',
        reconnectable: true,
      })),
    [edges]
  );
  const handleAddNode = useCallback((type: NodeType) => {
    const { x, y, zoom } = getViewport();
    const centerX = window.innerWidth / 2;
    const centerY = window.innerHeight / 2;
    
    let position = screenToFlowPosition({ x: centerX, y: centerY });

    const currentNodes = getNodes();
    addNode(createEditorNode(type, getAvailableNodePosition(position, currentNodes), currentNodes, nodeDefaults));
  }, [addNode, getViewport, screenToFlowPosition, getNodes, nodeDefaults]);

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    const hasFiles = Array.from(event.dataTransfer.types).includes('Files');
    event.dataTransfer.dropEffect = hasFiles ? 'copy' : 'move';
    setIsFileDragging(hasFiles);
  }, []);

  const onDragLeave = useCallback((event: React.DragEvent) => {
    if (event.currentTarget.contains(event.relatedTarget as Node | null)) return;
    setIsFileDragging(false);
  }, []);

  const onDrop = useCallback(
    async (event: React.DragEvent) => {
      event.preventDefault();
      setIsFileDragging(false);

      if (event.dataTransfer.files.length > 0) {
        const dropPosition = screenToFlowPosition({
          x: event.clientX,
          y: event.clientY,
        });
        const importedAssets = await Promise.all(Array.from(event.dataTransfer.files).map((file) => importAssetFromFile(file)));
        await addAssetsToLocalProject(currentProjectId, importedAssets);

        const createdNodes: AppNode[] = [];
        for (const asset of importedAssets) {
          const newNode = createStoryNodeFromAsset(toPickerAsset(asset), {
            x: dropPosition.x + createdNodes.length * 34,
            y: dropPosition.y + createdNodes.length * 34,
          }, [...getNodes(), ...createdNodes], t('assetStoryFallback'));
          if (!newNode) continue;
          createdNodes.push(newNode);
        }

        createdNodes.forEach((node) => addNode(node));

        if (createdNodes.length < importedAssets.length) {
          alert(assetsT('audioCannotBind'));
        }
        return;
      }

      const type = event.dataTransfer.getData('application/reactflow') as NodeType;

      if (typeof type === 'undefined' || !type) {
        return;
      }

      const position = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      const currentNodes = getNodes();
      addNode(createEditorNode(type, getAvailableNodePosition(position, currentNodes), currentNodes, nodeDefaults));
    },
    [screenToFlowPosition, addNode, getNodes, currentProjectId, nodeDefaults, t, assetsT],
  );

  const connectionStartParams = React.useRef<ConnectionStartState>({ nodeId: null, handleId: null, handleType: null });

  const onConnectStart = useCallback((event: any, params: { nodeId: string | null; handleId: string | null; handleType: string | null }) => {
    connectionStartParams.current = params;
    setPendingConnectMenu(null);
  }, []);

  const onConnectEnd = useCallback(
    (event: MouseEvent | TouchEvent) => {
      const currentNodes = getNodes();
      const { nodeId, handleId, handleType } = connectionStartParams.current;
      const fromNode = nodeId ? currentNodes.find((n) => n.id === nodeId) : null;
      
      if (!fromNode) return;

      const { x: clientX, y: clientY } = getEventClientPoint(event);
      const targetElement = document.elementFromPoint(clientX, clientY);
      const targetHandleElement = targetElement?.closest('.react-flow__handle');
      const targetNodeElement = targetElement?.closest('.react-flow__node');

      if (targetHandleElement) {
        setPendingConnectMenu(null);
        return;
      }
      
      if (targetNodeElement) {
        const targetNodeId = targetNodeElement.getAttribute('data-id');
        if (targetNodeId && targetNodeId !== fromNode.id) {
          const snappedHandleId = getClosestHandleId(
            targetNodeElement,
            clientX,
            clientY,
            handleType === 'target' ? 'source' : 'target'
          );

          const connection = createNodeDropConnection(connectionStartParams.current, targetNodeId, snappedHandleId);

          if (connection && isValidConnection(connection)) {
            onConnectStore(connection);
          }
        }
        setPendingConnectMenu(null);
        return;
      }

      setPendingConnectMenu({
        kind: 'connect',
        x: clientX,
        y: clientY,
        nodeId: fromNode.id,
        handleId,
        handleType,
      });
      skipNextPaneClickRef.current = true;
    },
    [getNodes, onConnectStore, getClosestHandleId, isValidConnection],
  );

  const onNodeClick = useCallback((event: React.MouseEvent, node: AppNode) => {
    setSelectedNodeId(node.id);
  }, [setSelectedNodeId]);

  const onPaneClick = useCallback(() => {
    if (skipNextPaneClickRef.current) {
      skipNextPaneClickRef.current = false;
      return;
    }

    setSelectedNodeId(null);
    setPendingConnectMenu(null);
  }, [setSelectedNodeId]);

  const createNodeFromPendingConnection = useCallback(
    (type: NodeType) => {
      if (!pendingConnectMenu) return;

      const currentNodes = getNodes();
      const position = screenToFlowPosition({
        x: pendingConnectMenu.x,
        y: pendingConnectMenu.y,
      });
      const newNode = createEditorNode(type, getAvailableNodePosition(position, currentNodes), currentNodes, nodeDefaults);

      if (pendingConnectMenu.kind === 'connect') {
        const connection = createPendingNodeConnection(newNode.id, pendingConnectMenu.nodeId, pendingConnectMenu.handleId, pendingConnectMenu.handleType);
        addNodeAndConnect(newNode, connection);
      } else {
        const currentEdges = getEdges();
        const oldEdge = currentEdges.find((edge) => edge.id === pendingConnectMenu.edgeId);
        if (!oldEdge) {
          setPendingConnectMenu(null);
          return;
        }

        addNode(newNode);

        const reconnectConnection = createPendingReconnectConnection(oldEdge, newNode.id, pendingConnectMenu.handleType);
        const reconnectedEdges = reconnectEdge(oldEdge, reconnectConnection, currentEdges);
        setEdges(reconnectedEdges as AppEdge[]);
      }

      setPendingConnectMenu(null);
    },
    [pendingConnectMenu, getNodes, getEdges, screenToFlowPosition, addNodeAndConnect, addNode, setEdges, nodeDefaults]
  );

  const onReconnect = useCallback(
    (oldEdge: Edge, newConnection: Connection) => {
      const reconnectedEdges = reconnectEdge(oldEdge, newConnection, getEdges());
      setEdges(reconnectedEdges as AppEdge[]);
    },
    [getEdges, setEdges]
  );

  const onReconnectEnd = useCallback(
    (
      event: MouseEvent | TouchEvent,
      edge: Edge,
      handleType: string,
      connectionState: { toNode: unknown | null; isValid: boolean | null }
    ) => {
      if (connectionState.toNode || connectionState.isValid) {
        setPendingConnectMenu(null);
        return;
      }

      const { x: clientX, y: clientY } = getEventClientPoint(event);
      const targetElement = document.elementFromPoint(clientX, clientY);
      const targetNodeElement = targetElement?.closest('.react-flow__node');

      if (targetNodeElement) {
        const targetNodeId = targetNodeElement.getAttribute('data-id');
        if (targetNodeId) {
          const snappedHandleId = getClosestHandleId(targetNodeElement, clientX, clientY, handleType === 'source' ? 'source' : 'target');
          const reconnectConnection = createReconnectToNodeConnection(edge, handleType, targetNodeId, snappedHandleId);

          if (reconnectConnection && reconnectConnection.source !== reconnectConnection.target) {
            const reconnectedEdges = reconnectEdge(edge, reconnectConnection, getEdges());
            setEdges(reconnectedEdges as AppEdge[]);
            setPendingConnectMenu(null);
            return;
          }
        }
      }

      setPendingConnectMenu({
        kind: 'reconnect',
        x: clientX,
        y: clientY,
        edgeId: edge.id,
        handleType,
      });
      skipNextPaneClickRef.current = true;
    },
    [getClosestHandleId, getEdges, setEdges]
  );

  if (projectId && !isInitialized) {
    return (
      <EditorLoading />
    );
  }

  const showCanvasPrompt = nodes.length === 0;

  return (
    <div className="openfmv-infinite-canvas relative h-full w-full" onDragOver={onDragOver} onDragLeave={onDragLeave} onDrop={onDrop}>
      <ReactFlow
        nodes={nodes}
        edges={displayEdges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onReconnect={onReconnect}
        onReconnectEnd={onReconnectEnd}
        onConnectStart={onConnectStart}
        onConnectEnd={onConnectEnd}
        onNodeClick={onNodeClick}
        onPaneClick={onPaneClick}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        isValidConnection={isValidConnection}
        connectionRadius={32}
        reconnectRadius={16}
        fitView
        fitViewOptions={{ padding: 0.5, minZoom: 0.5, maxZoom: 1 }}
        snapToGrid={true}
        snapGrid={[15, 15]}
        defaultEdgeOptions={{ type: 'comfy', animated: false, reconnectable: true, style: { strokeWidth: 2, stroke: '#94a3b8' } }}
        edgesReconnectable
        deleteKeyCode={['Backspace', 'Delete']}
        selectionKeyCode="Shift"
        multiSelectionKeyCode="Shift"
        panOnScroll={false}
        zoomOnScroll={true}
        panOnDrag={toolMode === 'hand'}
        selectionOnDrag={toolMode === 'select'}
        selectionMode={SelectionMode.Partial}
        zoomOnDoubleClick={true}
        minZoom={0.1}
        maxZoom={4}
        proOptions={{ hideAttribution: true }}
        className="openfmv-flow-surface"
      >
        <Background variant={BackgroundVariant.Dots} gap={24} size={1.1} color="rgba(255,255,255,0.15)" />
      </ReactFlow>

      {showCanvasPrompt && (
        <EmptyCanvasPrompt onAddNode={handleAddNode} />
      )}

      {isFileDragging && (
        <FileDropOverlay />
      )}
      {!isAssetPickerOpen && (
        <FloatingToolbar
          onAddNode={handleAddNode}
          onLayout={handleLayout}
          toolMode={toolMode}
          onToolModeChange={setToolMode}
          onOpenAssets={() => setAssetPickerOpen(true)}
        />
      )}
      <PropertyPanel />
      
      <AssetPicker 
        isOpen={isAssetPickerOpen} 
        onClose={() => setAssetPickerOpen(false)}
        onSelect={handleAssetSelect}
      />
      
      {pendingConnectMenu && (
        <PendingConnectMenu
          menu={pendingConnectMenu}
          onCreateNode={createNodeFromPendingConnection}
          onCancel={() => setPendingConnectMenu(null)}
        />
      )}
    </div>
  );
};

export default function EditorCanvas({ projectId }: { projectId?: string | null }) {
  return (
    <ReactFlowProvider>
      <EditorContent projectId={projectId} />
    </ReactFlowProvider>
  );
}




