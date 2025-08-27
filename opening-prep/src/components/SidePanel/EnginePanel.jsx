import { Chess } from "chess.js";
import { useCallback, useEffect, useRef, useState } from "react";

const getSanMoves = (uciMoves, fen) => {
	let tempGame = new Chess(fen);
	let sanMoves = "";
	for (const m of uciMoves) {
		if (tempGame.turn() === "w") {
			sanMoves += `${tempGame.moveNumber()}. `;
		} else if (sanMoves === "") {
			sanMoves += `${tempGame.moveNumber()}... `;
		}
		try {
			const move = tempGame.move(m, { sloppy: true });
			sanMoves += `${move.san} `;
		} catch {
			break;
		}
	}
	return sanMoves;
};

const EnginePanel = ({ fen }) => {
	const [engineOn, setEngineOn] = useState(false);
	const [lines, setLines] = useState([{}, {}, {}]);
	const [depth, setDepth] = useState(0);
	const workerRef = useRef(null);

	const handleMessage = useCallback(
		(event) => {
			const message = event.data;
			if (!message.startsWith("info depth")) return;
			const multiPvMatch = message.match(/multipv (\d+)/);
			if (!multiPvMatch) return;
			const multiPvIndex = parseInt(multiPvMatch[1], 10) - 1;
			if (multiPvIndex > 2) return;
			let game = new Chess(fen);
			const sign = game.turn() === "w" ? 1 : -1;
			setDepth(message.split(" ")[2]);
			setLines((prevLines) => {
				const newLines = [...prevLines];
				let line = { ...newLines[multiPvIndex] };
				const scoreMatch = message.match(/score (cp|mate) (-?\d+)/);
				if (scoreMatch) {
					const value = parseInt(scoreMatch[2], 10);
					if (scoreMatch[1] === "mate") {
						line.score = `#${value * sign}`;
					} else {
						const score = ((value * sign) / 100).toFixed(2);
						const s = score > 0 ? "+" : "";
						line.score = `${s}${score}`;
					}
				}
				const pvMatch = message.match(/pv ([a-h][1-8][a-h][1-8].*)/);
				const uciMoves = pvMatch[1].split(" ");
				if (pvMatch) line.pv = getSanMoves(uciMoves, fen);
				newLines[multiPvIndex] = line;
				return newLines;
			});
		},
		[fen]
	);

	useEffect(() => {
		workerRef.current = new Worker("/engine/stockfish-nnue-16-single.js");
		workerRef.current.onmessage = handleMessage;
		workerRef.current.postMessage("uci");
		workerRef.current.postMessage("setoption name MultiPV value 3");
		workerRef.current.postMessage("isready");
		return () => {
			workerRef.current.postMessage("quit");
			workerRef.current.terminate();
		};
	}, [handleMessage]);

	useEffect(() => {
		if (workerRef.current) {
			workerRef.current.postMessage("stop");
			if (engineOn) {
				setLines([{}, {}, {}]);
				workerRef.current.postMessage(`position fen ${fen}`);
				workerRef.current.postMessage("go depth 25");
			}
		}
	}, [fen, engineOn]);

	const primaryScore = lines[0]?.score || "----";

	return (
		<div className="bg-bkg-2 h-full flex flex-col text-white p-4">
			<div className="flex items-center space-x-4 mb-4">
				<button
					onMouseDown={() => setEngineOn((prev) => !prev)}
					className={`ml-2 w-12 h-6.5 rounded-full flex items-center transition-colors duration-80 ${
						engineOn ? "bg-primary" : "bg-slate-600"
					}`}
				>
					<span
						className={`block w-5 h-5 bg-white rounded-full shadow-md transform transition-transform duration-80 ${
							engineOn ? "translate-x-6" : "translate-x-1"
						}`}
					></span>
				</button>
				<span className="text-2xl font-semibold ml-2">
					{engineOn ? primaryScore : "----"}
				</span>
				<span className="flex-grow text-right text-lg font-semibold text-gray-400">
					{engineOn ? `depth ${depth}` : ""}
				</span>
			</div>

			<div className="flex flex-col justify-center space-y-5 border-t border-slate-700 pt-5">
				{lines.map((line, index) => (
					<div
						key={index}
						className="text-md flex items-center h-5 bg-bkg p-6 rounded-md"
					>
						<span className="font-bold text-white mr-2">
							{engineOn ? line.score || "----" : "----"}
						</span>
						<span className="text-gray-400 truncate">
							{engineOn ? line.pv || "..." : "..."}
						</span>
					</div>
				))}
			</div>
		</div>
	);
};

export default EnginePanel;
