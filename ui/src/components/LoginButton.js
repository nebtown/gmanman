import React, { useState } from "react";
import PropTypes from "prop-types";
import axios from "axios";
import {
	GoogleLogin,
	googleLogout,
	GoogleOAuthProvider,
} from "@react-oauth/google";
import { useLocalStorage } from "@rehooks/local-storage";
import Grid from "@mui/material/Grid";
import useAsyncEffect from "use-async-effect";
import { Button } from "@mui/material";

export function tokenIsValid(loginToken) {
	if (!loginToken) {
		return false;
	}
	return loginToken.expires_at >= Date.now() / 1000;
}
function parseJwt(token) {
	var base64Url = token.split(".")[1];
	var base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
	var jsonPayload = decodeURIComponent(
		window
			.atob(base64)
			.split("")
			.map(function (c) {
				return "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2);
			})
			.join("")
	);

	return JSON.parse(jsonPayload);
}

const oAuthClientId =
	"341262452680-svcd6b3uaqi5ij0ltbtrh539s55t174f.apps.googleusercontent.com";

LoginButton.propTypes = {
	gatewayUrl: PropTypes.string.isRequired,
};

export default function LoginButton({ gatewayUrl }) {
	const [loginToken, setLoginToken, delLoginToken] =
		useLocalStorage("googleLogin");
	const [isAdmin, setIsAdmin, delIsAdmin] = useLocalStorage("isAdmin");
	const [loggedInBefore] = useState(!!loginToken);
	useAsyncEffect(
		async (isMounted) => {
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
		<GoogleOAuthProvider clientId={oAuthClientId}>
			<Grid item>
				{!tokenIsValid(loginToken) ? (
					<GoogleLogin
						buttonText="Login"
						auto_select
						useOneTap={loggedInBefore}
						itp_support
						onSuccess={async (response) => {
							console.debug(
								"Google Login: Success",
								response,
								parseJwt(response.credential)
							);

							setLoginToken({
								id_token: response.credential,
								expires_at: parseJwt(response.credential).exp,
							});
						}}
						onFailure={(response) => {
							console.warn("Google Login: Failure", response);
						}}
					/>
				) : (
					<Button
						color="inherit"
						onClick={() => {
							googleLogout();
							delLoginToken();
						}}
					>
						Logout
					</Button>
				)}
			</Grid>
		</GoogleOAuthProvider>
	);
}
