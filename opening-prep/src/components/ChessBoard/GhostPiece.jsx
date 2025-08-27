import Piece from "./Piece";

const GhostPiece = ({ piece }) => {
	if (!piece) return null;

	return (
		<div
			className="absolute z-200 pointer-events-none w-[6.5cqw] h-[6.5cqw] -translate-1/2"
			style={{ top: `${piece.y}px`, left: `${piece.x}px` }}
		>
			<Piece piece={piece.piece} />
		</div>
	);
};

export default GhostPiece;
