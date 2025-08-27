import { hierarchy, tree } from "d3-hierarchy";

const NODE_WIDTH = 200;
const NODE_HEIGHT = 200;

export const transformData = (rootNode) => {
	if (!rootNode || !rootNode.fen) return { nodes: [], edges: [] };
	const root = hierarchy(rootNode, (d) =>
		d.children ? Object.values(d.children) : []
	);
	root.each((d3Node) => {
		d3Node.data.uniqueId = d3Node
			.ancestors()
			.map((d) => d.data.san)
			.reverse()
			.join("-")
			.replace("root-", "");
	});
	const totalHeight = root.height * NODE_HEIGHT;
	const totalWidth = root.leaves().length * NODE_WIDTH;
	const treeLayout = tree()
		.size([totalWidth, totalHeight])
		.separation((a, b) => (a.parent === b.parent ? 1 : 1.25));
	const layout = treeLayout(root);
	const nodes = [];
	const edges = [];
	layout.descendants().forEach((d3Node) => {
		nodes.push({
			id: d3Node.data.uniqueId,
			data: {
				label: d3Node.data.san,
				fullNode: d3Node.data,
				ancestors: d3Node
					.ancestors()
					.map((d) => {
						let move = d.data.uci;
						return {
							fen: d.data.fen,
							move: {
								from: move.slice(0, 2),
								to: move.slice(2, 4),
							},
						};
					})
					.reverse(),
			},
			position: { x: d3Node.x, y: d3Node.y },
			type: "custom",
		});
	});
	layout.links().forEach((link) => {
		edges.push({
			id: `${link.source.data.uniqueId}==>${link.target.data.uniqueId}`,
			source: link.source.data.uniqueId,
			target: link.target.data.uniqueId,
			type: "default",
			style: { stroke: "#9c9c9c", strokeWidth: 3 },
		});
	});
	return { nodes, edges };
};
