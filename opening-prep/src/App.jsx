import { Chess } from "chess.js";
import { useCallback, useState } from "react";
import TreeContainer from "./components/AnalysisTree/TreeContainer.jsx";
import Chessboard from "./components/ChessBoard/Chessboard";
import GhostPiece from "./components/ChessBoard/GhostPiece";
import EnginePanel from "./components/SidePanel/EnginePanel.jsx";
import FormPanel from "./components/SidePanel/FormPanel.jsx";
import Visibility from "./components/SidePanel/Visibility.jsx";
import { useAnalysis } from "./hooks/useAnalysis.jsx";

const App = () => {
	const [game, setGame] = useState(new Chess());
	const [dragged, setDragged] = useState(null);
	const [boardKey, setBoardKey] = useState(0);
	const [moveList, setMoveList] = useState([{ fen: game.fen(), move: null }]);
	const [panel, setPanel] = useState("form");
	const [theme, setTheme] = useState("normal");

	const { treeData, isLoading, error, statusMessage, handleStartAnalysis } =
		useAnalysis(setPanel);

	const updateGame = (newGame) => setGame(newGame);

	const updateMoveList = (newMoveList) => setMoveList(newMoveList);

	const updateGameFromTree = useCallback((newGame, newMoveList) => {
		setMoveList(newMoveList);
		setGame(newGame);
		setBoardKey((prev) => prev + 1);
	}, []);

	const formColor =
		panel == "form"
			? "bg-bkg-2 inset-shadow-tab-2 z-20 text-white"
			: "bg-bkg z-10 text-slate-500";
	const treeColor =
		panel == "tree"
			? "bg-bkg-2 inset-shadow-tab z-20 text-white"
			: "bg-bkg z-10 text-slate-500";
	const engineColor =
		panel == "engine"
			? "bg-bkg-2 inset-shadow-tab z-20 text-white"
			: "bg-bkg z-10 text-slate-500";

	return (
		<div className="w-full min-h-screen bg-bkg flex flex-col md:flex-row overflow-hidden mt-3 md:mt-0">
			<GhostPiece piece={dragged} />
			<div
				className="h-dvw md:h-screen w-full md:w-6/10 flex flex-col items-center justify-center"
				style={{ containerType: "size" }}
			>
				<Chessboard
					key={boardKey}
					game={game}
					updateGame={updateGame}
					moveList={moveList}
					updateMoveList={updateMoveList}
					dragged={dragged}
					setDragged={setDragged}
					theme={theme}
					setTheme={setTheme}
				/>
			</div>
			<div className="h-screen md:h-screen w-full md:w-4/10 flex flex-col inset-shadow-panel mt-5 md:mt-0">
				<div className="bg-bkg h-1/18 flex font-semibold text-lg">
					<button
						onMouseDown={() => setPanel("form")}
						className={`h-full flex-1/3 text-center ${formColor}`}
					>
						Filters
					</button>
					<button
						onMouseDown={() => setPanel("tree")}
						className={`h-full flex-1/3 text-center ${treeColor}`}
					>
						Tree
					</button>
					<button
						onMouseDown={() => setPanel("engine")}
						className={`h-full flex-1/3 text-center ${engineColor}`}
					>
						Engine
					</button>
				</div>
				<div className="grow inset-shadow-panel-2 z-15">
					<Visibility isVisible={panel == "form"}>
						<FormPanel
							handleStartAnalysis={handleStartAnalysis}
							isLoading={isLoading}
							statusMessage={statusMessage}
							error={error}
						/>
					</Visibility>
					<Visibility isVisible={panel == "tree"}>
						<TreeContainer
							treeData={treeData}
							updateGame={updateGameFromTree}
						/>
					</Visibility>
					<Visibility isVisible={panel == "engine"}>
						<EnginePanel fen={game.fen()} />
					</Visibility>
				</div>
			</div>
		</div>
	);
};

export default App;
