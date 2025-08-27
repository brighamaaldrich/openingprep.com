const Piece = ({ piece, isHidden }) => {
	if (!piece) return null;
	const z = isHidden ? "z-20" : "z-100";
	const opacity = isHidden ? "opacity-40" : "opacity-100";
	const classes = `w-full h-full ${z} ${opacity}`;
	return (
		<img
			src={`/assets2/${piece.color}${piece.type.toUpperCase()}.svg`}
			alt={`${piece.color === "w" ? "White" : "Black"} ${piece.type}`}
			className={classes}
		/>
	);
};

export default Piece;
