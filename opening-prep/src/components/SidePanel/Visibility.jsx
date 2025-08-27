const Visibility = ({ isVisible, children }) => {
	const visibilityClass = isVisible ? "h-full" : "hidden";
	return <div className={visibilityClass}>{children}</div>;
};

export default Visibility;
