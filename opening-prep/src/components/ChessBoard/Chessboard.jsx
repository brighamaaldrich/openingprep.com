import { Chess } from "chess.js";
import { useCallback, useEffect, useState } from "react";
import ArrowButton from "./ArrowButton";
import FlipButton from "./FlipButton";
import Square from "./Square";
import ThemeSelector from "./ThemeSelector";

const Chessboard = ({
	game,
	updateGame,
	moveList,
	updateMoveList,
	dragged,
	setDragged,
	theme,
	setTheme,
}) => {
	const [selected, setSelected] = useState("");
	const [valid, setValid] = useState([]);
	const [lastMove, setLastMove] = useState(moveList.at(-1)?.move);
	const [checkSquare, setCheckSquare] = useState(null);
	const [hasLeft, setHasLeft] = useState(false);
	const [clickCount, setClickCount] = useState(0);
	const [flipped, setFlipped] = useState(false);

	const toAlgebraic = (row, col) => {
		const file = String.fromCharCode("a".charCodeAt(0) + col);
		const rank = 8 - row;
		return `${file}${rank}`;
	};

	const getSquare = useCallback(
		(e) => {
			const rect = document
				.getElementById("board")
				.getBoundingClientRect();
			const sqSize = rect.width / 8;
			let col = Math.floor((e.clientX - rect.left) / sqSize);
			let row = Math.floor((e.clientY - rect.top) / sqSize);
			if (flipped) {
				col = 7 - col;
				row = 7 - row;
			}
			const file = String.fromCharCode("a".charCodeAt(0) + col);
			const rank = 8 - row;
			return `${file}${rank}`;
		},
		[flipped]
	);

	const makeMove = useCallback(
		(square) => {
			const idx = moveList.findIndex((item) => item.fen === game.fen());
			game.move({ from: selected, to: square, promotion: "q" });
			updateGame(game);
			const check = game.isCheck()
				? game.findPiece({ type: "k", color: game.turn() })[0]
				: null;
			setCheckSquare(check);
			setLastMove({ from: selected, to: square });
			if (
				idx == -1 ||
				idx == moveList.length - 1 ||
				moveList[idx + 1] != game.fen()
			) {
				moveList.length = idx + 1;
				moveList.push({
					fen: game.fen(),
					move: { from: selected, to: square },
				});
				updateMoveList(moveList);
			}
		},
		[game, moveList, selected, updateGame, updateMoveList]
	);

	const handleSquareClick = useCallback(
		(square, isDown) => {
			setClickCount((prev) => prev + 1);
			const piece = game.get(square);
			const sameColor = piece?.color === game.turn();
			const isValid = valid?.includes(square);
			const sameSquare = selected === square;
			if (sameSquare && !hasLeft && clickCount <= 2) {
				return;
			} else if (isValid) {
				makeMove(square);
			} else if (sameColor && !sameSquare && isDown) {
				const moves = game.moves({ square: square, verbose: true });
				setSelected(square);
				setValid(moves.map((m) => m.to));
				setClickCount(1);
				return;
			}
			setSelected("");
			setValid([]);
			setClickCount(0);
		},
		[clickCount, game, hasLeft, makeMove, selected, valid]
	);

	const handleUndo = useCallback(
		(isFlipped) => {
			let fen = game.fen();
			let move = null;
			const idx = moveList.findIndex((item) => item.fen === fen);
			if (!isFlipped && idx != -1 && idx < moveList.length - 1) {
				fen = moveList[idx + 1].fen;
				move = moveList[idx + 1].move;
			} else if (isFlipped && idx > 0) {
				fen = moveList[idx - 1].fen;
				move = moveList[idx - 1].move;
			}
			if (fen != game.fen()) {
				updateGame(new Chess(fen));
				setSelected("");
				setCheckSquare(null);
				setValid([]);
				setHasLeft(false);
				setClickCount(0);
				setLastMove(move);
			}
		},
		[game, moveList, updateGame]
	);

	const handleMouseDown = useCallback(
		(e) => {
			e.preventDefault();
			setHasLeft(false);
			const square = getSquare(e);
			if (!square) return null;
			const piece = game.get(square);
			if (piece && piece.color === game.turn()) {
				setDragged({
					piece: piece,
					square: square,
					x: e.clientX,
					y: e.clientY,
				});
			}
			handleSquareClick(square, true);
		},
		[game, getSquare, handleSquareClick, setDragged]
	);

	const handleMouseMove = useCallback(
		(e) => {
			if (dragged) {
				setDragged({
					piece: dragged.piece,
					square: dragged.square,
					x: e.clientX,
					y: e.clientY,
				});
				const square = getSquare(e);
				if (square !== selected) {
					setHasLeft(true);
				}
			}
		},
		[dragged, getSquare, selected, setDragged]
	);

	const handleMouseUp = useCallback(
		(e) => {
			if (dragged) {
				const square = getSquare(e);
				if (square) {
					handleSquareClick(square, false);
				}
			}
			setHasLeft(false);
			setDragged(null);
		},
		[dragged, getSquare, handleSquareClick, setDragged]
	);

	useEffect(() => {
		const handleKeyDown = (e) => {
			if (e.key == "ArrowRight") handleUndo(false);
			else if (e.key == "ArrowLeft") handleUndo(true);
		};
		document.addEventListener("keydown", handleKeyDown);
		document.addEventListener("mousedown", handleMouseDown);
		document.addEventListener("mousemove", handleMouseMove);
		document.addEventListener("mouseup", handleMouseUp);

		return () => {
			document.removeEventListener("keydown", handleKeyDown);
			document.removeEventListener("mousedown", handleMouseDown);
			document.removeEventListener("mousemove", handleMouseMove);
			document.removeEventListener("mouseup", handleMouseUp);
		};
	}, [handleMouseDown, handleMouseMove, handleMouseUp, handleUndo]);

	return (
		<>
			<div
				id="board"
				className="aspect-square grid grid-cols-8 grid-rows-8 overflow-clip w-[88cqmin] rounded-[0.5cqmin] mt-4"
			>
				{game.board().map((row, rowIndex) =>
					row.map((_, colIndex) => {
						let square = toAlgebraic(rowIndex, colIndex);
						if (flipped) {
							square = toAlgebraic(7 - rowIndex, 7 - colIndex);
						}
						const piece = game.get(square);
						return (
							<Square
								key={square}
								flipped={flipped}
								square={square}
								piece={piece}
								isLight={(rowIndex + colIndex) % 2 == 0}
								isSelected={square == selected}
								isLastMove={
									square == lastMove?.from ||
									square == lastMove?.to
								}
								isCheck={square == checkSquare}
								isMove={!piece && valid.includes(square)}
								isCapture={piece && valid.includes(square)}
								isHidden={square == dragged?.square}
							/>
						);
					})
				)}
			</div>
			<div className="flex w-[88cqmin] mt-[3cqh] md:mt-[2cqh]">
				<div className="flex-1/4">
					<ThemeSelector theme={theme} setTheme={setTheme} />
				</div>
				<div className="flex-1/2 flex justify-center">
					<div className="flex items-center justify-evenly w-[20cqmin] md:w-[18cqmin]">
						<ArrowButton
							isFlipped={true}
							doUndo={handleUndo}
						></ArrowButton>
						<ArrowButton
							isFlipped={false}
							doUndo={handleUndo}
						></ArrowButton>
					</div>
				</div>
				<div className="flex-1/4 flex justify-end w-max">
					<FlipButton flipped={flipped} setFlipped={setFlipped} />
				</div>
			</div>
		</>
	);
};

export default Chessboard;
