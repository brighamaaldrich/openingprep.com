import { useLayoutEffect, useRef, useState } from "react";

export const useFitText = () => {
	const [isOverflowing, setIsOverflowing] = useState(false);
	const containerRef = useRef(null);
	const contentRef = useRef(null);

	useLayoutEffect(() => {
		const container = containerRef.current;
		const content = contentRef.current;
		if (!container || !content) return;
		const checkOverflow = () => {
			const hasOverflow = content.scrollWidth > container.clientWidth;
			setIsOverflowing((prev) =>
				prev === hasOverflow ? prev : hasOverflow
			);
		};
		const observer = new ResizeObserver(checkOverflow);
		observer.observe(container);
		checkOverflow();
		const timeoutId = setTimeout(checkOverflow, 10);
		return () => {
			observer.disconnect();
			clearTimeout(timeoutId);
		};
	}, []);

	return { containerRef, contentRef, isOverflowing };
};
