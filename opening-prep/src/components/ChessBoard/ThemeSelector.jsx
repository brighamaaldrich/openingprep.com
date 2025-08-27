import { useEffect } from "react";

const THEMES = {
	normal: "bg-normal-gradient",
	lichess: "bg-lichess-gradient",
	brick: "bg-brick-gradient",
	grass: "bg-grass-gradient",
	wood: "bg-wood-gradient",
	bw: "bg-bw-gradient",
	purple: "bg-purple-gradient",
	pink: "bg-pink-gradient",
};

const ThemeSelector = ({ theme, setTheme }) => {
	useEffect(() => {
		console.log(theme);
		if (theme == "normal")
			document.documentElement.removeAttribute("data-theme");
		else document.documentElement.setAttribute("data-theme", theme);
	}, [theme]);

	return (
		<div className="grid grid-cols-4 gap-[0.9cqmin] md:gap-[0.6cqmin] w-fit">
			{Object.keys(THEMES).map((t) => {
				const color = THEMES[t];
				return (
					<div
						key={t}
						className={`size-[3.5cqmin] md:size-[2.3cqmin] rounded-[0.75cqmin] md:rounded-[0.5cqmin] ${color}`}
						onMouseDown={() => setTheme(t)}
					></div>
				);
			})}
		</div>
	);
};

export default ThemeSelector;
