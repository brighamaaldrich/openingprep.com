import { useMemo } from "react";
import Piece from "./Piece";

const Square = ({
	square,
	flipped,
	piece,
	isLight,
	isSelected,
	isLastMove,
	isCheck,
	isMove,
	isCapture,
	isHidden,
}) => {
	const bgColor = isLight ? "bg-board-light" : "bg-board-dark";
	const revColor = isLight ? "text-board-dark" : "text-board-light";
	const bgClass = `flex items-center justify-center relative group overflow-hidden ${bgColor}`;
	const shadeClass = useMemo(() => {
		if (isMove || isCapture) {
			let size = isMove ? "size-0" : "size-[140%]";
			let base = `${size} absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border-[1.75cqmin] border-overlay-move z-30`;
			let hover = `group-hover:w-full group-hover:h-full group-hover:border-[500px] group-hover:border-overlay-hover`;
			return base + hover;
		}
		return (
			"absolute inset-0" +
			(isSelected
				? " bg-overlay-selected"
				: isCheck
				? " bg-[radial-gradient(circle_at_center,red_12%,transparent_95%)]"
				: isLastMove
				? " bg-overlay-last-move"
				: "")
		);
	}, [isSelected, isCheck, isLastMove, isMove, isCapture]);

	const fileToAnnotate = flipped ? "a" : "h";
	const rankToAnnotate = flipped ? "8" : "1";
	const rankAnnotation =
		square.slice(0, 1) == fileToAnnotate ? square.slice(1) : null;
	const fileAnnotation =
		square.slice(1) == rankToAnnotate ? square.slice(0, 1) : null;

	return (
		<div className={bgClass}>
			{rankAnnotation && (
				<span
					className={`absolute top-0 right-[3%] text-[1.3cqmin] font-bold ${revColor}`}
				>
					{rankAnnotation}
				</span>
			)}
			{fileAnnotation && (
				<span
					className={`absolute bottom-0 left-[4%] text-[1.3cqmin] font-bold ${revColor}`}
				>
					{fileAnnotation}
				</span>
			)}
			<div className={shadeClass} />
			{<Piece piece={piece} isHidden={isHidden} />}
		</div>
	);
};

export default Square;
