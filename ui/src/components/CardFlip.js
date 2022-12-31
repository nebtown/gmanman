import React from "react";
import PropTypes from "prop-types";
import { css } from "@emotion/react";

CardFlip.propTypes = {
	cardFront: PropTypes.node,
	cardBack: PropTypes.node,
	flipped: PropTypes.bool,
};

export default function CardFlip({ cardFront, cardBack, flipped }) {
	const cardCommon = `
		backface-visibility: hidden;
		position: absolute;
		top: 0;
		left: 0;
		width: 100%;
	`;
	return (
		<div
			css={css`
				perspective: 600px;
				position: relative;
			`}
		>
			<div
				css={css`
					transform-style: preserve-3d;
					transition: all 0.5s ease;
					${flipped && `transform: rotateY(180deg);`}
				`}
			>
				<div
					css={css`
						${cardCommon}
						${!flipped && `position: static;`}
					`}
				>
					{cardFront}
				</div>

				<div
					css={css`
						${cardCommon}
						transform: rotateY(180deg);
						${flipped && `position: static;`}
					`}
				>
					{cardBack}
				</div>
			</div>
		</div>
	);
}
