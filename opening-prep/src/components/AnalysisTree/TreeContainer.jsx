import { Chess } from "chess.js";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ReactFlowProvider } from "reactflow";
import NodeInfo from "./NodeInfo.jsx";
import TreeView from "./TreeView.jsx";
import { transformData } from "./utils.js";

const TreeContainer = ({ treeData, updateGame }) => {
	const [selectedNode, setSelectedNode] = useState(null);
	const [viewKey, setViewKey] = useState(0);

	const { nodes, edges } = useMemo(() => transformData(treeData), [treeData]);

	useEffect(() => {
		if (treeData) setSelectedNode(treeData);
		setViewKey((prev) => prev + 1);
	}, [treeData]);

	const handleNodeClick = useCallback(
		(event, node) => {
			const data = node.data.fullNode;
			const ancestors = node.data.ancestors;
			setSelectedNode(data);
			updateGame(new Chess(data.fen), ancestors);
		},
		[updateGame]
	);

	if (!selectedNode) {
		return (
			<div
				className={`z-30 w-full h-full flex items-center justify-center bg-bkg-2 text-white`}
			>
				Loading or processing tree data...
			</div>
		);
	}

	return (
		<div className="z-15 h-full w-full flex flex-col p-4 gap-4 bg-bkg-2">
			<div className="flex-grow w-full rounded-lg overflow-hidden">
				<ReactFlowProvider>
					<TreeView
						key={viewKey}
						nodes={nodes}
						edges={edges}
						onNodeClick={handleNodeClick}
					/>
				</ReactFlowProvider>
			</div>
			<div className="flex-shrink-0 w-full h-2/5 overflow-y-auto">
				<NodeInfo node={selectedNode} />
			</div>
		</div>
	);
};

export default React.memo(TreeContainer);
