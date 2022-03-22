/******************************************************************************
 * Warcraft II Map Editor                                                     *
 *                                                                            *
 * Copyright (C) 2018 J.C. Fields (jcfields@jcfields.dev).                    *
 *                                                                            *
 * Permission is hereby granted, free of charge, to any person obtaining a    *
 * copy of this software and associated documentation files (the "Software"), *
 * to deal in the Software without restriction, including without limitation  *
 * the rights to use, copy, modify, merge, publish, distribute, sublicense,   *
 * and/or sell copies of the Software, and to permit persons to whom the      *
 * Software is furnished to do so, subject to the following conditions:       *
 *                                                                            *
 * The above copyright notice and this permission notice shall be included in *
 * all copies or substantial portions of the Software.                        *
 *                                                                            *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR *
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,   *
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL    *
 * THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER *
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING    *
 * FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER        *
 * DEALINGS IN THE SOFTWARE.                                                  *
 ******************************************************************************/

"use strict";

/*
 * constants
 */

const STORAGE_NAME = "pudedit";

// file format
const FILE_SIGNATURE = "WAR2 MAP\x00\x00\x0a\xff";
const STANDARD  = 0x11;
const EXPANSION = 0x13;
const MIME_TYPE = "application/x-warcraft2-scenario";
const DEFAULT_FILE_NAME = "Untitled.pud";
const SLOTS = 16; // total players (including unused)

// editor
const MAPS_DIR          = "maps";
const DEFAULT_PALETTE   = "units";
const DEFAULT_TILESET   = 0;
const DEFAULT_SIZE      = 128;
const MINIMAP_SIZE      = 200;
const LEFT_MARGIN       = 270;
const FRAME_COLOR       = "#fff";
const PLACE_VALID_COLOR = "#fff";
const PLACE_ERROR_COLOR = "#f00";
const SELECT_COLOR      = "#0f0";

// mouse modes
const SELECT_UNITS  = 0;
const DRAG_SELECT   = 1;
const PLACE_UNIT    = 2;
const PAINT_TERRAIN = 3;
const DRAG_TERRAIN  = 4;

// game mechanics
const PLAYERS        = 8;
const NEUTRAL_PLAYER = 15;
const TILE_SIZE      = 32;
const MINI_TILE_SIZE = 8;
const MAX_WIDTH      = 128;
const MAX_HEIGHT     = 128;
const STARTING_RESOURCE = 1000;
const DEFAULT_GOLD   = 6; // x2500
const DEFAULT_OIL    = 2; // x2500
const RESOURCE_AREA  = 3; // distance between gold mines/town halls
const LAST_ICON      = 195;

// tilesets
const FOREST    = 0;
const WINTER    = 1;
const WASTELAND = 2;
const SWAMP     = 3;

// races
const HUMAN_RACE = 0x00;
const ORC_RACE   = 0x01;
const NEUTRAL_RACE = 0x02;

// controllers
const PASSIVE_COMPUTER = 0x02;
const NOBODY   = 0x03;
const COMPUTER = 0x04;
const HUMAN    = 0x05;

// special units
const CRITTER         = 57;
const GOLD_MINE       = 92;
const OIL_PATCH       = 93;
const HUMAN_START_LOC = 94;
const ORC_START_LOC   = 95;
const CIRCLE_OF_POWER = 100;
const DARK_PORTAL     = 101;
const RUNESTONE       = 102;

// unit flags
const LAND_UNIT      = 0;
const AIR_UNIT       = 1;
const SEA_UNIT       = 3;
const BUILDING       = 5;
const SHORE_BUILDING = 16;
const GOLD_SOURCE    = 22;
const GOLD_DEPOT     = 12; // town halls
const OIL_SOURCE     = 21;
const OIL_PLATFORM   = 11;
const OIL_DEPOT      = 24; // shipyards and refineries

// terrain
const PLAIN = 0, FILLER = 1, RANDOM = 2;
const INSPECT = 0x0000;
// solid tiles
const LIGHT_WATER = 0x0010, DARK_WATER = 0x0020;
const LIGHT_DIRT  = 0x0030, DARK_DIRT  = 0x0040;
const LIGHT_GRASS = 0x0050, DARK_GRASS = 0x0060;
const TREES       = 0x0070, ROCKS      = 0x0080;
const HUMAN_WALL  = 0x0090, ORC_WALL   = 0x00a0;
const HUMAN_IWALL = 0x00b0, ORC_IWALL  = 0x00c0;
// boundary tiles
const DARK_WATER_LIGHT_WATER = 0x0100, LIGHT_WATER_LIGHT_DIRT = 0x0200;
const DARK_DIRT_LIGHT_DIRT   = 0x0300, ROCKS_LIGHT_DIRT       = 0x0400;
const LIGHT_DIRT_LIGHT_GRASS = 0x0500, DARK_GRASS_LIGHT_GRASS = 0x0600;
const TREES_LIGHT_GRASS      = 0x0700;
const HUMAN_WALL_BOUNDARY    = 0x0800, ORC_WALL_BOUNDARY      = 0x0900;

// map certificates
const BLIZZARD = 1, LADDER = 2;

// objects
const editor     = new Editor();
const properties = new Properties();
const files      = new Files("files");

/*
 * initialization
 */

window.addEventListener("load", function() {
	const store = new Storage(STORAGE_NAME);
	editor.loadSettings(store.load());

	files.openStartingMap();

	window.addEventListener("beforeunload", function() {
		store.save(editor.saveSettings());
	});
	window.addEventListener("keyup", function(event) {
		const keyCode = event.keyCode;

		if (keyCode == 13) { // Enter
			if (Object.keys(editor.selected).length > 0) {
				properties.openSheet("unitMap");
			}
		}

		if (keyCode == 27) { // Esc
			if (properties.active) {
				properties.hideAll();
			} else {
				$("#inspect").click();
			}
		}

		if (keyCode == 8 || keyCode == 46) { // Del
			event.preventDefault();
			editor.removeSelected();
		}

		if (keyCode >= 48 && keyCode <= 56) { // 0-8
			editor.selectPlayer(keyCode == 48 ? NEUTRAL_PLAYER : keyCode - 49);
		}
	});
	window.addEventListener("keydown", function(event) {
		const keyCode = event.keyCode;

		if (event.ctrlKey ^ event.metaKey) { // Ctrl or Cmd
			if (keyCode == 78) { // N
				event.preventDefault();
				create();
			} else if (keyCode == 79) { // O
				event.preventDefault();
				open();
			} else if (keyCode == 83) { // S
				event.preventDefault();
				save();
			}
		}
	});
	window.addEventListener("resize", function() {
		editor.drawFrame();
	});
	window.addEventListener("scroll", function() {
		editor.updateCoords();
		editor.drawFrame();
	});

	// mouse buttons
	const LEFT = 0, RIGHT = 2;

	document.addEventListener("click", function(event) {
		const element = event.target;

		if (element.closest("#create")) {
			create();
		}

		if (element.closest("#open")) {
			open();
		}

		if (element.closest("#save")) {
			save();
		}

		if (element.closest("#saveImage")) {
			editor.saveImage();
		}

		if (element.closest("#about")) {
			properties.show("about");
		}

		if (element.matches("#filename")) {
			properties.openSheet("map");
		}

		if (element.closest("#inspect")) {
			editor.clearSelect();
		}

		// new/open/save buttons
		if (element.closest(".basic")) {
			$("#" + element.closest(".basic").value).click();
		}

		// player buttons under minimap
		if (element.matches(".player")) {
			editor.selectPlayer(element.value);
		}

		// tool palette tabs
		if (element.matches(".tab")) {
			editor.selectPalette(element.value);
		}

		// layer toggles
		if (element.matches(".layer")) {
			$("#" + element.value).hidden = !element.checked;
		}

		// property sheet open buttons
		if (element.matches(".properties")) {
			properties.openSheet(element.value);
		}

		// property sheet save buttons
		if (element.closest(".save")) {
			properties.saveSheet(element.closest(".save").value);
		}

		// property sheet close buttons
		if (element.closest(".close")) {
			properties.hide(element.closest(".close").value);
		}

		// property sheet "Use default values" buttons
		if (element.matches(".defaults")) {
			$("#select_" + element.value).disabled = element.checked;
		}

		// property sheet "Revert" buttons
		if (element.matches(".revert")) {
			properties.revert(element.value);
		}

		// property sheet "Reset to Defaults" buttons
		if (element.matches(".reset")) {
			properties.reset(element.value);
		}

		// terrain brightness buttons
		if (element.closest(".brightness")) {
			editor.brightness = toggleButtons(element.closest(".brightness"));
		}

		// terrain pattern buttons
		if (element.closest(".pattern")) {
			editor.pattern = toggleButtons(element.closest(".pattern"));
		}

		// terrain brush size buttons
		if (element.closest(".size")) {
			editor.size = toggleButtons(element.closest(".size"));
		}

		// terrain tile buttons
		if (element.closest(".terrain")) {
			editor.tile = toggleButtons(element.closest(".terrain"));
			editor.mode = editor.tile == INSPECT ? SELECT_UNITS : PAINT_TERRAIN;
		}

		// unit palette buttons
		if (element.closest(".unit")) {
			editor.placeUnit(Number(element.closest(".unit").value));
		}

		// file browser parent directory
		if (element.matches(".parent")) {
			event.preventDefault();
			files.browseParent();
		}

		// file browser directory
		if (element.matches(".dir")) {
			event.preventDefault();
			files.browseDir(element.value);
		}

		// restrictions table column
		if (element.matches(".restCol")) {
			const value = Number(element.value);

			for (const element of $$(".restrictions")) {
				const [type, index, player] = element.id.split("_");

				if (player == value) {
					element.checked = !element.checked;
				}
			}
		}

		// restrictions table row
		if (element.matches(".restRow")) {
			const value = Number(element.value);

			for (const element of $$(".restrictions")) {
				const [type, index, player] = element.id.split("_");

				if (index == value) {
					element.checked = !element.checked;
				}
			}
		}
	});
	document.addEventListener("input", function(event) {
		const element = event.target;

		if (element.matches("#select_unitsPalette")) {
			editor.changeUnitPalette();
		}

		if (element.matches("#number_icon")) {
			properties.changeIcon(element, $("#icon"), $("#select_upgrades"));
		}

		if (element.matches("#range_property")) {
			properties.changeResource();
		}

		if (element.matches(".fill")) {
			const key = element.id.replace("select_", "");

			if (key != "restrictions") {
				const select = $("#select_" + key);
				const option = select.options[select.selectedIndex];
				$("#legend_" + key).textContent = option.label;
			}

			properties.saveWorking(key);
			properties.fillSheet(key);
		}
	});
	document.addEventListener("mousedown", function(event) {
		const element = event.target;

		if (element.matches == undefined) {
			return;
		}

		if (element.matches("#frame")) {
			if (event.button == LEFT) {
				editor.dragFrame = true;
			}
		}

		if (element.matches("#select")) {
			if (event.button == LEFT) {
				switch (editor.mode) {
					case SELECT_UNITS:
						editor.startSelect(event.clientX, event.clientY);
						break;
					case PLACE_UNIT:
						editor.addUnit(event.clientX, event.clientY);
						break;
					case PAINT_TERRAIN:
						editor.paintTerrain(event.clientX, event.clientY);
						break;
				}
			}
		}
	});
	document.addEventListener("mouseup", function(event) {
		const element = event.target;

		if (element.matches == undefined) {
			return;
		}

		if (element.matches("#frame")) {
			if (event.button == LEFT) {
				editor.dragFrame = false;
				editor.moveMap(event.clientX, event.clientY);
			}
		}

		if (element.matches("#select")) {
			if (event.button == LEFT) {
				switch (editor.mode) {
					case DRAG_SELECT:
						editor.selectUnits(
							event.clientX, event.clientY,
							event.shiftKey
						);
						break;
					case DRAG_TERRAIN:
						editor.mode = PAINT_TERRAIN;
						editor.paintTerrain(event.clientX, event.clientY);
						break;
				}
			} else if (event.button == RIGHT) {
				switch (editor.mode) {
					case SELECT_UNITS:
						if (Object.keys(editor.selected).length > 0) {
							properties.openSheet("unitMap");
						}

						break;
					case PLACE_UNIT:
					case PAINT_TERRAIN:
						$("#inspect").click();
						break;
				}
			}

			editor.updateUnitInfo();
		}
	});
	document.addEventListener("mousemove", function(event) {
		const element = event.target;

		if (element.matches == undefined) {
			return;
		}

		if (element.matches("#frame")) {
			if (editor.dragFrame) {
				editor.moveMap(event.clientX, event.clientY);
			}
		}

		if (element.matches("#select")) {
			switch (editor.mode) {
				case DRAG_SELECT:
					editor.drawSelect(event.clientX, event.clientY);
					break;
				case PLACE_UNIT:
					editor.drawUnitBrush(event.clientX, event.clientY);
					break;
				case PAINT_TERRAIN:
					editor.drawTerrainBrush(event.clientX, event.clientY);
					break;
				case DRAG_TERRAIN:
					editor.paintTerrain(event.clientX, event.clientY);
					break;
			}

			if ($("#details_tileInfo").open) {
				editor.updateTileInfo(event.clientX, event.clientY);
			}
		}
	});
	document.addEventListener("contextmenu", function(event) {
		const element = event.target;

		if (element.matches("#select")) {
			event.preventDefault();
		}
	});

	// for property sheet widgets
	$("#file").addEventListener("change", files.openUploadedFile.bind(files));

	function create() {
		properties.openSheet("create");
	}

	function open() {
		files.browse();
		properties.show("browser");
	}

	function save() {
		if (Object.keys(editor.pud) == 0) {
			return;
		}

		try {
			const blob = editor.pud.save();

			const a = $("#download");
			a.download = editor.pud.filename;
			a.href = window.URL.createObjectURL(blob);
			a.click();
			window.URL.revokeObjectURL(blob);
		} catch (error) {
			properties.displayError(error);
		}
	}

	function toggleButtons(button) {
		const value = Number(button.value);

		for (const element of $$("." + button.className)) {
			element.classList.toggle("active", value == Number(element.value));
		}

		return value;
	}
});

function $(selector) {
	return document.querySelector(selector);
}

function $$(selector) {
	return Array.from(document.querySelectorAll(selector));
}

/*
 * Editor prototype
 */

function Editor() {
	this.pud = {};
	this.path = "";

	this.mode = SELECT_UNITS;
	this.palette = "";

	// canvas drawing contexts
	this.tileMap = null;
	this.unitMap = null;
	this.unitBuffer = null;
	this.select = null;
	this.miniTileMap = null;
	this.miniUnitMap = null;
	this.miniUnitBuffer = null;
	this.frame = null;
	this.tiles = null;

	// box selection
	this.selectMultiple = false;
	this.selected = {};
	this.selectX = 0;
	this.selectY = 0;

	// minimap frame
	this.dragFrame = false;
	this.pos = null;
	this.x = 0;
	this.y = 0;
	this.scaleX = 0;
	this.scaleY = 0;

	// unit placement
	this.unit = 0;
	this.player = 0;

	// terrain
	this.brightness = 0;
	this.pattern = PLAIN;
	this.size = 1;
	this.tile = LIGHT_GRASS;
	this.terrainX = 0;
	this.terrainY = 0;
}

Editor.prototype.open = function(path, pud) {
	window.scrollTo(0, 0);

	this.path = path;
	this.pud = pud;

	if (!this.pud.isValid) {
		return properties.displayError("The map file is corrupted or invalid.");
	}

	document.title = this.pud.filename;
	$("#filename").textContent = this.pud.filename;

	$("#text_filename").classList.toggle(
		"blizzard", this.pud.certificate == BLIZZARD
	);
	$("#text_filename").classList.toggle(
		"ladder", this.pud.certificate == LADDER
	);

	const width  = this.pud.width  * TILE_SIZE;
	const height = this.pud.height * TILE_SIZE;

	setCanvasSize("tileMap",     width,        height);
	setCanvasSize("unitMap",     width,        height);
	setCanvasSize("movementMap", width,        height);
	setCanvasSize("actionMap",   width,        height);
	setCanvasSize("select",      width,        height);
	setCanvasSize("miniUnitMap", MINIMAP_SIZE, MINIMAP_SIZE);
	setCanvasSize("miniTileMap", MINIMAP_SIZE, MINIMAP_SIZE);
	setCanvasSize("frame",       MINIMAP_SIZE, MINIMAP_SIZE);

	this.tileMap = $("#tileMap").getContext("2d");
	this.unitMap = $("#unitMap").getContext("2d");
	this.movementMap = $("#movementMap").getContext("2d");
	this.actionMap = $("#actionMap").getContext("2d");
	this.select = $("#select").getContext("2d");
	this.miniTileMap = $("#miniTileMap").getContext("2d");
	this.miniUnitMap = $("#miniUnitMap").getContext("2d");
	this.frame = $("#frame").getContext("2d");

	// buffers are kept in memory but never inserted into DOM
	this.unitBuffer     = createBuffer("unitMap");
	this.miniUnitBuffer = createBuffer("miniUnitMap");

	this.pos = $("#frame").getBoundingClientRect();
	this.scaleX = MINIMAP_SIZE / $("#tileMap").width;
	this.scaleY = MINIMAP_SIZE / $("#tileMap").height;

	this.miniTileMap.scale(this.scaleX, this.scaleY);
	this.miniUnitMap.scale(this.scaleX, this.scaleY);
	this.miniUnitBuffer.scale(this.scaleX, this.scaleY);

	this.selectPlayer(this.player || 0);
	this.selectPalette(this.palette || DEFAULT_PALETTE);

	// draws tile map and unit map, changes unit icons to match tileset
	this.changeTileset(this.pud.tileset);

	this.drawMovementMap();
	this.drawActionMap();

	function setCanvasSize(id, w, h) {
		$("#" + id).width  = w;
		$("#" + id).height = h;
	}

	function createBuffer(id) {
		const buffer = document.createElement("canvas");
		buffer.width  = $("#" + id).width;
		buffer.height = $("#" + id).height;

		return buffer.getContext("2d");
	}
};

Editor.prototype.drawTileMap = function() {
	const tiles = data.tiles[this.pud.tileset];
	let x = 0, y = 0;

	for (const [i, tile] of this.pud.tileMap.entries()) {
		const cx = x * TILE_SIZE;
		const cy = y * TILE_SIZE;

		if (tile in tiles) {
			this.tileMap.drawImage(
				this.tiles,
				tiles[tile].x, tiles[tile].y,
				TILE_SIZE, TILE_SIZE,
				cx, cy,
				TILE_SIZE, TILE_SIZE
			);
			this.miniTileMap.drawImage(
				this.tiles,
				tiles[tile].x, tiles[tile].y,
				MINI_TILE_SIZE, MINI_TILE_SIZE,
				cx, cy,
				TILE_SIZE, TILE_SIZE
			);
		} else {
			const hex = this.formatHex(tile);
			console.error(`Missing terrain tile: ${hex} at (${x}, ${y})`);
		}

		if ((i + 1) % this.pud.width == 0) { // new row
			x = 0;
			y++;
		} else {
			x++;
		}
	}
};

Editor.prototype.drawUnitMap = function() {
	const width = $("#unitMap").width;
	const height = $("#unitMap").height;

	// clears canvas every time or units will stack when tileset changed
	this.unitBuffer.clearRect(0, 0, width, height);
	this.miniUnitBuffer.clearRect(0, 0, width, height);

	const top = [], bottom = [];

	// sorts units by stacking priority
	for (const [i, unit] of this.pud.unitMap.entries()) {
		if (
			unit.id == HUMAN_START_LOC || unit.id == ORC_START_LOC
			|| this.pud.units.flags[unit.id][AIR_UNIT]
		) {
			top.push(i);
		} else {
			bottom.push(i);
		}
	}

	Promise.all(bottom.map(drawUnit.bind(this))).then(function() {
		// draws flying units and start locations after other units
		Promise.all(top.map(drawUnit.bind(this))).then(function() {
			// draws units after all images have loaded
			this.unitMap.clearRect(0, 0, width, height);
			this.unitMap.drawImage(
				this.unitBuffer.canvas,
				0, 0,
				width, height
			);

			this.miniUnitMap.clearRect(0, 0, width, height);
			this.miniUnitMap.drawImage(
				this.miniUnitBuffer.canvas,
				0, 0,
				width, height
			);
		}.bind(this));
	}.bind(this));

	function drawUnit(i) {
		return new Promise(function(resolve) {
			const unit = this.pud.unitMap[i];
			let unitSize = 1;

			if (unit.id in this.pud.units.unitSize) {
				unitSize = this.pud.units.unitSize[unit.id];
			} else {
				console.error("Missing unit size for unit:", unit.id);
			}

			const path = "units/" + data.tilesets[this.pud.tileset] + "/";

			const img = new Image();
			img.src = path + unit.id.toString().padStart(4, "0") + ".png";
			img.addEventListener("load", function() {
				const x = unit.x * TILE_SIZE;
				const y = unit.y * TILE_SIZE;

				const w = unitSize.x * TILE_SIZE;
				const h = unitSize.y * TILE_SIZE;

				drawToUnitMap.call(this, x, y, w, h, i, unit, img);
				drawToMiniMap.call(this, x, y, w, h, unit);

				resolve();
			}.bind(this));

			return img;
		}.bind(this));
	}

	function drawToUnitMap(x, y, w, h, i, unit, img) {
		const owner = Math.min(unit.owner, 7);
		const startLocation = unit.id == HUMAN_START_LOC
			|| unit.id == ORC_START_LOC;
		let sx = 0, sy = 0;

		if (!startLocation && !this.pud.units.flags[unit.id][BUILDING]) {
			// centers unit in tile
			x -= (img.width - w) / 2;
			y -= (img.width - h) / 2;

			w = img.width;
			h = w;

			if (this.pud.unitMap[i].position == undefined) {
				// picks random idle frame
				sy = h * Math.floor(Math.random() * 5);
				this.pud.unitMap[i].position = sy;
			} else {
				sy = this.pud.unitMap[i].position;
			}
		}

		this.unitBuffer.drawImage(img, sx, sy, w, h, x, y, w, h);

		if (owner == 0) { // artwork is already in player 1 colors by default
			return;
		}

		const imageData = this.unitBuffer.getImageData(x, y, w, h);

		// changes player colors to match unit owner
		for (let i = 0; i < imageData.data.length; i += 4) { // 4 for RGBA
			for (let j = 0; j < 4; j++) { // 4 colors for each player
				if (
					imageData.data[i]        == data.colors[0][j].r
					&& imageData.data[i + 1] == data.colors[0][j].g
					&& imageData.data[i + 2] == data.colors[0][j].b
				) {
					imageData.data[i]     = data.colors[owner][j].r;
					imageData.data[i + 1] = data.colors[owner][j].g;
					imageData.data[i + 2] = data.colors[owner][j].b;
				}
			}
		}

		this.unitBuffer.putImageData(imageData, x, y);
	}

	function drawToMiniMap(x, y, w, h, unit) {
		// neutral players use player 8 colors
		const owner = Math.min(unit.owner, 7);

		// uses first player color for minimap squares
		const r  =data.colors[owner][0].r.toString(16).padStart(2, "0");
		const g = data.colors[owner][0].g.toString(16).padStart(2, "0");
		const b = data.colors[owner][0].b.toString(16).padStart(2, "0");

		x = Math.floor(x);
		y = Math.floor(y);
		w = Math.ceil(w);
		h = Math.ceil(h);

		this.miniUnitBuffer.fillStyle = "#" + r + g + b;
		this.miniUnitBuffer.fillRect(x, y, w, h);
	}
};

Editor.prototype.drawMovementMap = function() {
	const w = TILE_SIZE - 4;
	const h = w;
	let x = 0, y = 0;

	this.movementMap.lineWidth = 1;

	for (const [i, tile] of this.pud.movementMap.entries()) {
		if (tile in data.movement) {
			this.movementMap.strokeStyle = data.movement[tile];
			this.movementMap.strokeRect(
				x * TILE_SIZE + 2, y * TILE_SIZE + 2, w, h
			);
		} else {
			const hex = this.formatHex(tile);
			console.error(`Missing movement tile: ${hex} at (${x}, ${y})`);
		}

		if ((i + 1) % this.pud.width == 0) { // new row
			x = 0;
			y++;
		} else {
			x++;
		}
	}
};

Editor.prototype.drawActionMap = function() {
	const w = TILE_SIZE - 12;
	const h = w;
	let x = 0, y = 0;

	this.actionMap.lineWidth = 1;

	for (const [i, tile] of this.pud.actionMap.entries()) {
		const type = (tile & 0xff00) >> 8;

		if (type in data.action) {
			this.actionMap.strokeStyle = data.action[type];
			this.actionMap.strokeRect(
				x * TILE_SIZE + 6, y * TILE_SIZE + 6, w, h
			);
		} else {
			const hex = this.formatHex(tile);
			console.error(`Missing action tile: ${hex} at (${x}, ${y})`);
		}

		if ((i + 1) % this.pud.width == 0) { // new row
			x = 0;
			y++;
		} else {
			x++;
		}
	}
};

Editor.prototype.moveMap = function(clientX, clientY) {
	if (this.pos != null) {
		const x = clientX - this.pos.left;
		const y = clientY - this.pos.top;

		window.scroll(
			x / this.scaleX - window.innerWidth / 2 - LEFT_MARGIN,
			y / this.scaleY - window.innerHeight
		);
	}
};

Editor.prototype.updateCoords = function() {
	this.x = this.scaleX * window.scrollX;
	this.y = this.scaleY * window.scrollY;
};

Editor.prototype.drawFrame = function() {
	if (this.frame != null) {
		this.frame.clearRect(0, 0, $("#frame").width, $("#frame").height);
		this.frame.lineWidth = 2;
		this.frame.strokeStyle = FRAME_COLOR;
		this.frame.strokeRect(
			this.x, this.y,
			this.scaleX * (window.innerWidth - LEFT_MARGIN),
			this.scaleY * window.innerHeight
		);
	}
};

Editor.prototype.clearSelect = function() {
	this.select.clearRect(0, 0, $("#select").width, $("#select").height);
};

Editor.prototype.startSelect = function(clientX, clientY) {
	this.mode = DRAG_SELECT;
	this.selectX = window.scrollX + clientX - LEFT_MARGIN;
	this.selectY = window.scrollY + clientY;
};

Editor.prototype.drawSelect = function(clientX, clientY) {
	this.selectMultiple = true;

	const w = window.scrollX + clientX - this.selectX - LEFT_MARGIN;
	const h = window.scrollY + clientY - this.selectY;

	this.clearSelect();
	this.select.lineWidth = 1;
	this.select.strokeStyle = SELECT_COLOR;
	this.select.strokeRect(this.selectX, this.selectY, w, h);
};

Editor.prototype.selectUnits = function(clientX, clientY, add=false) {
	this.mode = SELECT_UNITS;

	if (!add) {
		this.selected = {};

		this.clearSelect();
		this.select.lineWidth = 1;
		this.select.strokeStyle = SELECT_COLOR;
	}

	const [x, y] = this.findNearestTile(clientX, clientY);

	const mx = Math.floor(this.selectX / TILE_SIZE);
	const my = Math.floor(this.selectY / TILE_SIZE);

	const nx = Math.min(mx, x);
	const ny = Math.min(my, y);

	const w = Math.abs(mx - x);
	const h = Math.abs(my - y);

	if (this.selectMultiple && (w < 0 || h < 0)) {
		// treats box select as single-unit click if smaller than tile size;
		// prevents annoying misclicks
		this.selectMultiple = false;
	}

	for (const [i, unit] of this.pud.unitMap.entries()) {
		if (this.pud.units.unitSize[unit.id] == undefined) {
			continue;
		}

		const unitSize = this.pud.units.unitSize[unit.id];
		let isSelected = false;

		if (this.selectMultiple) {
			isSelected = nx < unit.x + unitSize.x
			          && nx + w > unit.x
			          && ny < unit.y + unitSize.y
			          && ny + h > unit.y;
		} else {
			isSelected = x <= unit.x + unitSize.x - 1
			          && x + w >= unit.x
			          && y <= unit.y + unitSize.y - 1
			          && y + h >= unit.y;
		}

		if (isSelected && (!add || this.selected[i] == undefined)) {
			this.select.strokeRect(
				unit.x * TILE_SIZE, unit.y * TILE_SIZE,
				unitSize.x * TILE_SIZE, unitSize.y * TILE_SIZE
			);

			this.selected[i] = unit;
		}
	}

	this.selectMultiple = false;
};

Editor.prototype.drawUnitBrush = function(clientX, clientY) {
	const unitSize = this.pud.units.unitSize[this.unit];
	const [x, y] = this.findNearestTile(
		clientX, clientY,
		unitSize.x, unitSize.y
	);

	const isValid = this.validateArea(x, y);

	this.clearSelect();
	this.select.lineWidth = 1;
	this.select.strokeStyle = isValid ? PLACE_VALID_COLOR : PLACE_ERROR_COLOR;
	this.select.strokeRect(
		x * TILE_SIZE, y * TILE_SIZE,
		TILE_SIZE * unitSize.x, TILE_SIZE * unitSize.y
	);
};

Editor.prototype.drawTerrainBrush = function(clientX, clientY) {
	const [x, y] = this.findNearestTile(clientX, clientY, this.size, this.size);

	this.clearSelect();
	this.select.lineWidth = 1;
	this.select.strokeStyle = PLACE_VALID_COLOR;
	this.select.strokeRect(
		x * TILE_SIZE, y * TILE_SIZE,
		TILE_SIZE * this.size, TILE_SIZE * this.size
	);
};

Editor.prototype.placeUnit = function(id) {
	this.mode = PLACE_UNIT;
	this.unit = id;

	this.selected = {};
	this.updateUnitInfo();
};

Editor.prototype.addUnit = function(clientX, clientY) {
	const unitSize = this.pud.units.unitSize[this.unit];
	const [x, y] = this.findNearestTile(
		clientX, clientY,
		unitSize.x, unitSize.y
	);

	if (!this.validateArea(x, y)) {
		return;
	}

	const flags = this.pud.units.flags[this.unit];
	const id = this.unit;
	let owner = this.player;
	let property = 0;

	// default resources
	if (flags[GOLD_SOURCE]) {
		property = DEFAULT_GOLD;
	} else if (flags[OIL_SOURCE] || flags[OIL_PLATFORM]) {
		property = DEFAULT_OIL;
	}

	const NEUTRAL_UNITS = new Set([CRITTER, GOLD_MINE, OIL_PATCH,
		CIRCLE_OF_POWER, DARK_PORTAL, RUNESTONE]);

	// places certain units and buildings as neutral player regardless of
	// selected player (can reassign ownership in selection properties)
	if (NEUTRAL_UNITS.has(id)) {
		owner = NEUTRAL_PLAYER;
	}

	// removes existing start location if new one is placed
	if (id == HUMAN_START_LOC || id == ORC_START_LOC) {
		for (const [i, unit] of this.pud.unitMap.entries()) {
			const startLocation = unit.id == HUMAN_START_LOC
			                    | unit.id == ORC_START_LOC;

			if (startLocation && unit.owner == this.player) {
				this.removeUnit(i);
			}
		}
	}

	this.pud.unitMap.push({x, y, id, owner, property, position: undefined});
	this.drawUnitMap();
};

Editor.prototype.removeUnit = function(id) {
	this.pud.unitMap = this.pud.unitMap.filter(function(undefined, i) {
		return id != i;
	});
	this.drawUnitMap();
};

Editor.prototype.removeSelected = function() {
	this.pud.unitMap = this.pud.unitMap.filter(function(undefined, i) {
		return !(i in this.selected);
	}, this);
	this.clearSelect();
	this.drawUnitMap();

	this.selected = {};
	this.updateUnitInfo();
};

Editor.prototype.convertUnit = function(id, oldPlayer, newPlayer) {
	const oldRace = data.races[this.pud.races[oldPlayer]];
	const newRace = data.races[this.pud.races[newPlayer]];

	if (oldRace == newRace) {
		return id;
	}

	for (const group of Object.keys(data.units)) {
		for (const type of Object.keys(data.units[group])) {
			for (const oldRace of Object.keys(data.units[group][type])) {
				if (data.units[group][type][oldRace] == undefined) {
					continue;
				}

				if (data.units[group][type][oldRace].id != id) {
					continue;
				}

				if (data.units[group][type][newRace] == undefined) {
					continue;
				}

				id = data.units[group][type][newRace].id;
				break;
			}
		}
	}

	return id;
};

Editor.prototype.convertAllUnits = function(player, newRaceId) {
	const newRace = data.races[newRaceId];

	for (const unit of this.pud.unitMap) {
		if (unit.owner != player) {
			continue;
		}

		for (const group of Object.keys(data.units)) {
			for (const type of Object.keys(data.units[group])) {
				for (const oldRace of Object.keys(data.units[group][type])) {
					if (data.units[group][type][oldRace] == undefined) {
						continue;
					}

					if (data.units[group][type][oldRace].id != unit.id) {
						continue;
					}

					if (data.units[group][type][newRace] == undefined) {
						continue;
					}

					unit.id = data.units[group][type][newRace].id;
					break;
				}
			}
		}
	}

	this.drawUnitMap();
};

Editor.prototype.paintTerrain = function(clientX, clientY) {
	const [x, y] = this.findNearestTile(clientX, clientY, this.size, this.size);

	if (this.terrainX == x && this.terrainY == y) {
		return;
	}

	this.mode = DRAG_TERRAIN;
	this.drawTerrainBrush(clientX, clientY);

	this.terrainX = x;
	this.terrainY = y;

	let tile = this.tile;

	if (tile >= LIGHT_WATER && tile < TREES) {
		tile += this.brightness; // adds 0x0010 for dark version of tile
	}

	// draws main tiles
	for (let i = 0; i < this.size; i++) {
		for (let j = 0; j < this.size; j++) {
			const point = x + i + (y + j) * this.pud.width;

			this.pud.tileMap[point] = tile;
			drawTile.call(this, point, tile);
		}
	}

	const changes = [];
	const boundary = computeBoundary.call(this, x, y, this.size);

	for (const point of boundary) {
		let tile = this.pud.tileMap[point];

		// adjacent tiles
		const t = getTileType.call(this, point - this.pud.width);
		const r = getTileType.call(this, point + 1);
		const b = getTileType.call(this, point + this.pud.width);
		const l = getTileType.call(this, point - 1);

		// corner tiles
		const tl = getTileType.call(this, point - this.pud.width - 1);
		const tr = getTileType.call(this, point - this.pud.width + 1);
		const bl = getTileType.call(this, point + this.pud.width - 1);
		const br = getTileType.call(this, point + this.pud.width + 1);

		if (tile == LIGHT_DIRT) {
			if (t == DARK_DIRT || r == DARK_DIRT || b == DARK_DIRT || l == DARK_DIRT) {
				tile = DARK_DIRT_LIGHT_DIRT;

				if (t == LIGHT_DIRT && r == DARK_DIRT && b == DARK_DIRT && l == LIGHT_DIRT) {
					tile += 0x00;
				} else if (t == DARK_DIRT && r == DARK_DIRT && b == LIGHT_DIRT && l == LIGHT_DIRT) {
					tile += 0x10;
				} else if (t == DARK_DIRT && r == LIGHT_DIRT && b == LIGHT_DIRT && l == DARK_DIRT) {
					tile += 0x70;
				} else if (t == LIGHT_DIRT && r == LIGHT_DIRT && b == DARK_DIRT && l == DARK_DIRT) {
					tile += 0x80;
				} else if (t == LIGHT_DIRT && b == DARK_DIRT) {
					tile += 0x20;
				} else if (t == DARK_DIRT && b == LIGHT_DIRT) {
					tile += 0xb0;
				} else if (r == DARK_DIRT && l == LIGHT_DIRT) {
					tile += 0x40;
				} else if (r == LIGHT_DIRT && l == DARK_DIRT) {
					tile += 0x90;
				}
			}
		}

		changes.push([point, tile]);
	}

	// draws boundary tiles
	for (const [point, tile] of changes) {
		this.pud.tileMap[point] = tile;
		drawTile.call(this, point, tile);
	}

	function computeBoundary(x, y, size) {
		const points = [];

		// corners
		points.push(createPoint.call(this, x - 1,    y - 1));    // top-left
		points.push(createPoint.call(this, x + size, y - 1));    // top-right
		points.push(createPoint.call(this, x - 1,    y + size)); // bottom-left
		points.push(createPoint.call(this, x + size, y + size)); // bottom-right

		// sides
		for (let i = 0; i < size; i++) {
			points.push(createPoint.call(this, x + i,    y - 1));    // top
			points.push(createPoint.call(this, x + i,    y + size)); // bottom
			points.push(createPoint.call(this, x - 1,    y + i));    // left
			points.push(createPoint.call(this, x + size, y + i));    // right
		}

		return points.filter(function(point) {
			return point != undefined;
		});
	}

	function createPoint(x, y) {
		if (x >= 0 && x < this.pud.width && y >= 0 && y < this.pud.height) {
			return x + y * this.pud.width;
		}
	}

	function getTileType(point) {
		const boundary = this.pud.tileMap[point] & 0x0f00;
		const solid    = this.pud.tileMap[point] & 0x00f0;

		return boundary == 0x0000 ? solid : boundary;
	}

	function drawTile(point, tile) {
		if (tile in data.tiles[this.pud.tileset]) {
			const tiles = data.tiles[this.pud.tileset];
			let cx = point % this.pud.width * TILE_SIZE;
			let cy = Math.floor(point / this.pud.height) * TILE_SIZE;

			this.tileMap.drawImage(
				this.tiles,
				tiles[tile].x, tiles[tile].y,
				TILE_SIZE, TILE_SIZE,
				cx, cy,
				TILE_SIZE, TILE_SIZE
			);
			this.miniTileMap.drawImage(
				this.tiles,
				tiles[tile].x, tiles[tile].y,
				MINI_TILE_SIZE, MINI_TILE_SIZE,
				cx, cy,
				TILE_SIZE, TILE_SIZE
			);
		} else {
			let hex = this.formatHex(tile);
			console.error(`Missing terrain tile: ${hex} at (${x}, ${y})`);
		}
	}
};

Editor.prototype.findNearestTile = function(clientX, clientY, w=0, h=0) {
	clientX += window.scrollX;
	clientY += window.scrollY;

	let x = Math.max(Math.floor((clientX - LEFT_MARGIN) / TILE_SIZE), 0);
	let y = Math.max(Math.floor(clientY / TILE_SIZE), 0);

	if (this.mode == PLACE_UNIT) {
		const flags = this.pud.units.flags[this.unit];

		// oil patches are only allowed on odd dimensions
		if (flags[OIL_SOURCE] || flags[OIL_PLATFORM]) {
			if (x % 2 == 0) {
				x++;
			}

			if (y % 2 == 0) {
				y++;
			}
		}

		// air and sea units are only allowed on even dimensions
		if (flags[AIR_UNIT] || flags[SEA_UNIT]) {
			if (x % 2 != 0) {
				x++;
			}

			if (y % 2 != 0) {
				y++;
			}
		}
	}

	if (x + w > this.pud.width) {
		x = this.pud.width - w; // prevents placing past map width
	}

	if (y + h > this.pud.width) {
		y = this.pud.height - h; // prevents placing past map height
	}

	return [x, y];
};

Editor.prototype.validateArea = function(x, y) {
	const startLocation = this.unit == HUMAN_START_LOC
	                    | this.unit == ORC_START_LOC;
	let isValid = true;

	if (startLocation && this.player == NEUTRAL_PLAYER) {
		return; // cannot place start location for neutral player
	}

	const LAND = 0b001, AIR = 0b010, SEA = 0b100;
	const flags = this.pud.units.flags[this.unit];
	const unitSize = this.pud.units.unitSize[this.unit];
	const unitType = getUnitType(flags);

	// checks if area contains other units
	for (const otherUnit of this.pud.unitMap.values()) {
		const unitStartLocation = otherUnit.id == HUMAN_START_LOC
			|| otherUnit.id == ORC_START_LOC;

		// start locations ignore collision with everything except
		// other start locations and neutral units
		if ((startLocation ^ unitStartLocation)
			&& otherUnit.owner != NEUTRAL_PLAYER
		) {
			continue;
		}

		const otherUnitType = getUnitType(this.pud.units.flags[otherUnit.id]);
		const otherFlags = this.pud.units.flags[otherUnit.id];

		// allows air units over ground/sea units and buildings
		if (
			(flags[AIR_UNIT] ^ otherFlags[AIR_UNIT])
			&& ((unitType & (LAND | SEA) || flags[BUILDING])
				^ (otherUnitType == LAND
				|| otherUnitType == SEA
				|| otherFlags[BUILDING]))
		) {
			continue;
		}

		const otherUnitSize = this.pud.units.unitSize[otherUnit.id];

		if (
			x < otherUnit.x + otherUnitSize.x
			&& x + unitSize.x > otherUnit.x
			&& y < otherUnit.y + otherUnitSize.y
			&& y + unitSize.y > otherUnit.y
		) {
			isValid = false;
		} else if (
			(flags[GOLD_SOURCE] && otherFlags[GOLD_DEPOT])
			|| (flags[GOLD_DEPOT] && otherFlags[GOLD_SOURCE])
			|| ((flags[OIL_SOURCE] || flags[OIL_PLATFORM])
				&& otherFlags[OIL_DEPOT])
			|| (flags[OIL_DEPOT]
				&& (otherFlags[OIL_SOURCE] || otherFlags[OIL_PLATFORM]))
		) { // enforces resource exclusion area
			if (
				x < otherUnit.x + otherUnitSize.x + RESOURCE_AREA
				&& x + unitSize.x + RESOURCE_AREA > otherUnit.x
				&& y < otherUnit.y + otherUnitSize.y + RESOURCE_AREA
				&& y + unitSize.y + RESOURCE_AREA > otherUnit.y
			) {
				isValid = false;
			}
		}

		if (!isValid) {
			break;
		}
	}

	let coastTiles = 0;

	// checks if unit is allowed on movement tile
	for (let i = 0; i < unitSize.y; i++) {
		for (let j = 0; j < unitSize.x; j++) {
			const point = x + j + this.pud.width * (y + i);

			const special = this.pud.movementMap[point] & 0xff00;
			const tile    = this.pud.movementMap[point] & 0x00ff;

			if (special == 0x00) {
				if (flags[BUILDING]) { // buildings
					if (flags[SHORE_BUILDING]) {
						isValid &= tile == 0x02 || tile == 0x82 || tile == 0x40;

						// counts coast tiles
						coastTiles += tile == 0x02 || tile == 0x82;
					} else if (flags[OIL_SOURCE] || flags[OIL_PLATFORM]) {
						isValid &= tile == 0x00 || tile == 0x40;
					} else {
						isValid &= tile == 0x00 || tile == 0x01;
					}
				} else { // units
					if (unitType & LAND || startLocation) {
						isValid &= tile == 0x00 || tile == 0x01 || tile == 0x11;
					} else if (unitType & AIR) {
						isValid &= true;
					} else if (unitType & SEA) {
						isValid &= tile == 0x00 || tile == 0x40;
					}
				}
			} else if (special == 0x02) {
				if (unitType & AIR) {
					isValid = false;
				}
			} else if (special == 0xff) {
				isValid = false;
			}

			if (!isValid) {
				break;
			}
		}
	}

	if (flags[SHORE_BUILDING]) {
		// shore buildings must be on at least one coast tile
		isValid &= coastTiles > 0;
	}

	return isValid;

	function getUnitType(flags) {
		const type = flags[LAND_UNIT]
		           | flags[AIR_UNIT] << 1
		           | flags[SEA_UNIT] << 2;

		// treats as land if no flags set (special case for ballista/catapult)
		return type || LAND;
	}
};

Editor.prototype.updateTileInfo = function(clientX, clientY) {
	const [x, y] = this.findNearestTile(clientX, clientY);

	$("#text_tileX").value = x;
	$("#text_tileY").value = y;

	const point = x + this.pud.width * y;
	$("#text_point").value = point;

	if (point <= this.pud.tileMap.length) {
		$("#text_terrainTile").value = this.formatHex(this.pud.tileMap[point]);
	}

	if (point <= this.pud.movementMap.length) {
		$("#text_moveTile").value = this.formatHex(this.pud.movementMap[point]);
	}

	if (point <= this.pud.actionMap.length) {
		$("#text_actionTile").value = this.formatHex(this.pud.actionMap[point]);
	}
};

Editor.prototype.updateUnitInfo = function() {
	const selected = Object.keys(this.selected).length;
	const multipleUnits = selected != 1;

	if (!multipleUnits) {
		const selection = Object.values(this.selected)[0];

		$("#text_unitX").value = selection.x;
		$("#text_unitY").value = selection.y;

		if (selection.owner < PLAYERS) {
			$("#owner").textContent = "Player " + (selection.owner + 1);
		} else {
			$("#owner").textContent = "Neutral";
		}

		const id = selection.id;

		// finds unit name from ID
		for (const group of Object.keys(data.units)) {
			for (const type of Object.keys(data.units[group])) {
				for (const unit of Object.values(data.units[group][type])) {
					if (unit.id == id) {
						$("#unitType").textContent = unit.name;
						break;
					}
				}
			}
		}
	}

	$("#oneUnit").hidden       =  multipleUnits;
	$("#multipleUnits").hidden = !multipleUnits;

	$("#selected").textContent = selected;
};

Editor.prototype.selectPlayer = function(player) {
	for (const element of $$(".player")) {
		element.classList.toggle("current", element.value == player);
	}

	player = Number(player);

	let ownerChanged = 0;

	// does not reassign ownership of certain units in box selections (can only
	// do so explicitly in selection properties)
	const OMIT_UNITS = new Set([CRITTER, GOLD_MINE, OIL_PATCH,
		HUMAN_START_LOC, ORC_START_LOC]);

	// reassigns owner of selected units
	for (const unit of Object.values(this.selected)) {
		if (OMIT_UNITS.has(unit.id)) {
			continue;
		}

		// changes race of unit when owner is changed if necessary
		unit.id = this.convertUnit(unit.id, unit.owner, player);
		unit.owner = player;
		ownerChanged++;
	}

	const raceChanged = this.pud.races[this.player] != this.pud.races[player];

	if (ownerChanged || raceChanged) {
		// redraws units if owner or race changes
		this.drawUnitMap();

		if (this.mode == PLACE_UNIT) {
			this.unit = this.convertUnit(this.unit, this.player, player);
		}
	}

	this.player = player;

	if (raceChanged) {
		this.changeUnitPalette();
	}
};

Editor.prototype.selectPalette = function(palette) {
	for (const element of $$(".palette")) {
		element.classList.toggle("open", element.id == palette);
	}

	for (const element of $$(".tab")) {
		element.classList.toggle("current", element.value == palette);
	}

	this.palette = palette;
};

Editor.prototype.changeTileset = function(tileset) {
	this.pud.tileset = tileset;

	this.tiles = new Image();
	this.tiles.src = "tilesets/" + data.tilesets[tileset] + ".png";
	this.tiles.addEventListener("load", this.drawTileMap.bind(this));

	if (tileset == FOREST || tileset == SWAMP) {
		// remaps tiles that are unspecified for forest and swamp tilesets
		this.pud.tileMap = this.pud.tileMap.map(function(oldTile, point) {
			switch (oldTile) {
				case 0x0015:
				case 0x0016:
				case 0x0017:
				case 0x0025:
				case 0x0026:
				case 0x0027:
					const newTile = oldTile - 0x0004;
					reportChange.call(this, point, oldTile, newTile);

					return newTile;
				default:
					return oldTile;
			}
		}.bind(this));
	}

	if (tileset == SWAMP) {
		// remaps tiles that are unspecified for swamp tileset
		this.pud.tileMap = this.pud.tileMap.map(function(oldTile, point) {
			switch (oldTile) {
				case 0x003a:
				case 0x003b:
				case 0x004a:
				case 0x004b:
					const newTile = oldTile - 0x0005;
					reportChange.call(this, point, oldTile, newTile);

					return newTile;
				default:
					return oldTile;
			}
		}.bind(this));
	}

	// changes terrain buttons to match tileset
	for (const element of $$(".tile")) {
		const path = element.getAttribute("src").split("/");
		path[2] = data.tilesets[tileset];
		element.setAttribute("src", path.join("/"));
	}

	this.drawFrame();
	this.drawUnitMap();
	this.changeUnitPalette();

	function reportChange(point, oldTile, newTile) {
		const x = point % this.pud.width;
		const y = Math.floor(point / this.pud.height);

		const oldHex = this.formatHex(oldTile);
		const newHex = this.formatHex(newTile);

		console.warn(`Changed tile: ${oldHex} to ${newHex} at (${x}, ${y})`);
	}
};

Editor.prototype.changeUnitPalette = function() {
	const group = $("#select_unitsPalette").value;

	if (data.units[group] == undefined) {
		return;
	}

	const ul = document.createElement("ul");
	ul.id = "unitsPalette";

	for (const type of Object.values(data.units[group])) {
		let race = data.races[this.pud.races[this.player]];

		if (type[race] == undefined) {
			race = "neutral";
		}

		const unit = type[race];

		const li = document.createElement("li");
		const button = document.createElement("button");
		const img = document.createElement("img");

		const icon = unit.icon.toString().padStart(4, "0") + ".png";

		button.value = unit.id;
		button.classList.add("unit");
		button.setAttribute("type", "button");

		img.src = "icons/" + data.tilesets[this.pud.tileset] + "/" + icon;
		img.setAttribute("alt", "[" + unit.name + "]");
		img.setAttribute("title", unit.name);

		button.appendChild(img);
		li.appendChild(button);
		ul.appendChild(li);
	}

	$("#unitsPalette").replaceWith(ul);
};

Editor.prototype.saveImage = function() {
	const canvas = document.createElement("canvas");
	canvas.width  = $("#tileMap").width;
	canvas.height = $("#tileMap").height;

	const context = canvas.getContext("2d");
	// composites all layers into a single image
	drawLayer($("#tileMap"));
	drawLayer($("#unitMap"));
	drawLayer($("#movementMap"));
	drawLayer($("#actionMap"));

	const filename = this.pud.filename.replace(/\.pud$/, ".png");

	canvas.toBlob(function(blob) {
		const a = $("#download");
		a.download = filename;
		a.href = window.URL.createObjectURL(blob);
		a.click();
		window.URL.revokeObjectURL(blob);
	}, "image/png");

	function drawLayer(element) {
		if (!element.hidden) {
			context.drawImage(element, 0, 0, canvas.width, canvas.height);
		}
	}
};

Editor.prototype.formatHex = function(num) {
	return "0x" + num.toString(16).toUpperCase().padStart(4, "0");
};

Editor.prototype.loadSettings = function(settings) {
	if (settings == null) {
		return;
	}

	const {panels, player, palette} = settings;

	if (panels != undefined) {
		for (const panel of panels) {
			$("#" + panel.id).open = panel.state;
		}
	}

	this.player = player || 0;
	this.palette = palette || DEFAULT_PALETTE;
};

Editor.prototype.saveSettings = function() {
	const panels = [];

	for (const element of $$("details")) {
		panels.push({
			id:    element.id,
			state: element.open
		});
	}

	return {
		panels:  panels,
		player:  this.player,
		palette: this.palette
	};
};

/*
 * Properties prototype
 */

function Properties() {
	// currently active sheet
	this.active = "";

	// working object
	this.working = {};
	this.index = "";
}

Properties.prototype.show = function(id) {
	this.hideAll();
	this.active = id;
	$("#overlay_" + id).classList.add("open");

	editor.dragFrame = false;

	if (editor.mode != SELECT_UNITS) {
		editor.mode = SELECT_UNITS;
		editor.clearSelect();
	}
};

Properties.prototype.hide = function(id) {
	this.active = "";
	this.working = {};
	this.index = "";
	$("#overlay_" + id).classList.remove("open");
};

Properties.prototype.hideAll = function() {
	if (this.active) {
		this.hide(this.active);
	}
};

Properties.prototype.displayError = function(message) {
	$("#overlay_error>p").textContent = message;
	this.show("error");
};

Properties.prototype.openSheet = function(key) {
	if (key == this.active) { // checks if properties sheet already open
		return;
	}

	const openSheet = {
		create:       openCreate,
		map:          openMap,
		players:      openPlayers,
		resources:    openResources,
		units:        openUnits,
		upgrades:     openUpgrades,
		restrictions: openRestrictions,
		unitMap:      openSelection
	}[key];

	if (openSheet != undefined) {
		openSheet.call(this);
		this.show(key);
	} else {
		console.error(`Unknown property sheet: ${key}`);
	}

	function openCreate() {
		setRadio("size",    editor.pud.width || DEFAULT_SIZE);
		setRadio("terrain", editor.pud.tileset || 0);
	}

	function openMap() {
		setRadio("tileset", editor.pud.tileset);

		$("#text_filename").value    = editor.pud.filename;
		$("#text_width").value       = editor.pud.width;
		$("#text_height").value      = editor.pud.height;
		$("#text_description").value = editor.pud.description;
	}

	function openPlayers() {
		for (const element of $$(".ai")) {
			for (const [id, name] of data.ai) {
				const option = document.createElement("option");
				option.value = id;
				option.textContent = name;
				element.appendChild(option);
			}
		}

		for (let i = 0; i < PLAYERS; i++) {
			setRadio("race" + i,        editor.pud.races[i]);
			setSelect("controller" + i, editor.pud.controller[i]);
			setSelect("ai" + i,         editor.pud.ai[i]);
		}
	}

	function openResources() {
		for (let i = 0; i < PLAYERS; i++) {
			$("#number_startGold" + i).value   = editor.pud.startGold[i];
			$("#number_startLumber" + i).value = editor.pud.startLumber[i];
			$("#number_startOil" + i).value    = editor.pud.startOil[i];
		}
	}

	function openUnits() {
		const select = $("#select_units");
		const units = {};

		for (const group of Object.keys(data.units)) { // sorts units by race
			for (const type of Object.keys(data.units[group])) {
				for (const race of Object.keys(data.units[group][type])) {
					if (units[race] == undefined) {
						units[race] = [];
					}

					const unit = data.units[group][type][race];

					if (unit.skip) { // start locations and walls
						continue;
					}

					units[race].push(unit);
				}
			}
		}

		for (const race of Object.keys(units)) {
			const optgroup = document.createElement("optgroup");
			const label = race.charAt(0).toUpperCase() + race.slice(1);
			optgroup.setAttribute("label", label);

			units[race].sort();

			for (const unit of units[race]) {
				const option = document.createElement("option");
				option.value = unit.id;
				option.textContent = unit.name;
				optgroup.appendChild(option);
			}

			select.appendChild(optgroup);
		}

		$("#checkbox_units").checked = editor.pud.units.useDefaults;
		select.disabled = editor.pud.units.useDefaults;
		select.selectedIndex = 0;

		const option = select.options[select.selectedIndex];
		$("#legend_units").textContent = option.label;

		this.fillSheet("units");
	}

	function openUpgrades() {
		const select = $("#select_upgrades");

		for (const race of Object.keys(data.upgrades)) {
			const optgroup = document.createElement("optgroup");
			const label = race.charAt(0).toUpperCase() + race.slice(1);
			optgroup.setAttribute("label", label);

			for (const [id, name] of data.upgrades[race]) {
				const option = document.createElement("option");
				option.value = id;
				option.textContent = name;
				optgroup.appendChild(option);
			}

			select.appendChild(optgroup);
		}

		$("#checkbox_upgrades").checked = editor.pud.upgrades.useDefaults;
		select.disabled = editor.pud.upgrades.useDefaults;
		select.selectedIndex = 0;

		const option = select.options[select.selectedIndex];
		$("#legend_upgrades").textContent = option.label;

		this.fillSheet("upgrades");
	}

	function openRestrictions() {
		$("#checkbox_restrictions").checked = !editor.pud.useAlow;
		$("#select_restrictions").disabled = !editor.pud.useAlow;

		this.fillSheet("restrictions");
	}

	function openSelection() {
		const select = $("#select_unitMap");
		const units = {};

		while (select.options.length > 0) { // removes old items from list
			select.remove(0);
		}

		for (const group of Object.keys(data.units)) {
			for (const type of Object.keys(data.units[group])) {
				for (const unit of Object.values(data.units[group][type])) {
					units[unit.id] = unit.name;
				}
			}
		}

		for (const [key, value] of Object.entries(editor.selected)) {
			const item = document.createElement("option");
			item.value = key;
			item.textContent = units[value.id] || "Unknown";
			select.appendChild(item);
		}

		select.selectedIndex = 0;

		this.fillSheet("unitMap");
		this.changeResource();
	}

	function setRadio(name, compare) {
		for (const element of document.getElementsByName("radio_" + name)) {
			element.checked = element.value == compare;
		}
	}

	function setSelect(id, value) {
		const select = $("#select_" + id);
		const options = Array.from(select.options);

		select.selectedIndex = options.findIndex(function(option) {
			return option.value == value;
		});
	}
};

Properties.prototype.fillSheet = function(key) {
	if (editor.pud[key] == undefined) {
		return;
	}

	const fillSheet = {
		restrictions: fillRestrictions,
		unitMap:      fillSelection
	}[key];

	if (fillSheet != undefined) {
		return fillSheet.call(this);
	}

	const index = $("#select_" + key).value;
	let value = "";

	for (const element of $$("." + key)) {
		const [type, id, sub] = element.id.split("_");

		if (editor.pud[key][id] != undefined) {
			if (editor.pud[key][id][index] != undefined) {
				if (sub && editor.pud[key][id][index][sub] != undefined) {
					value = editor.pud[key][id][index][sub];
				}

				value = editor.pud[key][id][index];
			}
		}

		if (this.working[index] != undefined) {
			if (this.working[index][id] != undefined) {
				if (sub && this.working[index][id][sub] != undefined) {
					value = this.working[index][id][sub];
				}

				value = this.working[index][id];
			}
		}

		if (sub) {
			for (const property of Object.keys(value)) {
				if (property == sub) {
					if (type == "checkbox") {
						$("#" + element.id).checked = Boolean(value[property]);
					} else {
						$("#" + element.id).value = value[property];
					}
				}
			}
		} else {
			if (type == "checkbox") {
				$("#" + element.id).checked = Boolean(value);
			} else {
				$("#" + element.id).value = value;
			}
		}
	}

	if (key == "units") {
		$("#select_rmb").disabled = editor.pud.units.flags[index][BUILDING];
	} else if (key == "upgrades") {
		this.changeIcon($("#number_icon"), $("#icon"), $("#select_upgrades"));
	}

	this.index = index;

	function fillRestrictions() {
		const index = $("#select_restrictions").value;
		const category = index.replace(/Research(ed|ing)/, "");

		const table = document.createElement("table");
		const tr = document.createElement("tr");
		const th = document.createElement("th");
		tr.appendChild(th);

		for (let i = 1; i <= PLAYERS; i++) {
			const th = document.createElement("th");
			const button = document.createElement("button");
			button.value = i - 1;
			button.textContent = i;
			button.classList.add("restCol", "player" + i);
			th.appendChild(button);
			tr.appendChild(th);
		}

		if ($$(".restrictions").length > 0) {
			this.saveWorking("restrictions");
		}

		table.appendChild(tr);

		for (const [i, item] of data.restrictions[category].entries()) {
			if (item == "") {
				continue;
			}

			const tr = document.createElement("tr");
			const td = document.createElement("td");
			const button = document.createElement("button");
			button.value = i;
			button.textContent = item;
			button.classList.add("restRow");
			td.appendChild(button);
			tr.appendChild(td);

			for (let j = 0; j < PLAYERS; j++) {
				let value = false;

				if (this.working[index] != undefined) {
					if (this.working[index][i] != undefined) {
						value = this.working[index][i][j];
					}
				} else if (editor.pud.restrictions[index][j] != undefined) {
					value = editor.pud.restrictions[index][j][i];
				}

				if (value == undefined) {
					// false for researched/researching, true otherwise
					value = index == category;
				}

				const td = document.createElement("td");

				const input = document.createElement("input");
				input.id = "checkbox_" + i + "_" + j;
				input.checked = Boolean(value);
				input.value = i;
				input.classList.add("restrictions");
				input.setAttribute("type", "checkbox");

				td.appendChild(input);
				tr.appendChild(td);
			}

			table.appendChild(tr);
		}

		$("#restrictions table").replaceWith(table);
		this.index = index;
	}

	function fillSelection() {
		const select = $("#select_unitMap");
		const option = select.options[select.selectedIndex];
		const index = option.value;

		$("#legend_unitMap").textContent = option.label;

		this.saveWorking("unitMap");

		const unit = editor.selected[index];
		let value = "";

		for (const element of $$(".unitMap")) {
			const [type, id] = element.id.split("_");

			if (editor.selected[index] != undefined) {
				if (editor.selected[index][id] != undefined) {
					value = editor.selected[index][id];
				}
			}

			if (this.working[index] != undefined) {
				if (this.working[index][id] != undefined) {
					value = this.working[index][id];
				}
			}

			$("#" + element.id).value = value;
		}

		const startLocation = unit.id == HUMAN_START_LOC
			|| unit.id == ORC_START_LOC;

		$("#row_owner").hidden = startLocation;
		$("#select_owner").disabled = startLocation;

		const flags = editor.pud.units.flags[unit.id];
		const isResourceSource = flags[GOLD_SOURCE]
			|| flags[OIL_SOURCE]
			|| flags[OIL_PLATFORM];
		const isUnit = !startLocation && !flags[BUILDING];

		$("#row_resource").hidden = !isResourceSource;
		$("#range_property").disabled = !isResourceSource;

		$("#row_ai").hidden = !isUnit;
		$("#select_property").disabled = !isUnit;

		this.changeResource();
		this.index = index;
	}
};

Properties.prototype.saveSheet = function(key) {
	const saveSheet = {
		create:       saveCreate,
		map:          saveMap,
		players:      savePlayers,
		resources:    saveResources,
		units:        saveUnits,
		upgrades:     saveUpgrades,
		restrictions: saveRestrictions,
		unitMap:      saveSelection
	}[key];

	this.saveWorking(key);

	if (saveSheet != undefined) {
		saveSheet.call(this);
		this.hide(key);
	} else {
		console.error(`Unknown property sheet: ${key}`);
	}

	function saveCreate() {
		files.openTemplate(readRadio("terrain"), readRadio("size"));
	}

	function saveMap() {
		editor.pud.filename = $("#text_filename").value;
		editor.pud.description = $("#text_description").value;

		const tileset = readRadio("tileset");

		if (editor.pud.tileset != tileset){
			editor.changeTileset(tileset);
		}

		document.title = editor.pud.filename;
		$("#filename").textContent = editor.pud.filename;
	}

	function savePlayers() {
		for (let i = 0; i < PLAYERS; i++) {
			const oldRaceId = editor.pud.races[i];
			const newRaceId = readRadio("race" +  i);

			editor.pud.races[i]      = newRaceId;
			editor.pud.controller[i] = $("#select_controller" + i).value;
			editor.pud.ai[i]         = $("#select_ai" + i).value;

			if (oldRaceId != newRaceId) { // redraws units if race changes
				editor.convertAllUnits(i, newRaceId);
			}
		}

		editor.changeUnitPalette();
	}

	function saveResources() {
		for (let i = 0; i < PLAYERS; i++) {
			editor.pud.startGold[i]   = readNumber("startGold" + i);
			editor.pud.startLumber[i] = readNumber("startLumber" + i);
			editor.pud.startOil[i]    = readNumber("startOil" + i);
		}
	}

	function saveRestrictions() {
		for (const index of Object.keys(this.working)) {
			for (const i of Object.keys(this.working[index])) {
				for (const j of Object.keys(this.working[index][i])) {
					if (editor.pud.restrictions[index][j] == undefined) {
						continue;
					}

					const value = Boolean(this.working[index][i][j]);
					editor.pud.restrictions[index][j][i] = value;
				}
			}
		}

		editor.pud.useAlow = !$("#checkbox_restrictions").checked;
	}

	function saveSelection() {
		let ownerChanged = 0;

		for (const index of Object.keys(this.working)) {
			for (const property of Object.keys(this.working[index])) {
				if (editor.pud.unitMap[index] == undefined) {
					continue;
				}

				if (editor.pud.unitMap[index][property] == undefined) {
					continue;
				}

				const value = Number(this.working[index][property]);

				if (property == "owner") {
					const unit = editor.pud.unitMap[index];

					// changes race of unit when owner is changed if necessary
					unit.id = editor.convertUnit(unit.id, unit.owner, value);
					ownerChanged++;
				}

				editor.pud.unitMap[index][property] = value;

			}
		}

		if (ownerChanged) { // redraws units if owner changes
			editor.drawUnitMap();
		}
	}

	function saveUnits() {
		mergeWorking.call(this, "units");
	}

	function saveUpgrades() {
		mergeWorking.call(this, "upgrades");
	}

	function mergeWorking(key) {
		if (editor.pud[key] == undefined) {
			return;
		}

		for (const index of Object.keys(this.working)) {
			for (const property of Object.keys(this.working[index])) {
				if (editor.pud[key][property] == undefined) {
					continue;
				}

				if (editor.pud[key][property][index] == undefined) {
					continue;
				}

				const value = this.working[index][property];
				editor.pud[key][property][index] = value;
			}
		}

		editor.pud[key].useDefaults = $("#checkbox_" + key).checked;
	}

	function readNumber(id, size) {
		const num = Number($("#number_" + id).value);
		return Math.max(num, 0);
	}

	function readRadio(name) {
		for (const element of document.getElementsByName("radio_" + name)) {
			if (element.checked) {
				return Number(element.value);
			}
		}
	}
};

Properties.prototype.revert = function(key) {
	const index = $("#select_" + key).value;
	delete this.working[index];
	this.fillSheet(key);
};

Properties.prototype.reset = function(key) {
	const index = $("#select_" + key).value;

	if (this.working[index] == undefined) {
		this.working[index] = {};
	}

	for (const property of Object.keys(defaults[key])) {
		if (property == "useDefaults") {
			continue;
		}

		const keys = Object.keys(defaults[key][property][index]);

		if (keys.length > 0) {
			for (const sub of keys) {
				if (this.working[index][property] == undefined) {
					this.working[index][property] = {};
				}

				const value = defaults[key][property][index][sub];
				this.working[index][property][sub] = value;
			}
		} else {
			this.working[index][property] = defaults[key][property][index];
		}
	}

	this.fillSheet(key);
};

Properties.prototype.saveWorking = function(key) {
	if (this.index == "") {
		return;
	}

	this.working[this.index] = $$("." + key).reduce(function(obj, element) {
		if (!element.disabled) {
			const [type, id, sub] = element.id.split("_");
			let value = false;

			if (type == "checkbox") {
				value = element.checked;
			} else {
				value = Number(element.value);
			}

			if (sub == undefined) {
				obj[id] = value;
			} else {
				if (obj[id] == undefined) {
					obj[id] = {};
				}

				obj[id][sub] = value;
			}
		}

		return obj;
	}, {});
};

Properties.prototype.changeIcon = function(input, oldImg, select) {
	input.value = Math.min(Math.max(input.value, 0), LAST_ICON);

	const tileset = data.tilesets[editor.pud.tileset];
	const icon = input.value.padStart(4, "0");

	const newImg = new Image();
	newImg.src = "icons/" + tileset + "/" + icon + ".png";
	newImg.addEventListener("load", function() {
		oldImg.src = this.src;
	});
};

Properties.prototype.changeResource = function() {
	$("#resource").textContent = $("#range_property").value * 2500;
};

/*
 * Pud prototype
 */

function Pud() {
	this.filename = "";
	this.isValid = true;

	this.id = null;
	this.version = STANDARD;
	this.certificate = 0;
	this.description = "";
	this.width = 0;
	this.height = 0;
	this.tileset = 0;
	this.useAlow = false;

	this.races = null;
	this.controller = null;
	this.ai = null;

	this.startGold = [];
	this.startLumber = [];
	this.startOil = [];

	this.tileMap = [];
	this.movementMap = [];
	this.actionMap = [];
	this.oilMap = [];
	this.unitMap = [];

	this.units = {};
	this.upgrades = {};
	this.restrictions = {};
}

Pud.prototype.load = function(filename, buffer) {
	const sections = this.openFile(buffer);
	this.filename = filename;

	try {
		this.id             = readType.call(this);
		this.version        = readSection("VER ");
		this.description    = readDesc.call(this);
		this.controller     = readSection("OWNR");
		this.tileset        = readSection("ERAX") || readSection("ERA ");
		[this.width, this.height] = readDim();
		this.units          = readSection("UDTA");
		this.upgrades       = readSection("UGRD");
		this.restrictions   = readSection("ALOW") || {};
		this.races          = readSection("SIDE");
		this.startGold      = readSection("SGLD");
		this.startLumber    = readSection("SLBR");
		this.startOil       = readSection("SOIL");
		this.ai             = readSection("AIPL");
		this.tileMap        = readSection("MTXM");
		this.movementMap    = readSection("SQM ");
		this.oilMap         = readSection("OILM"); // unused
		this.actionMap      = readSection("REGM");
		this.certificate    = readSection("SIGN") || 0;
		this.unitMap        = readUnit();

		this.validateAfterLoad();
	} catch (error) {
		this.isValid = false;
		console.error(error);
	}

	function readSection(key) {
		const schema = data.schema[key];

		if (sections.get(key) == undefined) {
			if (schema.required) {
				throw `Missing required section: ${key}`;
			}

			return;
		}

		switch (schema.type) {
			case ARRAY:
				return makeArray(sections.get(key), schema.size);
			case MAP:
				return makeMap(sections.get(key), schema);
			case NUMBER:
				return parseNum(sections.get(key));
		}
	}

	// parses typed array to little-endian number
	function parseNum(originalArray) {
		return originalArray.reduce(function(num, hex, i) {
			return num + (hex << i * 8);
		}, 0);
	}

	// breaks typed array into array with elements of given size
	function makeArray(originalArray, size) {
		if (size == BYTE) {
			return originalArray;
		}

		const newArray = [];

		for (let i = 0; i < originalArray.length; i += size) {
			newArray.push(parseNum(originalArray.slice(i, i + size)));
		}

		return newArray;
	}

	// breaks typed array into named chunks containing arrays of given size
	function makeMap(originalArray, schema) {
		const newMap = {};
		let addr = 0;

		for (const [key, value] of schema.map) {
			const [len, size, type] = value;
			newMap[key] = originalArray.slice(addr, addr + len * size);

			switch (type) {
				case ARRAY:
					newMap[key] = makeArray(newMap[key], size);
					break;
				case BOOLEAN:
					newMap[key] = Boolean(newMap[key]);
					break;
				case DIMENSIONS:
					newMap[key] = parseDim(newMap[key]);
					break;
				case BIT_VECTOR:
					newMap[key] = parseBits(makeArray(newMap[key], size));
					break;
				case OCTAL:
					newMap[key] = parseOctal(newMap[key]);
					break;
			}

			addr += len * size;
		}

		return newMap;
	}

	// parses two words into dimensions
	function parseDim(originalArray) {
		const newArray = [];

		for (let i = 0; i < originalArray.length; i += DWORD) {
			newArray.push({
				x: originalArray[i],
				y: originalArray[i + WORD]
			});
		}

		return newArray;
	}

	// breaks bit vectors into arrays of booleans
	function parseBits(originalArray) {
		return originalArray.map(function(value) {
			const SIZE = 32;
			const newArray = [];

			for (let i = 0; i < SIZE; i++) {
				newArray.push(Boolean(value & (1 << i)));
			}

			return newArray;
		});
	}

	// parses octal values
	function parseOctal(originalArray) {
		return Array.from(originalArray).map(function(value) {
			return [
				Boolean(value & 0b001),
				Boolean(value & 0b010),
				Boolean(value & 0b100)
			];
		});
	}

	// identifies as pud file and gets unique map ID
	function readType() {
		const section = sections.get("TYPE");

		if (section == undefined) {
			throw "Missing required section: TYPE";
		}

		// checks for file format magic number
		// last two bytes can be any value
		if (!this.hexToStr(section).startsWith(FILE_SIGNATURE.slice(0, -2))) {
			throw "Invalid file signature.";
		}

		return section.slice(FILE_SIGNATURE.length); // returns ID
	}

	// reads scenario description
	function readDesc() {
		const section = sections.get("DESC");

		if (section == undefined) {
			throw "Missing required section: DESC";
		}

		const desc = this.hexToStr(section);

		// terminates at null char
		return desc.slice(0, desc.indexOf("\x00"));
	}

	// gets map dimensions
	function readDim() {
		const section = sections.get("DIM ");

		if (section == undefined) {
			throw "Missing required section: DIM ";
		}

		if (section.length != 4) {
			throw "Invalid map dimensions.";
		}

		const x = section[0];
		const y = section[2];

		if (x > MAX_WIDTH || y > MAX_HEIGHT) {
			throw "Map dimensions are too large.";
		}

		return [x, y];
	}

	// gets unit map
	function readUnit() {
		const section = sections.get("UNIT");

		if (section == undefined) {
			throw "Missing required section: UNIT";
		}

		const unitMap = [];

		for (let i = 0; i < section.length; i += QWORD) {
			unitMap.push({
				x:        parseNum(section.slice(i,     i + WORD)),
				y:        parseNum(section.slice(i + 2, i + 2 + WORD)),
				id:       section[i + 4],
				owner:    section[i + 5],
				property: parseNum(section.slice(i + 6, i + 6 + WORD)),
				position: undefined // used by editor, not part of format
			});
		}

		return unitMap;
	}
};

Pud.prototype.save = function() {
	this.validateBeforeSave();

	const sections = new Map([ // order is significant
		["TYPE", saveType.call(this)],
		["VER ", saveVers.call(this)],
		["DESC", saveDesc.call(this)],
		["OWNR", this.controller],
		["ERA ", saveEra.call(this)],
		["ERAX", saveErax.call(this)],
		["DIM ", saveSection("DIM ", this.width | this.height << 16)],
		["UDTA", saveSection("UDTA", this.units)],
		["UGRD", saveSection("UGRD", this.upgrades)],
		["ALOW", saveSection("ALOW", this.restrictions)],
		["SIDE", this.races],
		["SGLD", saveSection("SGLD", this.startGold)],
		["SLBR", saveSection("SLBR", this.startLumber)],
		["SOIL", saveSection("SOIL", this.startOil)],
		["AIPL", this.ai],
		["MTXM", saveSection("MTXM", this.tileMap)],
		["SQM ", saveSection("SQM ", this.movementMap)],
		["OILM", saveSection("OILM", this.oilMap)],
		["REGM", saveSection("REGM", this.actionMap)],
		["UNIT", saveUnit.call(this)]
	]);

	// only writes restriction data if not using default values
	if (!this.useAlow) {
		sections.delete("ALOW");
	}

	return this.createFile(sections);

	function saveSection(key, value) {
		const schema = data.schema[key];

		switch (schema.type) {
			case ARRAY:
				return convertArray(value, schema.size);
			case MAP:
				return convertMap(value, schema);
			case NUMBER:
				return convertNum(value, schema.size);
		}
	}

	// converts number to big-endian typed array
	function convertNum(num, size) {
		return new Uint8Array(size).map(function(undefined, i) {
			return (num & (0xff << i * 8)) >> i * 8;
		});
	}

	// converts array with elements of given size into typed array
	function convertArray(originalArray, size) {
		const newArray = new Uint8Array(originalArray.length * size);

		for (let i = 0; i < originalArray.length; i++) {
			const num = convertNum(originalArray[i], size);

			for (let j = 0; j < num.length; j++) {
				newArray[i * size + j] = num[j];
			}
		}

		return newArray;
	}

	function convertMap(originalMap, schema) {
		if (originalMap == undefined) {
			return;
		}

		let length = 0;

		for (const [key, value] of schema.map) {
			const [len, size, type] = value;
			length += len * size;
		}

		const newArray = new Uint8Array(length);
		let pos = 0;

		for (const [key, value] of schema.map) {
			const [len, size, type] = value;
			let contents = null;

			switch (type) {
				case ARRAY:
					contents = convertArray(originalMap[key], size);
					break;
				case BOOLEAN:
					contents = convertNum(Number(originalMap[key]), size);
					break;
				case DIMENSIONS:
					contents = convertDim(originalMap[key]);
					break;
				case BIT_VECTOR:
					contents = convertBits(originalMap[key]);
					break;
				case OCTAL:
					contents = convertOctal(originalMap[key]);
					break;
			}

			for (let i = 0; i < contents.length; i++, pos++) {
				newArray[pos] = contents[i];
			}
		}

		return newArray;
	}

	function convertDim(originalArray) {
		const newArray = new Uint8Array(DWORD * originalArray.length);
		let pos = 0;

		for (let i = 0; i < originalArray.length; i++, pos += DWORD) {
			const x = convertNum(originalArray[i].x, WORD);
			const y = convertNum(originalArray[i].y, WORD);

			newArray[pos]     = x[0];
			newArray[pos + 1] = x[1];
			newArray[pos + 2] = y[0];
			newArray[pos + 3] = y[1];
		}

		return newArray;
	}

	function convertBits(originalArray) {
		const newArray = new Uint8Array(originalArray.length * DWORD);
		let pos = 0;

		for (let i = 0; i < originalArray.length; i++) {
			let value = 0;

			for (let j = 0; j < originalArray[i].length; j++) {
				value += originalArray[i][j] << j;
			}

			const num = convertNum(value, DWORD);

			for (let j = 0; j < num.length; j++, pos++) {
				newArray[pos] = num[j];
			}
		}

		return newArray;
	}

	function convertOctal(originalArray) {
		return new Uint8Array(originalArray.length).map(function(undefined, i) {
			return originalArray[i][0] * 0b001
			     | originalArray[i][1] * 0b010
			     | originalArray[i][2] * 0b100;
		});
	}

	function saveType() {
		const len = FILE_SIGNATURE.length;
		const newArray = new Uint8Array(len + DWORD);

		for (let i = 0; i < len; i++) {
			newArray[i] = FILE_SIGNATURE.charCodeAt(i);
		}

		for (let i = 0; i < this.id.length; i++) {
			newArray[i + len] = this.id[i];
		}

		return newArray;
	}

	function saveVers() {
		const expansionHeroes = this.unitMap.some(function(unit) {
			return data.expansionHeroes.has(unit.id);
		});

		this.version = expansionHeroes ? EXPANSION : STANDARD;

		return convertNum(this.version, WORD);
	}

	function saveDesc() {
		const newArray = new Uint8Array(32);
		this.description = this.description.slice(0, 31); // last byte is null

		for (let i = 0; i < this.description.length; i++) {
			newArray[i] = this.description.charCodeAt(i);
		}

		return newArray;
	}

	function saveEra() {
		const tileset = this.tileset == SWAMP ? WASTELAND : this.tileset;
		return convertNum(tileset, WORD);
	}

	function saveErax() {
		return this.tileset == SWAMP ? convertNum(this.tileset, WORD) : null;
	}

	function saveUnit() {
		const newArray = new Uint8Array(QWORD * this.unitMap.length);
		let pos = 0;

		for (const unit of this.unitMap) {
			const x = convertNum(unit.x, WORD);
			const y = convertNum(unit.y, WORD);
			const property = convertNum(unit.property, WORD);

			newArray[pos]     = x[0];
			newArray[pos + 1] = x[1];
			newArray[pos + 2] = y[0];
			newArray[pos + 3] = y[1];
			newArray[pos + 4] = unit.id;
			newArray[pos + 5] = unit.owner;
			newArray[pos + 6] = property[0];
			newArray[pos + 7] = property[1];

			pos += QWORD;
		}

		return newArray;
	}
};

Pud.prototype.newFile = function(tileset, size) {
	this.filename = DEFAULT_FILE_NAME;
	this.isValid = true;

	this.id = new Uint8Array(DWORD).map(function() {
		return Math.floor(Math.random() * 256); // generates random ID
	});
	this.version = STANDARD;
	this.certificate = 0;
	this.description = "";
	this.width = size;
	this.height = size;
	this.tileset = tileset;
	this.useAlow = false;

	this.races = new Uint8Array(SLOTS).fill().map(function(race, i) {
		return i == NEUTRAL_PLAYER ? NEUTRAL_RACE : HUMAN_RACE;
	});
	this.controller = new Uint8Array(SLOTS).fill().map(function(controller, i) {
		return i == NEUTRAL_PLAYER ? PASSIVE_COMPUTER : HUMAN;
	});
	this.ai = new Uint8Array(SLOTS).fill(0x00);

	this.startGold = Array(SLOTS).fill(STARTING_RESOURCE);
	this.startLumber = Array(SLOTS).fill(STARTING_RESOURCE);
	this.startOil = Array(SLOTS).fill(STARTING_RESOURCE);

	const area = size * size;
	this.tileMap = Array(area).fill().map(function() {
		return LIGHT_GRASS + Math.floor(Math.random() * 3);
	});
	this.movementMap = Array(area).fill(0x0001);
	this.actionMap = Array(area).fill(0x4000);
	this.oilMap = Array(area).fill(0);
	this.unitMap = [];

	this.units = window.structuredClone(defaults.units);
	this.upgrades = window.structuredClone(defaults.upgrades);
	this.restrictions = window.structuredClone(defaults.restrictions);
};

Pud.prototype.openFile = function(buffer) {
	const sections = new Map();
	let pos = 0;

	while (pos < buffer.byteLength) {
		try {
			const key = this.hexToStr(new Uint8Array(buffer, pos, DWORD));
			const len = new DataView(buffer, pos + 4, DWORD).getInt32(0, true);

			sections.set(key, new Uint8Array(buffer, pos + 8, len));
			pos += len + 8;
		} catch (error) {
			console.error("Invalid file format.");
			break;
		}
	}

	return sections;
};

Pud.prototype.createFile = function(sections) {
	let length = 0;

	for (const [key, contents] of sections) {
		if (contents == undefined) {
			continue;
		}

		length += QWORD + contents.length;
	}

	const file = new Uint8Array(length);
	let pos = 0;

	for (const [key, contents] of sections) {
		if (contents == undefined) {
			continue;
		}

		for (let i = 0; i < key.length; i++, pos++) { // section name
			file[pos] = key.charCodeAt(i);
		}

		for (let i = 0; i < DWORD; i++, pos++) { // section length
			file[pos] = (contents.length & (0xff << i * 8)) >> i * 8;
		}

		for (let i = 0; i < contents.length; i++, pos++) {
			file[pos] = contents[i];
		}
	}

	return new Blob([file], {type: MIME_TYPE});
};

Pud.prototype.validateAfterLoad = function() {
	this.isValid &= this.version == STANDARD || this.version == EXPANSION;
	this.isValid &= this.tileset <= 0xff;

	const area = this.width * this.height;
	this.isValid &= this.tileMap.length == area;
	this.isValid &= this.movementMap.length == area;

	this.tileset = this.tileset > SWAMP ? FOREST : this.tileset;

	this.controller = this.controller.map(function(controller) {
		if (controller > 0xff) {
			this.isValid = false;
		}

		if (controller == 0x01) { // computer
			return COMPUTER;
		}

		if (controller == 0x03) { // nobody
			return HUMAN;
		}

		if (controller >= 0x08) { // passive computer
			return 0x00;
		}

		return controller;
	}, this);

	this.races = this.races.map(function(race) {
		return Math.min(race, NEUTRAL_RACE); // neutral
	});

	this.ai = this.ai.map(function(ai) {
		return Math.min(ai, 0x52);
	});

	this.useAlow = Object.keys(this.restrictions).length > 0;

	if (!this.useAlow) { // copies default restriction data if no ALOW section
		this.restrictions = window.structuredClone(defaults.restrictions);
	}
};

Pud.prototype.validateBeforeSave = function() {
	if (this.unitMap.length == 0) {
		throw "The map is empty. Place one or more units.";
	}

	const players = new Set();
	const start = Array(this.controller.length).fill();

	// determines active players (i.e., players with units placed)
	for (const unit of this.unitMap) {
		players.add(unit.owner);

		// requires start locations for active players
		if (unit.id == HUMAN_START_LOC || unit.id == ORC_START_LOC) {
			start[unit.owner] = true;
		}
	}

	for (const player of players) {
		if (player != NEUTRAL_PLAYER && start[player] == undefined) {
			throw `Must place a start location for player ${player + 1}.`;
		}
	}

	this.controller = this.controller.map(function(controller, i) {
		if (i == NEUTRAL_PLAYER) { // neutral player is always passive computer
			controller = PASSIVE_COMPUTER;
		} else {
			if (players.has(i)) {
				if (controller == NOBODY) {
					// sets nobody to human if player has units
					controller = HUMAN;
				}
			} else { // sets inactive players to nobody
				controller = NOBODY;
			}
		}

		return controller;
	});
};

// converts hex to ASCII
Pud.prototype.hexToStr = function(originalArray) {
	return originalArray.reduce(function(str, hex) {
		return str + String.fromCharCode(hex);
	}, "");
};

/*
 * Files prototype
 */

function Files(id) {
	this.id = id;
	this.dirs = [];
}

Files.prototype.browse = function() {
	let path = this.dirs.join("/");

	if (this.dirs.length > 0) {
		path += "/";
	}

	return new Promise(function(resolve, reject) {
		const xhr = new XMLHttpRequest();
		xhr.addEventListener("readystatechange", function() {
			if (this.readyState == 4) {
				if (this.status == 200) {
					resolve(this.response);
				} else {
					reject("Could not open the file browser.");
				}
			}
		});
		xhr.open("GET", MAPS_DIR + "/" + path + "index.json", true);
		xhr.responseType = "json";
		xhr.send();
	}).then(function({dirs, files}) {
		const ul = document.createElement("ul");
		ul.id = this.id;

		if (this.dirs.length > 0) { // except root directory
			ul.appendChild(createDir("..", "parent"));
		}

		for (const dir of dirs) {
			ul.appendChild(createDir(dir, "dir"));
		}

		for (const file of files) {
			ul.appendChild(createFile(file));
		}

		$("#" + this.id).replaceWith(ul);
	}.bind(this)).catch(properties.displayError.bind(properties));

	function createDir(file, className) {
		const li = document.createElement("li");

		const button = document.createElement("button");
		button.value = MAPS_DIR + "/" + path + file;
		button.textContent = "[" + file + "]";
		button.classList.add(className);
		li.appendChild(button);

		return li;
	}

	function createFile(file) {
		const li = document.createElement("li");

		const a = document.createElement("a");
		a.href = "?map=" + path + file;
		a.textContent = file;
		a.classList.add("pud");
		li.appendChild(a);

		return li;
	}
};

Files.prototype.browseParent = function() {
	this.dirs.pop();
	this.browse();
};

Files.prototype.browseDir = function(href) {
	this.dirs.push(window.decodeURIComponent(href.split("/").pop()));
	this.browse();
};

Files.prototype.openFile = function(path) {
	this.dirs = path.split("/").slice(0, -1);

	return new Promise(function(resolve, reject) {
		const xhr = new XMLHttpRequest();
		xhr.addEventListener("readystatechange", function() {
			if (this.readyState == 4) {
				if (this.status == 200) {
					resolve({path, buffer: this.response});
				} else {
					reject("Could not open the specified file.");
				}
			}
		});
		xhr.open("GET", MAPS_DIR + "/" + path, true);
		xhr.responseType = "arraybuffer";
		xhr.send();
	}).then(function({path, buffer}) {
		const dirs = path.split("/");
		const pud = new Pud();
		pud.load(dirs.pop(), buffer);

		editor.open(path, pud);
	}).catch(properties.displayError.bind(properties));
};

Files.prototype.openTemplate = function(tileset, size) {
	const pud = new Pud();
	pud.newFile(tileset, size);

	editor.open("", pud);

	this.removeQueryString();
};

Files.prototype.openUploadedFile = function(event) {
	const file = event.target.files[0];

	if (file != null) {
		const reader = new FileReader();
		reader.addEventListener("load", function(event) {
			const path = file.name;
			const pud = new Pud();
			pud.load(path, event.target.result);

			editor.open(path, pud);
			properties.hide("browser");

			this.removeQueryString();
		}.bind(this));
		reader.readAsArrayBuffer(file);
	}
};

Files.prototype.openStartingMap = function() {
	const map = new URL(window.location.href).searchParams.get("map");

	if (map == undefined || map == "") {
		this.openTemplate(DEFAULT_TILESET, DEFAULT_SIZE);
	} else { // loads map specified in optional URL parameter
		this.openFile(map);
	}
};

Files.prototype.removeQueryString = function() {
	const url = new URL(window.location.href);

	if (url.searchParams.get("map") != undefined) {
		window.history.pushState({}, document.title, url.pathname);
	}
};

/*
 * Storage prototype
 */

function Storage(name) {
	this.name = name;
}

Storage.prototype.load = function() {
	try {
		const contents = localStorage.getItem(this.name);

		if (contents != null) {
			return JSON.parse(contents);
		}
	} catch (err) {
		console.error(err);
		this.reset();
	}

	return {};
};

Storage.prototype.save = function(settings) {
	try {
		if (settings != undefined) {
			localStorage.setItem(this.name, JSON.stringify(settings));
		} else {
			this.reset();
		}
	} catch (err) {
		console.error(err);
	}
};

Storage.prototype.reset = function() {
	try {
		localStorage.removeItem(this.name);
	} catch (err) {
		console.error(err);
	}
};