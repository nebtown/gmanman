import React, { useState, useEffect, useRef, useCallback } from "react";
import axios from "axios";
import classNames from "classnames";

import { Helmet } from "react-helmet";
import queryString from "query-string";
import { List, AutoSizer } from "react-virtualized";
import "react-virtualized/styles.css"; // only needs to be imported once

import Container from "@material-ui/core/Container";

export default ({name}) => {
	const isSSR = typeof window === "undefined";
	const [list, setList] = useState([]);
	const imageHeight = 150;
	const rowHeight = imageHeight + 5;
	useEffect(() => {
		async function fetch() {
			const { data } = await axios.get(
				`http://nebtown.info/ss/ssviewer.php?name=${name}&format=json`
			);
			const newList = data.images;
			newList.reverse();
			setList(newList);

			if (location.hash.length > 1) {
				const resume = location.hash.substr(1);
				const index = newList.indexOf(resume);
				if (index !== -1) {
					setForceScrollTop(index * rowHeight);
				}
			}
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
					"#" + list[Math.min(list.length, Math.floor(scrollTop / rowHeight))];
			}
		},
		[scrollTopRef, list]
	);

	let renderedContainer = (
		<Container>
			<Helmet>
				<title>SSGrid</title>
			</Helmet>
			<div
				style={{ width: "calc(100vw - 3rem)", height: "calc(100vh - 3rem)" }}
			>
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
									style={{
										...style,
										height: rowHeight,
										width,
										paddingBottom: 5,
									}}
								>
									<a
										href={`http://nebtown.info/ss/${name}/${list[index]}`}
										target="_blank"
									>
										<img
											height={imageHeight}
											src={`http://nebtown.info/ss/${name}/${list[index]}`}
										/>
									</a>
								</div>
							)}
						/>
					)}
				</AutoSizer>
			</div>
		</Container>
	);
	return renderedContainer;
};
