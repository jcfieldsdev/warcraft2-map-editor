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

// file format
const FILE_SIGNATURE = "WAR2 MAP\x00\x00\x0a\xff";
const STANDARD  = 0x11;
const EXPANSION = 0x13;
const MIME_TYPE = "application/x-warcraft2-scenario";

// editor
const MAPS_DIR        = "maps";
const DEFAULT_PALETTE = "units";
const DEFAULT_TILESET = "forest";
const DEFAULT_SIZE    = 128;
const MINIMAP_SIZE    = 200;
const LEFT_MARGIN     = 270;
const FRAME_COLOR     = "#fff";
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
const NEUTRAL        = 15;
const TILE_SIZE      = 32;
const MINI_TILE_SIZE = 8;
const MAX_WIDTH      = 128;
const MAX_HEIGHT     = 128;
const DEFAULT_GOLD   = 6; // x2500
const DEFAULT_OIL    = 2; // x2500
const RESOURCE_DISTANCE = 3; // distance between gold mines/town halls
const LAST_ICON      = 195;

// tilesets
const FOREST    = 0;
const WINTER    = 1;
const WASTELAND = 2;
const SWAMP     = 3;

// units
const HUMAN_START_LOC = 94;
const ORC_START_LOC   = 95;

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
const OIL_DEPOT      = 24;

// terrain
const PLAIN = 0, FILLER = 1, RANDOM = 2;
const INSPECT     = 0x0000;
const LIGHT_WATER = 0x0010, DARK_WATER = 0x0020;
const LIGHT_DIRT  = 0x0030, DARK_DIRT  = 0x0040;
const LIGHT_GRASS = 0x0050, DARK_GRASS = 0x0060;
const TREES       = 0x0070, ROCKS      = 0x0080;
const HUMAN_WALL  = 0x0090, ORC_WALL   = 0x00a0;
const HUMAN_IWALL = 0x00b0, ORC_IWALL  = 0x00c0;

// map certificates
const BLIZZARD = 1, LADDER = 2;

// objects
const editor   = new Editor();
const overlays = new Overlays();
const files    = new Files("files");

/*
 * initialization
 */

window.addEventListener("load", function() {
	const query = window.location.search.replace(/\?map=(.*)/, "$1");

	if (query == "") {
		files.loadTemplate(DEFAULT_TILESET, DEFAULT_SIZE);
	} else { // loads map specified in optional URL parameter
		const dirs = query.split("/");

		files.dirs = dirs;
		files.load(
			window.decodeURIComponent(dirs.pop()),
			editor.open.bind(editor)
		);
	}

	window.addEventListener("keyup", function(event) {
		const keyCode = event.keyCode;

		if (keyCode == 13) { // Enter
			if (Object.keys(editor.selected).length > 0) {
				overlays.openProperties("unitMap");
			}
		}

		if (keyCode == 27) { // Esc
			if (overlays.active) {
				overlays.closeAll();
			} else {
				$("#inspect").click();
			}
		}

		if (keyCode == 46) { // Del
			editor.removeSelected();
		}

		if (keyCode >= 48 && keyCode <= 56) { // 0-8
			editor.selectPlayer(keyCode == 48 ? NEUTRAL : keyCode - 49);
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

		if (element.closest("#link")) {
			if (editor.path != "") {
				const link = window.location.href.split("?")[0];

				$("#text_link").value = link + "?map=" + editor.path;
				overlays.show("link");
			}
		}

		if (element.closest("#about")) {
			overlays.show("about");
		}

		if (element.matches("#filename")) {
			overlays.openProperties("map");
		}

		if (element.closest("#inspect")) {
			editor.clearSelect();
		}

		if (element.closest("#copy")) {
			$("#" + element.closest("#copy").value).select();
			document.execCommand("copy");
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
			overlays.openProperties(element.value);
		}

		// overlay save buttons
		if (element.closest(".save")) {
			overlays.saveProperties(element.closest(".save").value);
		}

		// overlay close buttons
		if (element.closest(".close")) {
			overlays.hide(element.closest(".close").value);
		}

		// property sheet "Use default values" buttons
		if (element.matches(".defaults")) {
			$("#select_" + element.value).disabled = element.checked;
		}

		// property sheet "Revert" buttons
		if (element.matches(".revert")) {
			overlays.revertProperties(element.value);
		}

		// property sheet "Reset to Defaults" buttons
		if (element.matches(".reset")) {
			overlays.resetProperties(element.value);
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
			editor.mode = PLACE_UNIT;
			editor.unit = Number(element.closest(".unit").value);
		}

		// file browser parent directory
		if (element.matches(".parent")) {
			event.preventDefault();
			files.openParent();
		}

		// file browser directory
		if (element.matches(".dir")) {
			event.preventDefault();
			files.openDir(element.href);
		}

		// file browser map file
		if (element.matches(".pud")) {
			event.preventDefault();
			overlays.hide("browser");
			files.openFile(element.href);
		}

		// restrictions table column
		if (element.matches(".restcol")) {
			const value = Number(element.value);

			for (const element of $$(".restrictions")) {
				const [type, index, player] = element.id.split("_");

				if (player == value) {
					element.checked = !element.checked;
				}
			}
		}

		// restrictions table row
		if (element.matches(".restrow")) {
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
			overlays.changeIcon(element, $("#icon"), $("#select_upgrades"));
		}

		if (element.matches("#range_property")) {
			overlays.changeResource();
		}

		if (element.matches(".fill")) {
			const key = element.id.replace("select_", "");

			if (key != "restrictions") {
				const select = $("#select_" + key);
				const option = select.options[select.selectedIndex];
				$("#legend_" + key).textContent = option.label;
			}

			overlays.saveWorking(key);
			overlays.fillProperties(key);
		}
	});
	document.addEventListener("mousedown", function(event) {
		const element = event.target;

		if (element.matches("#frame")) {
			if (event.button == LEFT) {
				editor.dragFrame = true;
			}
		}

		if (element.matches("#select")) {
			if (event.button == LEFT) {
				if (editor.mode == SELECT_UNITS) {
					editor.startSelect(event.clientX, event.clientY);
				} else if (editor.mode == PLACE_UNIT) {
					editor.addUnit(event.clientX, event.clientY);
				} else if (editor.mode == PAINT_TERRAIN) {
					editor.startTerrain(event.clientX, event.clientY);
				}
			}
		}
	});
	document.addEventListener("mouseup", function(event) {
		const element = event.target;

		if (element.matches("#frame")) {
			if (event.button == LEFT) {
				editor.dragFrame = false;
				editor.moveMap(event.clientX, event.clientY);
			}
		}

		if (element.matches("#select")) {
			if (event.button == LEFT) {
				if (editor.mode == DRAG_SELECT) {
					editor.selectUnits(
						event.clientX, event.clientY,
						event.shiftKey
					);
				} else if (editor.mode == DRAG_TERRAIN) {
					editor.mode = PAINT_TERRAIN;
					editor.paintTerrain(event.clientX, event.clientY);
				}
			} else if (event.button == RIGHT) {
				if (editor.mode == SELECT_UNITS) {
					if (Object.keys(editor.selected).length > 0) {
						overlays.openProperties("unitMap");
					}
				} else if (
					editor.mode == PLACE_UNIT
					|| editor.mode == PAINT_TERRAIN
				) {
					$("#inspect").click();
				}
			}
		}
	});
	document.addEventListener("mousemove", function(event) {
		const element = event.target;

		if (element.matches("#frame")) {
			if (editor.dragFrame) {
				editor.moveMap(event.clientX, event.clientY);
			}
		}

		if (element.matches("#select")) {
			if (editor.mode == DRAG_SELECT) {
				editor.drawSelect(event.clientX, event.clientY);
			} else if (editor.mode == PLACE_UNIT) {
				editor.drawUnitBrush(event.clientX, event.clientY);
			} else if (editor.mode == PAINT_TERRAIN) {
				editor.drawTerrainBrush(event.clientX, event.clientY);
			} else if (editor.mode == DRAG_TERRAIN) {
				editor.paintTerrain(event.clientX, event.clientY);
			}

			if ($("#info").open) {
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

	// for overlay widgets
	$("#file").addEventListener("change", function(event) {
		const file = event.target.files[0];

		if (file != null) {
			const reader = new FileReader();
			reader.addEventListener("load", function(event) {
				editor.open(file.name, "", event.target.result);
				overlays.hide("browser");
			});
			reader.readAsArrayBuffer(file);
		}
	});

	function create() {
		overlays.openProperties("create");
	}

	function open() {
		files.browse();
		overlays.show("browser");
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
		} catch (err) {
			return overlays.displayError(err);
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

Editor.prototype.open = function(filename, path, buffer) {
	window.scrollTo(0, 0);

	if (buffer == null) {
		return overlays.displayError("The map file does not exist.");
	}

	this.pud = new Pud();
	this.pud.load(filename, buffer);

	if (!this.pud.valid) {
		return overlays.displayError("The map file is corrupted or invalid.");
	}

	this.path = path;

	// disables "Link to Map" button if user map is loaded
	$("#link").disabled = !Boolean(path);

	$("#filename").textContent = this.pud.filename;

	$("#text_filename").classList.toggle(
		"blizzard", this.pud.certificate == BLIZZARD
	);
	$("#text_filename").classList.toggle(
		"ladder", this.pud.certificate == LADDER
	);

	const width = this.pud.width * TILE_SIZE;
	const height = this.pud.height * TILE_SIZE;

	setSize("tileMap",     width,        height);
	setSize("unitMap",     width,        height);
	setSize("movementMap", width,        height);
	setSize("select",      width,        height);
	setSize("miniUnitMap", MINIMAP_SIZE, MINIMAP_SIZE);
	setSize("miniTileMap", MINIMAP_SIZE, MINIMAP_SIZE);
	setSize("frame",       MINIMAP_SIZE, MINIMAP_SIZE);

	this.tileMap = $("#tileMap").getContext("2d");
	this.unitMap = $("#unitMap").getContext("2d");
	this.movementMap = $("#movementMap").getContext("2d");
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

	this.selectPlayer(this.player);

	if (this.palette == "") {
		this.selectPalette(DEFAULT_PALETTE);
	}

	for (const unit of this.pud.unitMap) {
		// tracks unit positions so they persist when units are redrawn
		unit.position = undefined;

		// tracks points occupied by unit for collision detection
		const unitSize = this.pud.units.unitSize[unit.id];
		unit.points = this.computePoints(
			unit.x, unit.y,
			unitSize.x, unitSize.y
		);
	}

	// draws tile map and unit map, changes unit icons to match tileset
	this.changeTileset(this.pud.tileset);

	this.drawMovementMap();

	function setSize(id, w, h) {
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

	const self = this;
	const bottomPromises = [], top = [];

	// sorts units by stacking priority
	for (const [i, unit] of this.pud.unitMap.entries()) {
		if (
			unit.id == HUMAN_START_LOC || unit.id == ORC_START_LOC
			|| this.pud.units.flags[unit.id][AIR_UNIT]
		) {
			top.push(i);
		} else {
			bottomPromises.push(makePromise(i));
		}
	}

	Promise.all(bottomPromises).then(function() {
		// draws flying units and start locations after other units
		const topPromises = top.map(makePromise);

		// draws units after all images have loaded
		Promise.all(topPromises).then(function() {
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

	function makePromise(i) {
		return new Promise(function(resolve) {
			drawUnit(resolve, i);
		});
	}

	function drawUnit(resolve, i) {
		const unit = self.pud.unitMap[i];
		let unitSize = 1;

		if (unit.id in self.pud.units.unitSize) {
			unitSize = self.pud.units.unitSize[unit.id];
		} else {
			console.error("Missing unit size for unit:", unit.id);
		}

		const path = "units/" + data.tilesets[self.pud.tileset] + "/";

		const img = new Image();
		img.src = path + unit.id.toString().padStart(4, "0") + ".png";
		img.addEventListener("load", function() {
			const x = unit.x * TILE_SIZE;
			const y = unit.y * TILE_SIZE;

			const w = unitSize.x * TILE_SIZE;
			const h = unitSize.y * TILE_SIZE;

			drawToUnitMap(x, y, w, h, i, unit, img);
			drawToMiniMap(x, y, w, h, unit);

			resolve();
		});

		return img;
	}

	function drawToUnitMap(x, y, w, h, i, unit, img) {
		const owner = Math.min(unit.owner, 7);
		const startLocation = unit.id == HUMAN_START_LOC
			|| unit.id == ORC_START_LOC;
		let sx = 0, sy = 0;

		if (!startLocation && !self.pud.units.flags[unit.id][BUILDING]) {
			// centers unit in tile
			x -= (img.width - w) / 2;
			y -= (img.width - h) / 2;

			w = img.width;
			h = w;

			if (self.pud.unitMap[i].position == undefined) {
				// picks random idle frame
				sy = h * Math.floor(Math.random() * 5);
				self.pud.unitMap[i].position = sy;
			} else {
				sy = self.pud.unitMap[i].position;
			}
		}

		self.unitBuffer.drawImage(img, sx, sy, w, h, x, y, w, h);

		if (owner == 0) { // artwork is already in player 1 colors by default
			return;
		}

		const imageData = self.unitBuffer.getImageData(x, y, w, h);

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

		self.unitBuffer.putImageData(imageData, x, y);
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

		self.miniUnitBuffer.fillStyle = "#" + r + g + b;
		self.miniUnitBuffer.fillRect(x, y, w, h);
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

Editor.prototype.moveMap = function(x, y) {
	x -= this.pos.left;
	y -= this.pos.top;

	window.scroll(
		x / this.scaleX - window.innerWidth / 2 - LEFT_MARGIN,
		y / this.scaleY - window.innerHeight
	);
};

Editor.prototype.updateCoords = function() {
	this.x = this.scaleX * window.scrollX;
	this.y = this.scaleY * window.scrollY;
};

Editor.prototype.drawFrame = function() {
	this.frame.clearRect(0, 0, $("#frame").width, $("#frame").height);
	this.frame.lineWidth = 2;
	this.frame.strokeStyle = FRAME_COLOR;
	this.frame.strokeRect(
		this.x, this.y,
		this.scaleX * (window.innerWidth - LEFT_MARGIN),
		this.scaleY * window.innerHeight
	);
};

Editor.prototype.clearSelect = function() {
	this.select.clearRect(0, 0, $("#select").width, $("#select").height);
};

Editor.prototype.startSelect = function(x, y) {
	this.mode = DRAG_SELECT;
	this.selectX = window.scrollX + x - LEFT_MARGIN;
	this.selectY = window.scrollY + y;
};

Editor.prototype.startTerrain = function(x, y) {
	[x, y] = this.findNearestTile(x, y, this.size, this.size);

	this.mode = DRAG_TERRAIN;
	this.terrainX = x;
	this.terrainY = y;
};

Editor.prototype.drawSelect = function(x, y) {
	this.selectMultiple = true;

	const w = window.scrollX + x - this.selectX - LEFT_MARGIN;
	const h = window.scrollY + y - this.selectY;

	this.clearSelect();
	this.select.lineWidth = 1;
	this.select.strokeStyle = SELECT_COLOR;
	this.select.strokeRect(this.selectX, this.selectY, w, h);
};

Editor.prototype.selectUnits = function(x, y, add=false) {
	this.mode = SELECT_UNITS;

	if (!add) {
		this.selected = {};

		this.clearSelect();
		this.select.lineWidth = 1;
		this.select.strokeStyle = SELECT_COLOR;
	}

	let points = [];

	[x, y] = this.findNearestTile(x, y);

	if (this.selectMultiple) {
		const mx = Math.floor(this.selectX / TILE_SIZE);
		const my = Math.floor(this.selectY / TILE_SIZE);

		const w = Math.abs(mx - x);
		const h = Math.abs(my - y);

		if (w > 0 && h > 0) {
			points = this.computePoints(Math.min(mx, x), Math.min(my, y), w, h);
		} else {
			// treats box select as single-unit click if smaller than tile size;
			// prevents annoying misclicks
			this.selectMultiple = false;
		}
	}

	for (const [i, unit] of this.pud.unitMap.entries()) {
		if (this.pud.units.unitSize[unit.id] == undefined) {
			continue;
		}

		const unitSize = this.pud.units.unitSize[unit.id];
		let intersect = false;

		if (this.selectMultiple) {
			for (const point of this.pud.unitMap[i].points) {
				if (points.includes(point)) {
					intersect = true;
					break;
				}
			}
		} else {
			const point = x + this.pud.width * y;
			intersect = this.pud.unitMap[i].points.includes(point);
		}

		if (intersect && (!add || this.selected[i] == undefined)) {
			this.select.strokeRect(
				unit.x * TILE_SIZE, unit.y * TILE_SIZE,
				unitSize.x * TILE_SIZE, unitSize.y * TILE_SIZE
			);

			this.selected[i] = unit;
		}
	}

	this.selectMultiple = false;
};

Editor.prototype.drawUnitBrush = function(x, y) {
	const unitSize = this.pud.units.unitSize[this.unit];
	[x, y] = this.findNearestTile(x, y, unitSize.x, unitSize.y);

	const valid = this.validateArea(x, y);

	this.clearSelect();
	this.select.lineWidth = 1;
	this.select.strokeStyle = valid ? PLACE_VALID_COLOR : PLACE_ERROR_COLOR;
	this.select.strokeRect(
		x * TILE_SIZE, y * TILE_SIZE,
		TILE_SIZE * unitSize.x, TILE_SIZE * unitSize.y
	);
};

Editor.prototype.drawTerrainBrush = function(x, y) {
	[x, y] = this.findNearestTile(x, y, this.size, this.size);

	this.clearSelect();
	this.select.lineWidth = 1;
	this.select.strokeStyle = PLACE_VALID_COLOR;
	this.select.strokeRect(
		x * TILE_SIZE, y * TILE_SIZE,
		TILE_SIZE * this.size, TILE_SIZE * this.size
	);
};

Editor.prototype.addUnit = function(x, y) {
	const unitSize = this.pud.units.unitSize[this.unit];
	[x, y] = this.findNearestTile(x, y, unitSize.x, unitSize.y);

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

	const CRITTER = 57, GOLD_MINE = 92, OIL_PATCH = 93;
	const CIRCLE_OF_POWER = 100, DARK_PORTAL = 101, RUNESTONE = 102;

	// places certain units and buildings as neutral player regardless of
	// selected player (but can reassign ownership in selection properties)
	if (
		id == CRITTER || id == GOLD_MINE || id == OIL_PATCH
		|| id == CIRCLE_OF_POWER || id == DARK_PORTAL || id == RUNESTONE
	) {
		owner = NEUTRAL;
	}

	// removes existing start location if new one is placed
	if (id == HUMAN_START_LOC || id == ORC_START_LOC) {
		for (const [i, unit] of this.pud.unitMap.entries()) {
			const startLocation = unit.id == HUMAN_START_LOC
				|| unit.id == ORC_START_LOC;

			if (startLocation && unit.owner == this.player) {
				this.removeUnit(i);
			}
		}
	}

	this.pud.unitMap.push({
		x,
		y,
		id,
		owner,
		property,
		position: undefined,
		points: this.computePoints(x, y, unitSize.x, unitSize.y)
	});
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

Editor.prototype.paintTerrain = function(x, y) {
	const self = this;
	let tile = this.tile;

	this.drawTerrainBrush(x, y);
	[x, y] = this.findNearestTile(x, y, this.size, this.size);

	if (tile >= LIGHT_WATER && tile < TREES) {
		tile += this.brightness; // adds 0x0010 for dark version of tile
	}

	let changes = [];

	// boundary tiles
	let tl = getTileType(x - 1,         y - 1);
	let tr = getTileType(x + this.size, y - 1);
	let bl = getTileType(x - 1,         y + this.size);
	let br = getTileType(x + this.size, y + this.size);

	let index = x + y * this.pud.width;
	let type = this.tile & 0xf0;

	if (type == tl && type == tr && type == bl && type == br) { // solid tile
		tile = type;
	} else { // boundary tile
		type = this.tile & 0xf;

		const TILE_NONE         = 0;
		const TILE_TREES        = 1;
		const TILE_GRASS_LIGHT  = 2;
		const TILE_GROUND_LIGHT = 3;
		const TILE_WATER_LIGHT  = 4;
		const TILE_WATER_DARK   = 5;
		const TILE_GRASS_DARK   = 6;
		const TILE_GROUND_DARK  = 7;
		const TILE_ROCKS        = 8;
		const TILE_HUMAN_WALL   = 9;
		const TILE_ORC_WALL     = 10;

		if (tileHas(TILE_GRASS_LIGHT)) {
			if (tileHas(TILE_TREES)) {
				tile = 0x0700 | getMask(TILE_TREES);
			} else if (tileHas(TILE_GRASS_DARK)) {
				tile = 0x0600 | getMask(TILE_GRASS_DARK);
			} else if (tileHas(TILE_GROUND_LIGHT)) {
				tile = 0x0500 | getMask(TILE_GROUND_LIGHT);
			} else {
				let hex = self.formatHex(index);
				console.error(`Invalid disposition: ${hex} at (${x}, ${y})`);
			}
		} else if (tileHas(TILE_GROUND_LIGHT)) {
			if (tileHas(TILE_GROUND_DARK)) {
				tile = 0x0300 | getMask(TILE_GROUND_DARK);
			} else if (tileHas(TILE_ROCKS)) {
				tile = 0x0400 | getMask(TILE_ROCKS);
			} else if (tileHas(TILE_WATER_LIGHT)) {
				tile = 0x0200 | getMask(TILE_WATER_LIGHT);
			} else {
				let hex = self.formatHex(index);
				console.error(`Invalid disposition: ${hex} at (${x}, ${y})`);
			}
		} else if (tileHas(TILE_WATER_LIGHT)) {
			if (tileHas(TILE_WATER_DARK)) {
				tile = 0x0100 | getMask(TILE_WATER_DARK);
			}
		} else if (tileHas(TILE_ORC_WALL)) {
			tile = 0x0900 | getWallMask();
		} else if (tileHas(HUMAN_WALL)) {
			tile = 0x0800 | getWallMask();
		} else {
			let hex = self.formatHex(index);
			console.error(`Invalid disposition: ${hex} at (${x}, ${y})`);
		}
	}

	tile += Math.floor(Math.random() * 3);
	changeTile(index, tile);

	for (let change of changes) {
		drawTile(change.point, change.index);
	}

	function getTileType(x, y) {
		if (x >= 0 && x < self.pud.width && y >= 0 && y < self.pud.height) {
			return self.pud.tileMap[x + y * self.pud.width] & 0xf0;
		}
	}

	function tileHas(type) {
		return tl == type || tr == type
			|| bl == type || br == type;
	}

	function getMask(type) {
		let mask = 0;
		let ref = tl;

		if (tl == ref) {
			mask |= 0x0001;
		}

		if (tr == ref) {
			mask |= 0x0002;
		}

		if (bl == ref) {
			mask |= 0x0004;
		}

		if (br == ref) {
			mask |= 0x008;
		}

		if (ref != type) {
			mask = ~mask & 0x000f;
		}

		return (mask - 0x0001) << 4;
	}

	function getWallMask() {
		let mask = 0xffff;
	}

	function computeBoundary(x, y, size) {
		let points = [];

		// corners
		points.push({x: x - 1,    y: y - 1});    // top-left
		points.push({x: x + size, y: y - 1});    // top-right
		points.push({x: x - 1,    y: y + size}); // bottom-left
		points.push({x: x + size, y: y + size}); // bottom-right

		for (let i = 0; i < size; i++) {
			points.push({x: x + i,    y: y - 1});    // top
			points.push({x: x + i,    y: y + size}); // bottom
			points.push({x: x - 1,    y: y + i});    // left
			points.push({x: x + size, y: y + i});    // right
		}

		return points.filter(function(point) {
			return point.x >= 0 && point.x < self.pud.width
				&& point.y >= 0 && point.y < self.pud.height;
		}).map(function(point) {
			return point.x + point.y * self.pud.width;
		}).sort(function(a, b) {
			return a - b;
		});
	}

	function changeTile(point, index) {
		changes.push({point, index});
		self.pud.tileMap[point] = index;
	}

	function drawTile(point, index) {
		if (index in data.tiles[self.pud.tileset]) {
			let tile = data.tiles[self.pud.tileset][index];
			let cx = point % self.pud.width * TILE_SIZE;
			let cy = Math.floor(point / self.pud.height) * TILE_SIZE;

			self.tileMap.drawImage(
				self.tiles,
				tile.x, tile.y,
				TILE_SIZE, TILE_SIZE,
				cx, cy,
				TILE_SIZE, TILE_SIZE
			);
			self.miniTileMap.drawImage(
				self.tiles,
				tile.x, tile.y,
				MINI_TILE_SIZE, MINI_TILE_SIZE,
				cx, cy,
				TILE_SIZE, TILE_SIZE
			);
		} else {
			let hex = self.formatHex(index);
			console.error(`Missing terrain tile: ${hex} at (${x}, ${y})`);
		}
	}
};

Editor.prototype.computePoints = function(x, y, ux, uy) {
	const points = [];

	for (let i = 0; i < uy; i++) {
		for (let j = 0; j < ux; j++) {
			points.push(x + j + this.pud.width * (y + i));
		}
	}

	return points;
};

Editor.prototype.findNearestTile = function(x, y, w=0, h=0) {
	x += window.scrollX;
	y += window.scrollY;

	x = Math.max(Math.floor((x - LEFT_MARGIN) / TILE_SIZE), 0);
	y = Math.max(Math.floor(y / TILE_SIZE), 0);

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
		|| this.unit == ORC_START_LOC;
	let valid = true;

	if (startLocation && this.player == NEUTRAL) {
		return; // cannot place start location for neutral player
	}

	const unitSize = this.pud.units.unitSize[this.unit];
	const points = this.computePoints(x, y, unitSize.x, unitSize.y);

	const LAND = 0o1, AIR = 0o2, SEA = 0o4;
	const flags = this.pud.units.flags[this.unit];
	const unitType = getUnitType(flags);

	const resourceArea = [];

	if (
		flags[GOLD_SOURCE] || flags[GOLD_DEPOT]
		|| flags[OIL_SOURCE] || flags[OIL_PLATFORM] || flags[OIL_DEPOT]
	) { // determines exclusion area around resource sources and return points
		const start = points[0] - RESOURCE_DISTANCE
			- this.pud.width * RESOURCE_DISTANCE;
		const row = 2 * RESOURCE_DISTANCE + unitSize.x;
		const col = 2 * RESOURCE_DISTANCE + unitSize.y;

		for (let i = 0; i < col; i++) {
			for (let j = 0; j < row; j++) {
				const coord = start + j + i * this.pud.width;

				// ignores negative values from placing building on top or left
				// edges of map
				if (coord < 0) {
					continue;
				}

				// computes distance from building to calculated point to omit
				// "wraparound" values from placing building on right or bottom
				// edges of map
				const h = Math.abs(x - coord % this.pud.width);
				const v = Math.abs(y - Math.floor(coord / this.pud.height));

				if (
					h > RESOURCE_DISTANCE + unitSize.x
					|| v > RESOURCE_DISTANCE + unitSize.y
				) {
					continue;
				}

				resourceArea.push(coord);
			}
		}
	}

	// checks if area contains other units
	for (const [i, unit] of this.pud.unitMap.entries()) {
		const unitStartLocation = unit.id == HUMAN_START_LOC
			|| unit.id == ORC_START_LOC;

		// start locations ignore collision with everything except
		// other start locations and neutral units
		if ((startLocation ^ unitStartLocation) && unit.owner != NEUTRAL) {
			continue;
		}

		const compareType = getUnitType(this.pud.units.flags[unit.id]);
		const compareFlags = this.pud.units.flags[unit.id];

		// allows air units over ground/sea units and buildings
		if (
			(flags[AIR_UNIT] ^ compareFlags[AIR_UNIT])
			&& ((unitType & (LAND | SEA) || flags[BUILDING])
				^ (compareType == LAND
				|| compareType == SEA
				|| compareFlags[BUILDING]))
		) {
			continue;
		}

		for (const point of this.pud.unitMap[i].points) {
			if (points.includes(point)) {
				valid = false;
				break;
			}

			if ( // enforces resource exclusion area
				(flags[GOLD_SOURCE] && compareFlags[GOLD_DEPOT])
				|| (flags[GOLD_DEPOT] && compareFlags[GOLD_SOURCE])
				|| ((flags[OIL_SOURCE] || flags[OIL_PLATFORM])
					&& compareFlags[OIL_DEPOT])
				|| (flags[OIL_DEPOT]
					&& (compareFlags[OIL_SOURCE] || compareFlags[OIL_PLATFORM]))
			) {
				if (resourceArea.includes(point)) {
					valid = false;
					break;
				}
			}
		}
	}

	let coastTiles = 0;

	// checks if unit is allowed on movement tile
	for (const point of points) {
		const special = this.pud.movementMap[point] & 0xff00;
		const tile    = this.pud.movementMap[point] & 0x00ff;

		if (special == 0x00) {
			if (flags[BUILDING]) { // buildings
				if (flags[SHORE_BUILDING]) {
					valid &= tile == 0x02 || tile == 0x82 || tile == 0x40;

					// counts coast tiles
					coastTiles += tile == 0x02 || tile == 0x82;
				} else if (flags[OIL_SOURCE] || flags[OIL_PLATFORM]) {
					valid &= tile == 0x00 || tile == 0x40;
				} else {
					valid &= tile == 0x00 || tile == 0x01;
				}
			} else { // units
				if (unitType & LAND || startLocation) {
					valid &= tile == 0x00 || tile == 0x01 || tile == 0x11;
				} else if (unitType & AIR) {
					valid &= true;
				} else if (unitType & SEA) {
					valid &= tile == 0x00 || tile == 0x40;
				}
			}
		} else if (special == 0x02) {
			if (unitType & AIR) {
				valid = false;
			}
		} else if (special == 0xff) {
			valid = false;
		}

		if (!valid) {
			break;
		}
	}

	if (flags[SHORE_BUILDING]) {
		// shore buildings must be on at least one coast tile
		valid &= coastTiles > 0;
	}

	return valid;

	function getUnitType(flags) {
		const type = flags[LAND_UNIT]
		           | flags[AIR_UNIT] << 1
		           | flags[SEA_UNIT] << 2;

		// treats as land if no flags set (special case for ballista/catapult)
		return type || LAND;
	}
};

Editor.prototype.updateTileInfo = function(x, y) {
	[x, y] = this.findNearestTile(x, y);

	$("#text_posX").value = x;
	$("#text_posY").value = y;

	const index = x + this.pud.width * y;
	$("#text_index").value = index;

	if (index <= this.pud.tileMap.length) {
		$("#text_terrainTile").value = this.formatHex(this.pud.tileMap[index]);
	}

	if (index <= this.pud.movementMap.length) {
		$("#text_moveTile").value = this.formatHex(this.pud.movementMap[index]);
	}

	if (index <= this.pud.actionMap.length) {
		$("#text_actionTile").value = this.formatHex(this.pud.actionMap[index]);
	}
};

Editor.prototype.selectPlayer = function(player) {
	for (const element of $$(".player")) {
		element.classList.toggle("current", element.value == player);
	}

	player = Number(player);

	let ownerChanged = 0;

	// does not reassign ownership of critters, gold mines, oil patches,
	// or start locations in box selections
	const OMIT_UNITS = [57, 92, 93, HUMAN_START_LOC, ORC_START_LOC];

	// reassigns owner of selected units
	for (const unit of Object.values(this.selected)) {
		if (OMIT_UNITS.includes(unit.id)) {
			continue;
		}

		// changes race of unit when owner is changed if necessary
		unit.id = this.convertUnit(unit.id, unit.owner, player);
		unit.owner = player;
		ownerChanged++;
	}

	const raceChanged = this.pud.races[this.player] != this.pud.races[player];

	if (ownerChanged || raceChanged) {
		// redraw units if owner or race changes
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
		this.pud.tileMap = this.pud.tileMap.map(function(tile) {
			switch (tile) {
				case 0x0015:
				case 0x0016:
				case 0x0017:
				case 0x0025:
				case 0x0026:
				case 0x0027:
					return tile - 0x0004;
				default:
					return tile;
			}
		});
	}

	if (tileset == SWAMP) {
		// remaps tiles that are unspecified for swamp tileset
		this.pud.tileMap = this.pud.tileMap.map(function(tile) {
			switch (tile) {
				case 0x003a:
				case 0x003b:
				case 0x004a:
				case 0x004b:
					return tile - 0x0005;
				default:
					return tile;
			}
		});
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

/*
 * Overlays prototype
 */

function Overlays() {
	// currently active overlay
	this.active = "";

	// property sheet working object
	this.working = {};
	this.index = "";
}

Overlays.prototype.show = function(id) {
	this.closeAll();
	this.active = id;
	$("#overlay_" + id).classList.add("open");

	editor.dragFrame = false;

	if (editor.mode != SELECT_UNITS) {
		editor.mode = SELECT_UNITS;
		editor.clearSelect();
	}
};

Overlays.prototype.hide = function(id) {
	this.active = "";
	this.working = {};
	this.index = "";
	$("#overlay_" + id).classList.remove("open");
};

Overlays.prototype.closeAll = function() {
	if (this.active) {
		this.hide(this.active);
	}
};

Overlays.prototype.displayError = function(message) {
	$("#overlay_error>p").textContent = message;
	this.show("error");
};

Overlays.prototype.openProperties = function(key) {
	const self = this;

	if (key == "create") {
		openCreate();
	} else if (key == "map") {
		openMap();
	} else if (key == "players") {
		openPlayers();
	} else if (key == "resources") {
		openResources();
	} else if (key == "units") {
		openUnits();
	} else if (key == "upgrades") {
		openUpgrades();
	} else if (key == "restrictions") {
		openRestrictions();
	} else if (key == "unitMap") {
		openSelection();
	}

	this.show(key);

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

		for (const group of Object.keys(data.units)) {
			for (const type of Object.keys(data.units[group])) {
				for (const race of Object.keys(data.units[group][type])) {
					if (units[race] == undefined) {
						units[race] = [];
					}

					const unit = data.units[group][type][race];

					if (unit.skip) {
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

		self.fillProperties("units");
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

		self.fillProperties("upgrades");
	}

	function openRestrictions() {
		$("#checkbox_restrictions").checked = !editor.pud.useAlow;
		$("#select_restrictions").disabled = !editor.pud.useAlow;

		self.fillProperties("restrictions");
	}

	function openSelection() {
		const select = $("#select_unitMap");
		const units = {};

		while (select.options.length > 0) { // removes old items from list
			select.remove(0);
		}

		for (const group of Object.keys(data.units)) {
			for (const id of Object.keys(data.units[group])) {
				for (const race of Object.keys(data.units[group][id])) {
					const unit = data.units[group][id][race];
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

		self.fillProperties("unitMap");
		self.changeResource();
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

Overlays.prototype.fillProperties = function(key) {
	if (editor.pud[key] == undefined) {
		return;
	}

	const self = this;

	if (key == "restrictions") {
		return fillRestrictionProperties();
	} else if (key == "unitMap") {
		return fillSelectionProperties();
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
			for (const property in value) {
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

	function fillRestrictionProperties() {
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
			button.classList.add("restcol", "player" + i);
			th.appendChild(button);
			tr.appendChild(th);
		}

		if ($$(".restrictions").length > 0) {
			self.saveWorking("restrictions");
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
			button.classList.add("restrow");
			td.appendChild(button);
			tr.appendChild(td);

			for (let j = 0; j < PLAYERS; j++) {
				let value = false;

				if (self.working[index] != undefined) {
					if (self.working[index][i] != undefined) {
						value = self.working[index][i][j];
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
		self.index = index;
	}

	function fillSelectionProperties() {
		const select = $("#select_unitMap");
		const option = select.options[select.selectedIndex];
		const index = option.value;

		$("#legend_unitMap").textContent = option.label;

		self.saveWorking("unitMap");

		const unit = editor.selected[index];
		let value = "";

		for (const element of $$(".unitMap")) {
			const [type, id] = element.id.split("_");

			if (editor.selected[index] != undefined) {
				if (editor.selected[index][id] != undefined) {
					value = editor.selected[index][id];
				}
			}

			if (self.working[index] != undefined) {
				if (self.working[index][id] != undefined) {
					value = self.working[index][id];
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

		self.changeResource();
		self.index = index;
	}
};

Overlays.prototype.saveProperties = function(key) {
	const self = this;

	this.saveWorking(key);

	if (key == "create") {
		saveCreate();
	} else if (key == "map") {
		saveMap();
	} else if (key == "players") {
		savePlayers();
	} else if (key == "resources") {
		saveResources();
	} else if (key == "restrictions") {
		saveRestrictions();
		editor.pud.useAlow = !$("#checkbox_restrictions").checked;
	} else if (key == "unitMap") {
		saveSelection();
	} else { // units and upgrades
		mergeWorking(key);
		editor.pud[key].useDefaults = $("#checkbox_" + key).checked;
	}

	this.hide(key);

	function saveCreate() {
		const tileset = readRadio("terrain");
		const size    = readRadio("size");

		files.loadTemplate(data.tilesets[tileset], size);
	}

	function saveMap() {
		editor.pud.filename = $("#text_filename").value;
		editor.pud.description = $("#text_description").value;

		const tileset = readRadio("tileset");

		if (editor.pud.tileset != tileset){
			editor.changeTileset(tileset);
		}

		$("#filename").textContent = editor.pud.filename;
	}

	function savePlayers() {
		for (let i = 0; i < PLAYERS; i++) {
			editor.pud.races[i]      = readRadio("race" +  i);
			editor.pud.controller[i] = $("#select_controller" + i).value;
			editor.pud.ai[i]         = $("#select_ai" + i).value;
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
		for (const index of Object.keys(self.working)) {
			for (const i of Object.keys(self.working[index])) {
				for (const j of Object.keys(self.working[index][i])) {
					if (editor.pud.restrictions[index][j] == undefined) {
						continue;
					}

					const value = Boolean(self.working[index][i][j]);
					editor.pud.restrictions[index][j][i] = value;
				}
			}
		}
	}

	function saveSelection() {
		let ownerChanged = 0;

		for (const index of Object.keys(self.working)) {
			for (const property of Object.keys(self.working[index])) {
				if (editor.pud.unitMap[index] == undefined) {
					continue;
				}

				if (editor.pud.unitMap[index][property] == undefined) {
					continue;
				}

				const value = Number(self.working[index][property]);

				if (property == "owner") {
					const unit = editor.pud.unitMap[index];

					// changes race of unit when owner is changed if necessary
					unit.id = editor.convertUnit(unit.id, unit.owner, value);
					ownerChanged++;
				}

				editor.pud.unitMap[index][property] = value;

			}
		}

		if (ownerChanged) { // redraws units if a unit's owner has changed
			editor.drawUnitMap();
		}
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

	function mergeWorking(key) {
		if (editor.pud[key] == undefined) {
			return;
		}

		for (const index of Object.keys(self.working)) {
			for (const property of Object.keys(self.working[index])) {
				if (editor.pud[key][property] == undefined) {
					continue;
				}

				if (editor.pud[key][property][index] == undefined) {
					continue;
				}

				const value = self.working[index][property];
				editor.pud[key][property][index] = value;
			}
		}
	}
};

Overlays.prototype.revertProperties = function(key) {
	const index = $("#select_" + key).value;
	delete this.working[index];
	this.fillProperties(key);
};

Overlays.prototype.resetProperties = function(key) {
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

	this.fillProperties(key);
};

Overlays.prototype.saveWorking = function(key) {
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

Overlays.prototype.changeIcon = function(input, oldImg, select) {
	input.value = Math.min(Math.max(input.value, 0), LAST_ICON);

	const tileset = data.tilesets[editor.pud.tileset];
	const icon = input.value.padStart(4, "0");

	const newImg = new Image();
	newImg.src = "icons/" + tileset + "/" + icon + ".png";
	newImg.addEventListener("load", function() {
		oldImg.src = this.src;
	});
};

Overlays.prototype.changeResource = function() {
	$("#resource").textContent = $("#range_property").value * 2500;
};

/*
 * Pud prototype
 */

function Pud(filename="", struct={}) {
	this.filename = filename;
	this.struct = struct;
	this.valid = true;

	this.id = "";
	this.version = STANDARD;
	this.certificate = 0;
	this.description = "";
	this.width = 0;
	this.height = 0;
	this.tileset = 0;
	this.useAlow = false;

	this.races = [];
	this.controller = [];
	this.ai = [];

	this.startGold = [];
	this.startLumber = [];
	this.startOil = [];

	this.tileMap = [];
	this.movementMap = [];
	this.actionMap = [];
	this.unitMap = [];

	this.units = {};
	this.upgrades = {};
	this.restrictions = {};
}

Pud.prototype.load = function(filename, buffer) {
	let pos = 0;

	while (pos < buffer.byteLength) {
		try {
			const key = hexToStr(new Uint8Array(buffer, pos, DWORD));
			const len = new DataView(buffer, pos + 4, DWORD).getInt32(0, true);

			this.struct[key] = new Uint8Array(buffer, pos + 8, len);
			pos += len + 8;
		} catch (err) {
			console.error(err);
			break;
		}
	}

	this.filename = filename;

	const REQUIRED = true, OPTIONAL = false;
	const self = this;

	this.id             = readType();
	this.version        = readSection("VER ");
	this.description    = readDesc();
	this.controller     = readSection("OWNR");
	this.tileset        = readSection("ERAX", OPTIONAL) || readSection("ERA ");
	[this.width, this.height] = readDim();
	this.units          = readSection("UDTA");
	this.upgrades       = readSection("UGRD");
	this.restrictions   = readSection("ALOW", OPTIONAL);
	this.races          = readSection("SIDE");
	this.startGold      = readSection("SGLD");
	this.startLumber    = readSection("SLBR");
	this.startOil       = readSection("SOIL");
	this.ai             = readSection("AIPL");
	this.tileMap        = readSection("MTXM");
	this.movementMap    = readSection("SQM ");
	this.oilMap         = readSection("OILM"); // unused
	this.actionMap      = readSection("REGM");
	this.certificate    = readSection("SIGN", OPTIONAL) || 0;
	this.unitMap        = readUnit();

	this.valid &= this.version == STANDARD || this.version == EXPANSION;
	this.valid &= this.tileset <= 0xff;

	const area = this.width * this.height;
	this.valid &= this.tileMap.length == area;
	this.valid &= this.movementMap.length == area;

	this.tileset = this.tileset > SWAMP ? FOREST : this.tileset;

	this.controller = this.controller.map(function(controller) {
		if (controller > 0xff) {
			this.valid = false;
		}

		if (controller == 0x01) { // computer
			return 0x04;
		}

		if (controller >= 0x08) { // passive computer
			return 0x00;
		}

		return controller;
	}, this);

	this.races = this.races.map(function(race) {
		return race > 0x02 ? 0x02 : race; // neutral
	});

	this.ai = this.ai.map(function(ai) {
		return Math.min(ai, 0x52);
	});

	this.useAlow = this.restrictions != undefined;

	if (!this.useAlow) { // copies default restriction data if no ALOW section
		this.restrictions = {};

		for (const key of Object.keys(defaults.restrictions)) {
			this.restrictions[key] = [];

			for (const i of Object.keys(defaults.restrictions[key])) {
				const keys = Object.keys(defaults.restrictions[key][i]);
				this.restrictions[key][i] = [];

				for (const j of keys) {
					const value = defaults.restrictions[key][i][j];
					this.restrictions[key][i][j] = value;
				}
			}
		}
	}

	if (this.unitMap.length == 0) { // generates random ID for new maps
		this.id = this.id.map(function() {
			return Math.floor(Math.random() * 256);
		});
	}

	// converts hex to ASCII
	function hexToStr(arr) {
		return arr.reduce(function(str, hex) {
			return str + String.fromCharCode(hex);
		}, "");
	}

	// parses typed array to little-endian number
	function parseNum(arr) {
		return arr.reduce(function(num, hex, i) {
			return num + (hex << i * 8);
		}, 0);
	}

	function readSection(key, required=REQUIRED) {
		if (self.struct[key] == undefined) {
			if (required) {
				setInvalid(`Missing required section: ${key}`);
			}

			return;
		}

		const schema = data.schema[key];

		if (schema.type == ARRAY) {
			return makeArray(self.struct[key], schema.size);
		} else if (schema.type == MAP) {
			return makeMap(self.struct[key], schema);
		} else if (schema.type == NUMBER) {
			return parseNum(self.struct[key]);
		}
	}

	// breaks typed array into array with elements of given size
	function makeArray(data, size) {
		if (size == BYTE) {
			return data;
		}

		const arr = [];

		for (let i = 0; i < data.length; i += size) {
			arr.push(parseNum(data.slice(i, i + size)));
		}

		return arr;
	}

	// breaks typed array into named chunks containing arrays of given size
	function makeMap(arr, schema) {
		const obj = {};
		let addr = 0;

		for (const [key, value] of schema.map) {
			const [len, size, type] = value;
			obj[key] = arr.slice(addr, addr + len * size);

			if (type == ARRAY) {
				obj[key] = makeArray(obj[key], size);
			} else if (type == BOOLEAN) {
				obj[key] = Boolean(obj[key]);
			} else if (type == DIMENSIONS) {
				obj[key] = parseDim(obj[key]);
			} else if (type == BIT_VECTOR) {
				obj[key] = parseBits(makeArray(obj[key], size));
			} else if (type == OCTAL) {
				obj[key] = parseOctal(obj[key]);
			}

			addr += len * size;
		}

		return obj;
	}

	// parses two words into dimensions
	function parseDim(data) {
		const dim = [];

		for (let i = 0; i < data.length; i += DWORD) {
			dim.push({
				x: data[i],
				y: data[i + WORD]
			});
		}

		return dim;
	}

	// breaks bit vectors into arrays of booleans
	function parseBits(arr) {
		return arr.map(function(value) {
			const SIZE = 32;
			const sub = [];

			for (let i = 0; i < SIZE; i++) {
				sub.push(Boolean(value & (1 << i)));
			}

			return sub;
		});
	}

	// parses octal values
	function parseOctal(arr) {
		return Array.from(arr).map(function(value) {
			return [
				Boolean(value & 0o1),
				Boolean(value & 0o2),
				Boolean(value & 0o4)
			];
		});
	}

	// identifies as PUD file and gets unique map ID
	function readType() {
		if (self.struct["TYPE"] == undefined) {
			setInvalid("Missing required section: TYPE");
			return;
		}

		const type = self.struct["TYPE"];

		// checks for file format magic number
		// last two bytes can be any value
		if (!hexToStr(type).startsWith(FILE_SIGNATURE.slice(0, -2))) {
			setInvalid("Invalid file signature.");
			return;
		}

		return type.slice(FILE_SIGNATURE.length); // returns ID
	}

	// reads scenario description
	function readDesc() {
		if (self.struct["DESC"] == undefined) {
			setInvalid("Missing required section: DESC");
			return;
		}

		const desc = hexToStr(self.struct["DESC"]);
		const stop = desc.indexOf("\x00"); // terminates at null char

		return desc.slice(0, stop);
	}

	// gets map dimensions
	function readDim() {
		if (self.struct["DIM "] == undefined) {
			setInvalid("Missing required section: DIM ");
			return [0, 0];
		}

		const dim = self.struct["DIM "];

		if (dim.length != 4) {
			setInvalid("Invalid map dimensions.");
			return [0, 0];
		}

		const x = dim[0];
		const y = dim[2];

		if (x > MAX_WIDTH || y > MAX_HEIGHT) {
			setInvalid("Map dimensions are too large.");
		}

		return [x, y];
	}

	// gets unit map
	function readUnit() {
		if (self.struct["UNIT"] == undefined) {
			setInvalid("Missing required section: UNIT");
			return;
		}

		const unit = self.struct["UNIT"];
		const unitMap = [];

		for (let i = 0; i < unit.length; i += QWORD) {
			unitMap.push({
				x:        parseNum(unit.slice(i,     i + WORD)),
				y:        parseNum(unit.slice(i + 2, i + 2 + WORD)),
				id:       unit[i + 4],
				owner:    unit[i + 5],
				property: parseNum(unit.slice(i + 6, i + 6 + WORD))
			});
		}

		return unitMap;
	}

	function setInvalid(message) {
		self.valid = false;
		console.error(message);
	}
};

Pud.prototype.save = function() {
	const self = this;

	if (!validateMap()) {
		return;
	}

	const tileset = this.tileset == SWAMP ? WASTELAND : this.tileset;

	const sections = new Map([ // order is significant
		["TYPE", saveType()],
		["VER ", convertNum(this.version, WORD)],
		["DESC", saveDesc()],
		["OWNR", this.controller],
		["ERA ", convertNum(tileset, WORD)],
		["ERAX", this.tileset == SWAMP ? convertNum(this.tileset, WORD) : null],
		["DIM ", convertNum(this.width | this.height << 16, DWORD)],
		["UDTA", convertMap(this.units,        data.schema["UDTA"])],
		["UGRD", convertMap(this.upgrades,     data.schema["UGRD"])],
		["ALOW", convertMap(this.restrictions, data.schema["ALOW"])],
		["SIDE", this.races],
		["SGLD", convertArray(this.startGold,   WORD)],
		["SLBR", convertArray(this.startLumber, WORD)],
		["SOIL", convertArray(this.startOil,    WORD)],
		["AIPL", this.ai],
		["MTXM", convertArray(this.tileMap,     WORD)],
		["SQM ", convertArray(this.movementMap, WORD)],
		["OILM", convertArray(this.oilMap,      WORD)],
		["REGM", convertArray(this.actionMap,   WORD)],
		["UNIT", saveUnit()]
	]);

	// only writes restriction data if not using default values
	if (!this.useAlow) {
		sections.delete("ALOW");
	}

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

		const len = convertNum(contents.length, DWORD);

		for (let i = 0; i < len.length; i++, pos++) { // section length
			file[pos] = len[i];
		}

		for (let i = 0; i < contents.length; i++, pos++) {
			file[pos] = contents[i];
		}
	}

	return new Blob([file], {type: MIME_TYPE});

	function validateMap() {
		if (self.unitMap.length == 0) {
			throw "The map is empty. Place one or more units.";
		}

		const players = new Set();
		const start = Array(self.controller.length).fill();

		// determines active players (i.e., players with units placed)
		for (const unit of self.unitMap) {
			players.add(unit.owner);

			// requires start locations for active players
			if (unit.id == HUMAN_START_LOC || unit.id == ORC_START_LOC) {
				start[unit.owner] = true;
			}
		}

		const PASSIVE_COMPUTER = 2, NOBODY = 3, HUMAN = 5;

		for (const player of players) {
			if (player != NEUTRAL && start[player] == undefined) {
				throw `Must place a start location for player ${player + 1}.`;
			}
		}

		self.controller = self.controller.map(function(controller, i) {
			if (i == NEUTRAL) { // neutral player is always passive computer
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

		return true;
	}

	// converts number to big-endian typed array
	function convertNum(num, size) {
		return new Uint8Array(size).map(function(undefined, i) {
			return (num & (0xff << i * 8)) >> i * 8;
		});
	}

	// converts array with elements of given size into typed array
	function convertArray(data, size) {
		const arr = new Uint8Array(data.length * size);

		for (let i = 0; i < data.length; i++) {
			const num = convertNum(data[i], size);

			for (let j = 0; j < num.length; j++) {
				arr[i * size + j] = num[j];
			}
		}

		return arr;
	}

	function convertMap(data, schema) {
		if (data == undefined) {
			return;
		}

		let length = 0;

		for (const [key, value] of schema.map) {
			const [len, size, type] = value;
			length += len * size;
		}

		const arr = new Uint8Array(length);
		let pos = 0;

		for (const [key, value] of schema.map) {
			const [len, size, type] = value;
			let contents = null;

			if (type == ARRAY) {
				contents = convertArray(data[key], size);
			} else if (type == BOOLEAN) {
				contents = convertNum(Number(data[key]), size);
			} else if (type == DIMENSIONS) {
				contents = convertDim(data[key]);
			} else if (type == BIT_VECTOR) {
				contents = convertBits(data[key]);
			} else if (type == OCTAL) {
				contents = convertOctal(data[key]);
			}

			for (let i = 0; i < contents.length; i++, pos++) {
				arr[pos] = contents[i];
			}
		}

		return arr;
	}

	function convertDim(data) {
		const arr = new Uint8Array(DWORD * data.length);
		let pos = 0;

		for (let i = 0; i < data.length; i++, pos += DWORD) {
			const x = convertNum(data[i].x, WORD);
			const y = convertNum(data[i].y, WORD);

			arr[pos]     = x[0];
			arr[pos + 1] = x[1];
			arr[pos + 2] = y[0];
			arr[pos + 3] = y[1];
		}

		return arr;
	}

	function convertBits(data) {
		const arr = new Uint8Array(data.length * DWORD);
		let pos = 0;

		for (let i = 0; i < data.length; i++) {
			let value = 0;

			for (let j = 0; j < data[i].length; j++) {
				value += data[i][j] << j;
			}

			const num = convertNum(value, DWORD);

			for (let j = 0; j < num.length; j++, pos++) {
				arr[pos] = num[j];
			}
		}

		return arr;
	}

	function convertOctal(data) {
		return new Uint8Array(data.length).map(function(undefined, i) {
			return data[i][0] * 0o1 | data[i][1] * 0o2 | data[i][2] * 0o4;
		});
	}

	function saveType() {
		const len = FILE_SIGNATURE.length;
		const arr = new Uint8Array(len + DWORD);

		for (let i = 0; i < len; i++) {
			arr[i] = FILE_SIGNATURE.charCodeAt(i);
		}

		for (let i = 0; i < self.id.length; i++) {
			arr[i + len] = self.id[i];
		}

		return arr;
	}

	function saveDesc() {
		const arr = new Uint8Array(32);
		self.description = self.description.slice(0, 30);

		for (let i = 0; i < self.description.length; i++) {
			arr[i] = self.description.charCodeAt(i);
		}

		return arr;
	}

	function saveUnit() {
		const arr = new Uint8Array(QWORD * self.unitMap.length);
		let pos = 0;

		for (const unit of self.unitMap) {
			const x = convertNum(unit.x, WORD);
			const y = convertNum(unit.y, WORD);
			const property = convertNum(unit.property, WORD);

			arr[pos]     = x[0];
			arr[pos + 1] = x[1];
			arr[pos + 2] = y[0];
			arr[pos + 3] = y[1];
			arr[pos + 4] = unit.id;
			arr[pos + 5] = unit.owner;
			arr[pos + 6] = property[0];
			arr[pos + 7] = property[1];

			pos += QWORD;
		}

		return arr;
	}
};

/*
 * Files prototype
 */

function Files(id) {
	this.id = id;
	this.dirs = [];
}

Files.prototype.browse = function() {
	const self = this;
	const xhr = new XMLHttpRequest();

	// opens at root directory if a template file is currently loaded
	if (this.dirs.includes("templates")) {
		this.dirs = [];
	}

	let path = this.dirs.join("/");

	if (this.dirs.length > 0) {
		path += "/";
	}

	const PARENT = "parent", DIRECTORY = "dir", FILE = "pud";

	xhr.addEventListener("readystatechange", function() {
		if (this.readyState == 4 && this.status == 200) {
			const ul = document.createElement("ul");
			ul.id = self.id;

			if (self.dirs.length > 0) { // except root directory
				ul.appendChild(createItem(PARENT, ".."));
			}

			for (const dir of this.response.dirs) {
				ul.appendChild(createItem(DIRECTORY, dir));
			}

			for (const file of this.response.files) {
				ul.appendChild(createItem(FILE, file));
			}

			$("#" + self.id).replaceWith(ul);
		}
	});
	xhr.open("GET", MAPS_DIR + "/" + path + "index.json", true);
	xhr.responseType = "json";
	xhr.send();

	function createItem(className, file) {
		const li = document.createElement("li");

		const a = document.createElement("a");
		a.href = MAPS_DIR + "/" + path + file;
		a.textContent = (className == PARENT || className == DIRECTORY)
		              ? "[" + file + "]"
		              : file;
		a.classList.add(className);
		li.appendChild(a);

		return li;
	}
};

Files.prototype.load = function(filename, callback) {
	const xhr = new XMLHttpRequest();
	let path = this.dirs.join("/") + "/" + filename;

	// removes initial slash from file path if present
	// (for files in root directory)
	if (path.slice(0, 1) == "/") {
		path = path.slice(1);
	}

	xhr.addEventListener("readystatechange", function() {
		if (this.readyState == 4) {
			callback(filename, path, this.status == 200 ? this.response : null);
		}
	});
	xhr.open("GET", MAPS_DIR + "/" + path, true);
	xhr.responseType = "arraybuffer";
	xhr.send();
};

Files.prototype.openParent = function() {
	this.dirs.pop();
	this.browse();
};

Files.prototype.openDir = function(href) {
	this.dirs.push(window.decodeURIComponent(href.split("/").pop()));
	this.browse();
};

Files.prototype.openFile = function(href) {
	const filename = window.decodeURIComponent(href.split("/").pop());
	this.load(filename, editor.open.bind(editor));
};

Files.prototype.loadTemplate = function(tileset, size) {
	this.dirs = ["templates", tileset];
	this.load(size + "x" + size + ".pud", editor.open.bind(editor));
};