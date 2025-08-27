const ArrowButton = ({ isFlipped, doUndo }) => {
	const dir = isFlipped ? "rotate-180" : "rotate-0";
	return (
		<button
			onMouseDown={() => doUndo(isFlipped)}
			className="bg-primary hover:bg-accent text-accent hover:text-primary font-semibold size-[6cqmin] md:size-[4.5cqmin] rounded-full group flex items-center justify-center"
		>
			<svg
				className={`size-[3.7cqmin] md:size-[3cqmin] fill-white group-hover:fill-primary ${dir}`}
				viewBox="0 0 640 640"
			>
				<path d="M224.5 160C224.5 147.1 232.3 135.4 244.3 130.4C256.3 125.4 270 128.2 279.1 137.4L439.1 297.4C451.6 309.9 451.6 330.2 439.1 342.7L279.1 502.7C269.9 511.9 256.2 514.6 244.2 509.6C232.2 504.6 224.5 492.9 224.5 480L224.5 160z" />
			</svg>
		</button>
	);
};

export default ArrowButton;
