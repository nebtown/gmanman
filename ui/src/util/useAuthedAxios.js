import axios from "axios";
import { useLocalStorage } from "@rehooks/local-storage";
import { setupCache } from "axios-cache-interceptor";

export function useAuthedAxios() {
	const [loginToken] = useLocalStorage("googleLogin");
	let axiosInstance = axios.create({
		headers: { Authorization: loginToken && loginToken.id_token },
	});
	axiosInstance = setupCache(axiosInstance, {
		enabled: false, // opt-in
	});
	return axiosInstance;
}
