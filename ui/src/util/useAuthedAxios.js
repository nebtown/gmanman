import axios from "axios";
import { useLocalStorage } from "@rehooks/local-storage";

export function useAuthedAxios() {
	const [loginToken] = useLocalStorage("googleLogin");
	return axios.create({
		headers: { Authorization: loginToken && loginToken.id_token },
	});
}
