import React, { useEffect, useState } from "react";
import PropTypes from "prop-types";
import { FixedSizeList } from "react-window";
import axios from "axios";
import AwesomeDebouncePromise from "awesome-debounce-promise";
import useConstant from "use-constant";
import { useSnackbar } from "notistack";

import { makeStyles } from "@material-ui/core/styles";
import Autocomplete from "@material-ui/lab/Autocomplete";
import CircularProgress from "@material-ui/core/CircularProgress";
import TextField from "@material-ui/core/TextField";
import Button from "@material-ui/core/Button";
import AddIcon from "@material-ui/core/SvgIcon/SvgIcon";

function renderRow(props) {
	const { data, index, style } = props;

	return React.cloneElement(data[index], {
		style: {
			overflow: "hidden",
			textOverflow: "ellipsis",
			whiteSpace: "nowrap",
			display: "block",
			padding: 0,
			...style,
		},
	});
}
// Adapter for react-window
const ListboxComponent = React.forwardRef(function ListboxComponent(
	props,
	ref
) {
	const { children, ...other } = props;
	const itemCount = Array.isArray(children) ? children.length : 0;
	const itemSize = 51;

	const outerElementType = React.useMemo(() => {
		return React.forwardRef((props2, ref2) => (
			<div ref={ref2} {...props2} {...other} />
		));
	}, []); // eslint-disable-line react-hooks/exhaustive-deps

	return (
		<div ref={ref}>
			<FixedSizeList
				style={{
					padding: 0,
					height: Math.min(6, itemCount) * itemSize,
					maxHeight: "auto",
					overflowX: "hidden",
				}}
				itemData={children}
				height={250}
				width="100%"
				outerElementType={outerElementType}
				innerElementType="ul"
				itemSize={itemSize}
				overscanCount={5}
				itemCount={itemCount}
			>
				{renderRow}
			</FixedSizeList>
		</div>
	);
});
ListboxComponent.propTypes = {
	children: PropTypes.oneOf([
		PropTypes.node,
		PropTypes.arrayOf(PropTypes.node),
	]),
};

const useStyles = makeStyles({
	option: {
		flexDirection: "column",
		alignItems: "start",
	},
	listbox: {
		"& ul": {
			padding: 0,
			margin: 0,
		},
	},
	popup: {
		zIndex: 1400,
	},
});

ModsSearch.propTypes = {
	modsUrl: PropTypes.string.isRequired,
	currentMods: PropTypes.array.isRequired,
	setCurrentMods: PropTypes.func.isRequired,
	supportsModList: PropTypes.bool,
	supportsModSearch: PropTypes.bool,
};

export default function ModsSearch({
	modsUrl,
	currentMods,
	setCurrentMods,
	supportsModList,
	supportsModSearch,
}) {
	const classes = useStyles();
	const { enqueueSnackbar } = useSnackbar();
	const [modIdInput, setModIdInput] = useState("");
	const [modTextInput, setModTextInput] = useState("");
	const [open, setOpen] = useState(false);
	const [options, setOptions] = useState([]);

	// Some games can provide a full list of mods, allowing clientside search
	// if unavailable, serverside search is used
	// if neither, provide a basic text input
	const useServersideSearch = supportsModSearch && !supportsModList;
	const loading = open && !useServersideSearch && options.length === 0;

	// Fetch whole Mod List (clientside searching)
	useEffect(() => {
		let active = true;
		if (!loading || !supportsModList || useServersideSearch) {
			return undefined;
		}

		(async () => {
			const { data } = await axios.get(modsUrl + "list/");
			if (active) {
				setOptions(
					data.mods.filter(
						({ id }) =>
							!currentMods.some(({ id: currentModId }) => id === currentModId)
					)
				);
			}
		})();

		return () => {
			active = false;
		};
	}, [
		open,
		loading,
		currentMods,
		supportsModList,
		useServersideSearch,
		modsUrl,
	]);

	// Serverside Search for mods (partial clientside filtering)
	const queryServerSearch = async (query) => {
		if (!query || query.length < 3) {
			return;
		}

		try {
			const { data } = await axios.get(modsUrl + "search/", {
				params: { q: query },
			});
			setOptions(data.mods);
			setModTextInput(query);
		} catch (err) {
			console.warn("search/ error", err.message, err?.response?.data?.error);
			enqueueSnackbar(err?.response?.data?.error || "Search failed", {
				variant: "error",
			});
		}
	};
	const debouncedQueryServerSearch = useConstant(() =>
		AwesomeDebouncePromise(queryServerSearch, 300)
	);

	return (
		<>
			{supportsModList || supportsModSearch ? (
				<Autocomplete
					style={{ width: 280 }}
					classes={classes}
					open={open}
					onOpen={() => {
						setOpen(true);
					}}
					onClose={() => {
						setOpen(false);
					}}
					onChange={(event, option) => {
						setModIdInput(option ? option.id : "");
					}}
					getOptionLabel={(option) => option.label || option.id}
					renderOption={(option) => {
						if (option.label) {
							return (
								<div style={{ padding: "6px 16px" }}>
									<div>{option.label}</div>
									<div style={{ fontSize: "x-small" }}>
										{option.href ? (
											<a
												href={option.href}
												target="_blank"
												rel="noopener noreferrer"
											>
												{option.id}
											</a>
										) : (
											option.id
										)}
									</div>
								</div>
							);
						}
						return option.id;
					}}
					disableListWrap
					ListboxComponent={ListboxComponent}
					options={options}
					loading={loading}
					noOptionsText="No mods found"
					renderInput={(params) => (
						<TextField
							{...params}
							id="new-mod-field"
							margin="dense"
							variant="outlined"
							onChange={(event) =>
								useServersideSearch &&
								debouncedQueryServerSearch(event.target.value)
							}
							fullWidth
							InputProps={{
								...params.InputProps,
								endAdornment: (
									<>
										{loading ? (
											<CircularProgress color="inherit" size={20} />
										) : null}
										{params.InputProps.endAdornment}
									</>
								),
							}}
						/>
					)}
				/>
			) : (
				<TextField
					id="new-mod-field"
					label="New Mod ID"
					value={modIdInput}
					onChange={(event) => {
						const val = event.target.value.replace(/[\r\n,]/, "");
						setModIdInput(val);
						setModTextInput(val);
					}}
					margin="dense"
					variant="outlined"
				/>
			)}

			<Button
				onClick={() => {
					let modId = (modIdInput || "").trim();
					let modOption;
					if (modId) {
						modOption = options.find(
							({ id, label }) => id === modId || label === modId
						);
					}
					if (!modOption) {
						modOption = options.find(
							({ id, label }) => id === modTextInput || label === modTextInput
						);
					}
					if (!modOption) {
						return;
					}
					setCurrentMods([...currentMods, { ...modOption, enabled: true }]);
					setModIdInput("");
					setModTextInput("");
				}}
				startIcon={<AddIcon />}
			>
				Add
			</Button>
		</>
	);
}
