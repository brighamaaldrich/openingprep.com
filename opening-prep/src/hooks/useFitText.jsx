import { useLayoutEffect, useRef, useState } from "react";

export const useFitText = () => {
	const [isOverflowing, setIsOverflowing] = useState(false);
	const containerRef = useRef(null);
	const contentRef = useRef(null);

	useLayoutEffect(() => {
		const container = containerRef.current;
		const content = contentRef.current;

		if (!container || !content) return;

		// This function contains the core measurement logic.
		const checkOverflow = () => {
			const hasOverflow = content.scrollWidth > container.clientWidth;
			// We use the functional form of setState to ensure we only re-render
			// if the overflow status has actually changed.
			setIsOverflowing((prev) =>
				prev === hasOverflow ? prev : hasOverflow
			);
		};

		// The ResizeObserver handles changes efficiently over time.
		const observer = new ResizeObserver(checkOverflow);
		observer.observe(container);

		// THE FIX: We run an explicit check immediately...
		checkOverflow();

		// ...and then we force a re-check after a tiny delay. This is the key
		// to defeating the race condition, as it gives the browser time to paint.
		const timeoutId = setTimeout(checkOverflow, 10);

		// Clean up both the observer and the timeout when the component unmounts.
		return () => {
			observer.disconnect();
			clearTimeout(timeoutId);
		};
	}, []); // Empty dependency array ensures this effect runs only once on mount.

	return { containerRef, contentRef, isOverflowing };
};
