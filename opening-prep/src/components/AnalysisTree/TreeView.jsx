import { useMemo } from "react";
import ReactFlow, { Background, Controls } from "reactflow";
import "reactflow/dist/style.css";
import CustomNode from "./CustomNode.jsx";

const TreeView = ({ nodes, edges, onNodeClick }) => {
	const nodeTypes = useMemo(() => ({ custom: CustomNode }), []);
	const proOptions = { hideAttribution: true };
	return (
		<div className="h-full w-full bg-slate-800">
			<ReactFlow
				nodes={nodes}
				edges={edges}
				onNodeClick={onNodeClick}
				nodeTypes={nodeTypes}
				proOptions={proOptions}
				fitView
				fitViewOptions={{ padding: 0.1 }}
				minZoom={0.05}
				panOnDrag={true}
				zoomOnScroll={true}
				nodesDraggable={false}
				nodesConnectable={false}
			>
				<Background className="bg-bkg" color="#666" gap={80} size={3} />
				<Controls showInteractive={false} />
			</ReactFlow>
		</div>
	);
};

export default TreeView;
