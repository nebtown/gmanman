import React, { useEffect, useState } from "react";
import PropTypes from "prop-types";
import { FixedSizeList } from "react-window";
import axios from "axios";

import { makeStyles } from "@material-ui/core/styles";
import Autocomplete from "@material-ui/lab/Autocomplete";
import CircularProgress from "@material-ui/core/CircularProgress";
import TextField from "@material-ui/core/TextField";

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
	supportsModList: PropTypes.bool,
	modIdInput: PropTypes.string,
	setModIdInput: PropTypes.func.isRequired,
};

export default function ModsSearch({
	modsUrl,
	currentMods,
	supportsModList,
	modIdInput,
	setModIdInput,
}) {
	const classes = useStyles();
	const [open, setOpen] = useState(false);
	const [options, setOptions] = React.useState([]);
	const loading = open && options.length === 0;
	useEffect(() => {
		let active = true;
		if (!loading || !supportsModList) {
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
	}, [open, loading, currentMods, supportsModList, modsUrl]);
	/*useEffect(() => {
		if (!open) {
			setOptions([]);
		}
	}, [open]);*/

	return supportsModList ? (
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
			getOptionLabel={option => option.label || option.id}
			renderOption={option => {
				if (option.label) {
					return (
						<div style={{ padding: "6px 16px" }}>
							<div>{option.label}</div>
							<div style={{ fontSize: "x-small" }}>{option.id}</div>
						</div>
					);
				}
				return option.id;
			}}
			disableListWrap
			ListboxComponent={ListboxComponent}
			options={options}
			loading={loading}
			renderInput={params => (
				<TextField
					{...params}
					id="new-mod-field"
					margin="dense"
					variant="outlined"
					fullWidth
					InputProps={{
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
			onChange={event =>
				setModIdInput(event.target.value.replace(/[\r\n,]/, ""))
			}
			margin="dense"
			variant="outlined"
		/>
	);
}
