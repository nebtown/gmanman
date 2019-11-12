import React from "react";
import PropTypes from "prop-types";
import axios from "axios";
import { GoogleLogin, GoogleLogout } from "react-google-login";
import { useLocalStorage } from "@rehooks/local-storage";
import useAsyncEffect from "use-async-effect";

export function tokenIsValid(loginToken) {
	if (!loginToken) {
		return false;
	}
	return loginToken.expires_at >= Date.now() / 1000;
}

const oAuthClientId =
	"341262452680-svcd6b3uaqi5ij0ltbtrh539s55t174f.apps.googleusercontent.com";

LoginButton.propTypes = {
	gatewayUrl: PropTypes.string.isRequired,
};

export default function LoginButton({ gatewayUrl }) {
	const [loginToken, setLoginToken, delLoginToken] = useLocalStorage(
		"googleLogin"
	);
	const [isAdmin, setIsAdmin, delIsAdmin] = useLocalStorage("isAdmin");
	useAsyncEffect(
		async isMounted => {
			if (!tokenIsValid(loginToken)) {
				delIsAdmin();
				return;
			}
			try {
				const { data } = await axios.post(`${gatewayUrl}auth`, {
					id_token: loginToken.id_token,
				});
				if (!isMounted) return;
				if (!data.isAdmin) {
					console.warn(
						"Gateway validated auth, but says you're not an admin. ",
						`Ask them to add ${loginToken.email} to admins.json`
					);
				}
				setIsAdmin(data.isAdmin);
			} catch (e) {
				if (!isMounted) return;
				console.warn("Gateway rejected auth:", e);
				delLoginToken();
				delIsAdmin();
			}
		},
		[loginToken]
	);
	return (
		<div
			style={{
				position: "absolute",
				top: "1em",
				right: "1em",
			}}
		>
			{!tokenIsValid(loginToken) ? (
				<GoogleLogin
					clientId={oAuthClientId}
					buttonText="Login"
					onSuccess={async response => {
						console.debug("Google Login: Success", response);
						setLoginToken({
							...response.tokenObj,
							...response.profileObj,
						});
					}}
					onFailure={response => {
						console.warn("Google Login: Failure", response);
					}}
				/>
			) : (
				<GoogleLogout
					clientId={oAuthClientId}
					buttonText="Logout"
					onLogoutSuccess={() => {
						delLoginToken();
					}}
				/>
			)}
		</div>
	);
}
