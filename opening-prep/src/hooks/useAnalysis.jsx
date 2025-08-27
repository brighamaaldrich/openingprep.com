import { useCallback, useEffect, useState } from "react";
import initialTreeData from "../tree.json";

const apiUrl = import.meta.env.VITE_API_URL || "";

export const useAnalysis = (setPanel) => {
	const [treeData, setTreeData] = useState(initialTreeData);
	const [jobId, setJobId] = useState(null);
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState(null);
	const [statusMessage, setStatusMessage] = useState("");

	const handleStartAnalysis = useCallback(async (requestBody) => {
		if (!requestBody) {
			setError("Analysis parameters are missing.");
			return;
		}
		setIsLoading(true);
		setError(null);
		setJobId(null);
		setStatusMessage("Sending analysis request...");

		try {
			const response = await fetch(`${apiUrl}/api/analyze`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(requestBody),
			});

			if (!response.ok) {
				const errorData = await response.json().catch(() => null);
				const errorMessage =
					errorData?.detail || "Failed to start analysis.";
				throw new Error(errorMessage);
			}

			const data = await response.json();
			if (data.job_id) {
				setJobId(data.job_id);
				setStatusMessage(
					`Job queued! ID: ${data.job_id.substring(0, 8)}...`
				);
			} else {
				throw new Error("Server did not return a job_id.");
			}
		} catch (err) {
			setError(err.message);
			setIsLoading(false);
			setStatusMessage("");
		}
	}, []);

	useEffect(() => {
		if (!jobId || !isLoading) return;

		const pollInterval = setInterval(async () => {
			try {
				const response = await fetch(`${apiUrl}/api/results/${jobId}`);
				if (!response.ok)
					throw new Error("Failed to fetch job status.");

				const data = await response.json();

				if (data.status === "finished") {
					clearInterval(pollInterval);
					setIsLoading(false);
					setJobId(null);
					setTreeData(data.result);
					setStatusMessage(
						"Analysis complete! Switching to tree view."
					);
					setTimeout(() => {
						setPanel("tree");
						setStatusMessage("");
					}, 1500);
				} else if (data.status === "failed") {
					clearInterval(pollInterval);
					setIsLoading(false);
					setJobId(null);
					setError(
						data.error || "Analysis job failed on the server."
					);
					setStatusMessage("Job failed.");
				} else {
					setStatusMessage(
						data.progress || "Analysis in progress..."
					);
				}
			} catch (err) {
				clearInterval(pollInterval);
				setError(err.message);
				setIsLoading(false);
				setStatusMessage("Error checking job status.");
			}
		}, 3000);

		return () => clearInterval(pollInterval);
	}, [jobId, isLoading, setPanel]);

	return { treeData, isLoading, error, statusMessage, handleStartAnalysis };
};
