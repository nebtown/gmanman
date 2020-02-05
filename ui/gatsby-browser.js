import queryString from "query-string";
import "./src/styles/global.scss";

export function onRouteUpdate({ location }) {
	const isSSR = typeof window === "undefined";
	if (!isSSR) {
		const pageRandom = Math.random();
		const query = queryString.parse(!isSSR && location.search);
		window.april1 =
			query.better ||
			(new Date().getMonth() + 1 === 4 && new Date().getDay() === 1) ||
			pageRandom < 0.02;
		if (window.april1) {
			import("./src/styles/april1.scss");
		}
	}
}
