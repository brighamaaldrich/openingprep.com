import StatBar from "./StatBar.jsx";

const NodeInfo = ({ node }) => {
	const formatEval = (cp) => {
		const score = cp / 100.0;
		return score > 0 ? `+${score.toFixed(2)}` : score.toFixed(2);
	};

	return (
		<div className="p-4 text-white rounded-lg">
			<h3 className="font-bold text-lg mb-2">Position Details</h3>
			<div className="font-mono text-sm text-gray-400 bg-bkg p-2 rounded-md break-words mb-4">
				{node.fen}
			</div>

			<div className="grid grid-cols-2 gap-x-4 gap-y-3">
				<span className="font-semibold">Evaluation</span>
				<span className="font-mono text-right">
					{formatEval(node.eval)}
				</span>
				<div className="col-span-2">
					<StatBar evalScore={node.eval / 100.0} />
				</div>

				<span className="font-semibold col-span-2 mt-10">
					{`White - Actual Results (${node.counts.p1} Games)`}
				</span>
				<div className="col-span-2">
					<StatBar results={node.p1_res} />
				</div>

				<span className="font-semibold col-span-2 mt-0">
					White - Expected Results
				</span>
				<div className="col-span-2">
					<StatBar results={node.p1_exp} />
				</div>

				<span className="font-semibold col-span-2 mt-10">
					{`Black - Actual Results (${node.counts.p2} Games)`}
				</span>
				<div className="col-span-2">
					<StatBar results={node.p2_res} />
				</div>

				<span className="font-semibold col-span-2 mt-0">
					Black - Expected Results
				</span>
				<div className="col-span-2">
					<StatBar results={node.p2_exp} />
				</div>
			</div>
		</div>
	);
};

export default NodeInfo;
