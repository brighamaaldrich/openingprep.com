import { useState } from "react";
import LichessAuth from "./LichessAuth";

const PERF_TYPES = ["bullet", "blitz", "rapid", "classical"];

const TextInput = ({ label, name, value, onChange }) => (
	<div>
		<label
			htmlFor={name}
			className="block text-sm font-medium text-slate-300"
		>
			{label}
		</label>
		<input
			type="text"
			name={name}
			id={name}
			value={value}
			onChange={onChange}
			className="mt-1 block w-full bg-bkg-2 border border-slate-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-primary focus:border-primary"
		/>
	</div>
);

const FormPanel = ({
	handleStartAnalysis,
	isLoading,
	statusMessage,
	error,
}) => {
	const [lichessToken, setLichessToken] = useState(null);
	const [formData, setFormData] = useState({
		player1: "DrNykterstein",
		player2: "EricRosen",
		depth: 20,
		threshold: 0.15,
		maxGames: 200,
		perfTypes: ["blitz", "rapid"],
	});

	const handleChange = (e) => {
		const { name, value } = e.target;
		setFormData((prev) => ({ ...prev, [name]: value }));
	};

	const handleToggle = (type) => {
		setFormData((prev) => {
			const isSelected = prev.perfTypes.includes(type);
			if (isSelected && prev.perfTypes.length === 1) return prev;
			const newPerfTypes = isSelected
				? prev.perfTypes.filter((t) => t !== type)
				: [...prev.perfTypes, type];
			return { ...prev, perfTypes: newPerfTypes };
		});
	};

	const handleSubmit = () => {
		const tcs = formData.perfTypes.join(",");
		const requestBody = {
			player1: formData.player1,
			player2: formData.player2,
			p1_filters: {
				color: "white",
				rated: true,
				clocks: true,
				max: formData.maxGames,
				perfType: tcs,
			},
			p2_filters: {
				color: "black",
				rated: true,
				clocks: true,
				max: formData.maxGames,
				perfType: tcs,
			},
			threshold: Number(formData.threshold),
			depth: Number(formData.depth),
			token: lichessToken,
		};

		console.log(requestBody);
		handleStartAnalysis(requestBody);
	};

	return (
		<div
			className="p-6 text-white bg-bkg-2 h-full flex flex-col"
			onMouseDown={(e) => e.stopPropagation()}
		>
			<div className="flex-grow space-y-4">
				<LichessAuth token={lichessToken} setToken={setLichessToken} />
				<TextInput
					label="White Player"
					name="player1"
					value={formData.player1}
					onChange={handleChange}
				/>
				<TextInput
					label="Black Player"
					name="player2"
					value={formData.player2}
					onChange={handleChange}
				/>
				<TextInput
					label="Tree Depth (Plies)"
					name="depth"
					value={formData.depth}
					onChange={handleChange}
				/>
				<TextInput
					label="Maximum Games (Per Player)"
					name="maxGames"
					value={formData.maxGames}
					onChange={handleChange}
				/>
				<TextInput
					label="Threshold (Set to 0 to Include All Moves)"
					name="threshold"
					value={formData.threshold}
					onChange={handleChange}
				/>
				<div className="mt-6">
					<label className="block text-sm font-medium text-slate-300">
						Game Types
					</label>
					<div className="mt-2 flex items-center gap-2">
						{PERF_TYPES.map((type) => {
							const isSelected =
								formData.perfTypes.includes(type);
							const selClasses = isSelected
								? "bg-primary text-white"
								: "bg-bkg-2 text-slate-400 hover:bg-slate-600";
							return (
								<button
									key={type}
									onMouseDown={() => handleToggle(type)}
									className={`px-3 py-1 text-sm rounded-full transition-colors duration-100 ${selClasses}`}
								>
									{type.charAt(0).toUpperCase() +
										type.slice(1)}
								</button>
							);
						})}
					</div>
				</div>
				<p className="block text-sm font-medium text-slate-500 p-2 pl-0">
					Note: Pulling too many games (20000+), searching too deep
					(20+ plies), or having a low threshold (&lt;0.10) can cause
					processing times to take 10+ minutes. This also happens when
					the players have many head to head games.
				</p>
			</div>

			<button
				onMouseDown={handleSubmit}
				disabled={isLoading}
				className="w-fit m-auto bg-primary hover:bg-accent disabled:hover:text-white disabled:bg-gray-500 disabled:cursor-not-allowed text-white hover:text-primary font-bold py-2 px-6 rounded-4xl"
			>
				{isLoading ? "Analyzing..." : "Start Analysis"}
			</button>

			<div className="mt-6 h-10 text-center">
				{statusMessage && <p className="text-white">{statusMessage}</p>}
				{error && <p className="text-red-500 font-semibold">{error}</p>}
			</div>
		</div>
	);
};

export default FormPanel;
