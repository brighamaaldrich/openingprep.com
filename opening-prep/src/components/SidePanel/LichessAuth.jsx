import { useCallback, useEffect, useRef } from "react";

const LichessAuth = ({ token, setToken }) => {
	const exchangeInitiated = useRef(false);
	const CLIENT_ID = "chess-tree-analyzer";
	const REDIRECT_URI = window.location.origin + window.location.pathname;

	const generateRandomString = (length) => {
		const chars =
			"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~";
		let result = "";
		for (let i = 0; i < length; i++) {
			result += chars.charAt(Math.floor(Math.random() * chars.length));
		}
		return result;
	};

	const sha256 = async (plain) => {
		const encoder = new TextEncoder();
		const data = encoder.encode(plain);
		const hash = await crypto.subtle.digest("SHA-256", data);
		return hash;
	};

	const base64URLEncode = (buffer) => {
		const bytes = new Uint8Array(buffer);
		let binary = "";
		bytes.forEach((byte) => (binary += String.fromCharCode(byte)));
		return btoa(binary)
			.replace(/\+/g, "-")
			.replace(/\//g, "_")
			.replace(/=/g, "");
	};

	const exchangeCodeForToken = useCallback(
		async (code, verifier) => {
			try {
				const response = await fetch("https://lichess.org/api/token", {
					method: "POST",
					headers: {
						"Content-Type": "application/x-www-form-urlencoded",
					},
					body: new URLSearchParams({
						grant_type: "authorization_code",
						code: code,
						code_verifier: verifier,
						redirect_uri: REDIRECT_URI,
						client_id: CLIENT_ID,
					}),
				});

				if (response.ok) {
					const data = await response.json();
					console.log(data.access_token);
					setToken(data.access_token);
					sessionStorage.removeItem("code_verifier");
					window.history.replaceState(
						{},
						document.title,
						window.location.pathname
					);
				}
			} catch (error) {
				console.error("Token exchange failed:", error);
			}
		},
		[REDIRECT_URI, setToken]
	);

	useEffect(() => {
		const params = new URLSearchParams(window.location.search);
		const code = params.get("code");
		const storedVerifier = sessionStorage.getItem("code_verifier");
		if (code && storedVerifier && !token && !exchangeInitiated.current) {
			exchangeInitiated.current = true;
			exchangeCodeForToken(code, storedVerifier);
		}
	}, [exchangeCodeForToken, token]);

	const login = async () => {
		const verifier = generateRandomString(128);
		sessionStorage.setItem("code_verifier", verifier);
		const challengeBuffer = await sha256(verifier);
		const challenge = base64URLEncode(challengeBuffer);
		const authUrl =
			`https://lichess.org/oauth/authorize?` +
			`response_type=code&` +
			`client_id=${CLIENT_ID}&` +
			`redirect_uri=${encodeURIComponent(REDIRECT_URI)}&` +
			`code_challenge=${challenge}&` +
			`code_challenge_method=S256`;
		window.location.href = authUrl;
	};

	const logout = () => {
		setToken(null);
		sessionStorage.removeItem("code_verifier");
	};

	return (
		<div className="h-12 flex items-center justify-baseline">
			<button
				onMouseDown={token ? logout : login}
				className="bg-primary hover:bg-accent text-white hover:text-primary py-1.5 px-5 rounded-4xl text-sm"
			>
				{token ? "Sign out" : "Connect Lichess"}
			</button>
			<p className="text-sm font-medium text-slate-500 text-center ml-5">
				Reduces loading times
			</p>
		</div>
	);
};

export default LichessAuth;
