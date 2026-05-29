import type { LucideIcon } from 'lucide-react';
import { FileText, Flag, Play, Video } from 'lucide-react';
import type { AppNode, NodeType } from '../_types';

export type NodeCategory = 'flow-control' | 'story' | 'interaction' | 'media';

export type NodeMenuPlacement = 'toolbar' | 'pendingConnect' | 'edgeMenu' | 'quickAdd';

export interface NodeFactoryContext {
  storyCount: number;
}

export interface NodeDefinition {
  type: NodeType;
  category: NodeCategory;
  displayName: string;
  menuDescription: string;
  headerLabel: string;
  icon: LucideIcon;
  iconColorClass: string;
  menuPlacement: Record<NodeMenuPlacement, boolean>;
  createDefaultData: (context: NodeFactoryContext) => AppNode['data'];
}

export const NODE_DEFINITIONS: NodeDefinition[] = [
  {
    type: 'start',
    category: 'flow-control',
    displayName: '开始节点',
    menuDescription: '故事入口',
    headerLabel: 'ENTRY POINT',
    icon: Play,
    iconColorClass: 'bg-white/[0.08] text-openfmv-sub',
    menuPlacement: {
      toolbar: true,
      pendingConnect: false,
      edgeMenu: false,
      quickAdd: false,
    },
    createDefaultData: () => ({
      type: 'start',
      label: '开始',
      rules: [],
    }),
  },
  {
    type: 'story',
    category: 'story',
    displayName: '剧情片段',
    menuDescription: '展示画面和叙事文本',
    headerLabel: 'STORY',
    icon: FileText,
    iconColorClass: 'bg-white/[0.08] text-openfmv-sub',
    menuPlacement: {
      toolbar: true,
      pendingConnect: true,
      edgeMenu: true,
      quickAdd: true,
    },
    createDefaultData: (context) => ({
      type: 'story',
      title: `剧情节点-${context.storyCount + 1}`,
      content: '',
    }),
  },
  {
    type: 'interaction',
    category: 'interaction',
    displayName: '交互节点',
    menuDescription: '选择、输入、滑动和倒计时',
    headerLabel: 'INTERACTION',
    icon: Video,
    iconColorClass: 'bg-white/[0.08] text-openfmv-sub',
    menuPlacement: {
      toolbar: true,
      pendingConnect: true,
      edgeMenu: true,
      quickAdd: true,
    },
    createDefaultData: () => ({
      type: 'interaction',
      rules: [],
    }),
  },
  {
    type: 'end',
    category: 'flow-control',
    displayName: '结束节点',
    menuDescription: '剧情终点',
    headerLabel: 'FINISH',
    icon: Flag,
    iconColorClass: 'bg-white/[0.08] text-openfmv-sub',
    menuPlacement: {
      toolbar: true,
      pendingConnect: false,
      edgeMenu: false,
      quickAdd: true,
    },
    createDefaultData: () => ({
      type: 'end',
      label: '结束',
    }),
  },
];
