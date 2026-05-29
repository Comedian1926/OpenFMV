import EndNode from '../../nodes/EndNode';
import InteractionNode from '../../nodes/InteractionNode';
import StartNode from '../../nodes/StartNode';
import StoryNode from '../../nodes/StoryNode';
import ComfyEdge from '../ComfyEdge';

export const nodeTypes = {
  start: StartNode,
  end: EndNode,
  story: StoryNode,
  interaction: InteractionNode,
};

export const edgeTypes = {
  comfy: ComfyEdge,
};
