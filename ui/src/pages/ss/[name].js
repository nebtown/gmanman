import React, { useState, useEffect, useRef, useCallback } from "react";
import axios from "axios";
import classNames from "classnames";

import queryString from "query-string";
import { List, AutoSizer } from "react-virtualized";
import "react-virtualized/styles.css"; // only needs to be imported once

import makeStyles from "@mui/styles/makeStyles";
import Slider from "@mui/material/Slider";

const useStyles = makeStyles({
	root: {
		width: "98%",
	},
});

export function Head() {
	return <title>SSGrid</title>;
}

// https://codesandbox.io/s/7y66p25qv6 looks neat for a grid-er view, unsure how to "scroll to image" then though

const SSGalleryPage = ({ name }) => {
	const isSSR = typeof window === "undefined";
	const [list, setList] = useState([]);
	const [imageHeight, setImageHeight] = useState(150);
	const classes = useStyles();
	const rowHeight = imageHeight + 5;

	function scrollToHash() {
		if (list.length === 0 || location.hash.length <= 1) {
			return;
		}
		const resume = location.hash.substr(1);
		const index = list.indexOf(resume);
		if (index !== -1) {
			setForceScrollTop(index * rowHeight);
		}
	}
	useEffect(scrollToHash, [list, imageHeight]);

	useEffect(() => {
		async function fetch() {
			const { data } = await axios.get(
				`https://nebtown.info/ss/ssviewer.php?name=${name}&format=json`
			);
			const newList = data.images;
			newList.reverse();
			setList(newList);
		}
		fetch();
	}, [name]);

	const scrollTopRef = useRef();
	const [forceScrollTop, setForceScrollTop] = useState();

	useEffect(() => {
		// We need to reset scrollTop value once it was consumed by the list because otherwise the user will be unable to scroll
		if (forceScrollTop !== undefined) {
			setForceScrollTop(undefined);
		}
	}, [forceScrollTop]);

	const onScroll = useCallback(
		({ scrollTop }) => {
			scrollTopRef.current = scrollTop;
			if (list.length > 0) {
				window.location.hash =
					"#" +
					list[
						Math.max(
							0,
							Math.min(list.length, Math.floor(scrollTop / rowHeight))
						)
					];
			}
		},
		[scrollTopRef, list, rowHeight]
	);

	let renderedContainer = (
		<div
			style={{ width: "calc(100vw - 1rem)", height: "calc(100vh - 3.5rem)" }}
		>
			Lookin at {name}'s Screenshots
			<Slider
				defaultValue={imageHeight}
				className={classes.root}
				aria-labelledby="discrete-slider"
				valueLabelDisplay="auto"
				step={25}
				marks
				min={50}
				max={400}
				onChange={(e, value) => {
					setImageHeight(value);
				}}
			/>
			<AutoSizer>
				{({ height, width }) => (
					<List
						scrollTop={forceScrollTop}
						onScroll={onScroll}
						width={width}
						height={height}
						rowCount={list.length}
						rowHeight={rowHeight}
						rowRenderer={({ key, index, isScrolling, isVisible, style }) => (
							<div
								key={key}
								className="ss-container"
								style={{
									...style,
									height: rowHeight,
									width,
									paddingBottom: 5,
								}}
							>
								<a
									href={`https://nebtown.info/ss/${name}/${list[index]}`}
									target="_blank"
								>
									<img
										height={imageHeight}
										src={`https://nebtown.info/ss/${name}/${list[index]}`}
									/>
								</a>
							</div>
						)}
					/>
				)}
			</AutoSizer>
		</div>
	);
	return renderedContainer;
};

export default SSGalleryPage;
