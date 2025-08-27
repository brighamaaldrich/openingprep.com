import React from "react";
import { Handle, Position } from "reactflow";

const CustomNode = ({ data, selected }) => {
	const fen = data.fullNode?.fen || "";
	const isWhiteMove = fen.split(" ")[1] === "b";
	const isRoot = data.fullNode?.san === "root";
	const classes =
		"size-24 rounded-full flex items-center justify-center border-2 shadow-lg cursor-pointer";
	const colorClasses =
		isWhiteMove || isRoot
			? "bg-accent text-primary-2 border-5 border-primary-2"
			: "bg-secondary text-accent-2 border-5 border-accent-2";
	const highlight = selected ? "inset-shadow-node !border-white" : "";
	const rate = isWhiteMove
		? data.fullNode.rates["w"] * 100
		: data.fullNode.rates["b"] * 100;
	return (
		<div className="flex flex-col items-center">
			{!isRoot && (
				<span className="text-2xl font-bold text-zinc-400 m-1">
					{`${Math.round(rate * 100) / 100}%`}
				</span>
			)}
			<div className={`${classes} ${colorClasses} ${highlight}`}>
				<Handle type="target" position={Position.Top} />
				<span className="text-2xl font-bold">
					{isRoot ? "Start" : data.label}
				</span>
				<Handle type="source" position={Position.Bottom} />
			</div>
		</div>
	);
};

export default CustomNode;
