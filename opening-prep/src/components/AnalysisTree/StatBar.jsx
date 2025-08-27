import { useFitText } from "../../hooks/useFitText";

const BarSegment = ({ percentage, bgColor, textColor, value }) => {
	const { containerRef, contentRef, isOverflowing } = useFitText();

	return (
		<div
			ref={containerRef}
			style={{ width: `${percentage}%` }}
			className={`${bgColor} h-full flex justify-center items-center overflow-hidden`}
		>
			<span ref={contentRef} className={`whitespace-nowrap ${textColor}`}>
				{!isOverflowing &&
					value > 0 &&
					`${Math.round(value * 10) / 10}%`}
			</span>
		</div>
	);
};

const StatBar = ({ evalScore, results }) => {
	if (results) {
		const wins = results.w_wins || 0;
		const draws = results.draws || 0;
		const losses = results.b_wins || 0;
		const total = wins + draws + losses;
		const wPct = total > 0 ? (wins / total) * 100 : 0;
		const dPct = total > 0 ? (draws / total) * 100 : 0;
		const bPct = 100 - wPct - dPct;
		if (total == 0) {
			return (
				<div className="w-full h-3.5 flex rounded-sm overflow-hidden bg-gray-700 text-xs font-semibold inset-shadow-bar"></div>
			);
		}
		return (
			<div className="w-full h-3.5 flex rounded-md overflow-hidden bg-gray-700 text-xs font-semibold inset-shadow-bar">
				<BarSegment
					percentage={wPct}
					bgColor="bg-white"
					textColor="text-black"
					value={wPct}
				/>
				<BarSegment
					percentage={dPct}
					bgColor="bg-zinc-500"
					textColor="text-white"
					value={dPct}
				/>
				<BarSegment
					percentage={bPct}
					bgColor="bg-black"
					textColor="text-white"
					value={bPct}
				/>
			</div>
		);
	}
	if (typeof evalScore === "number") {
		const clampedEval = Math.max(-10, Math.min(10, evalScore));
		const whitePct = 50 + clampedEval * 5;
		return (
			<div className="w-full h-3.5 flex rounded-sm overflow-hidden bg-black inset-shadow-bar">
				<div
					style={{ width: `${whitePct}%` }}
					className="bg-gray-200 h-full"
				></div>
			</div>
		);
	}
	return null;
};

export default StatBar;
