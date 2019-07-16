"use strict";

/*
 * constants
 */

// file format
const FILE_SIGNATURE="WAR2 MAP\x00\x00\x0a\xff";
const STANDARD =0x11;
const EXPANSION=0x13;
const MIME_TYPE="application/x-warcraft2-scenario";

// file names and locations
const MAPS_DIR="maps/";

// editor
const DEFAULT_TILESET="forest";
const DEFAULT_SIZE   =128;
const MINIMAP_SIZE   =200;
const LEFT_MARGIN    =270;
const FRAME_COLOR    ="#fff";
const PLACE_VALID_COLOR="#fff";
const PLACE_ERROR_COLOR="#f00";
const SELECT_COLOR   ="#0f0";

// mouse modes
const SELECT_UNITS =0;
const DRAG_SELECT  =1;
const PLACE_UNIT   =2;
const PAINT_TERRAIN=3;
const DRAG_TERRAIN =4;

// game mechanics
const PLAYERS       =8;
const TILE_SIZE     =32;
const MINI_TILE_SIZE=8;
const MAX_WIDTH     =128;
const MAX_HEIGHT    =128;
const DEFAULT_GOLD  =6; // x2500
const DEFAULT_OIL   =2; // x2500
const RESOURCE_DISTANCE=3; // distance between gold mines/town halls
const LAST_ICON     =195;

// tilesets
const FOREST   =0;
const WINTER   =1;
const WASTELAND=2;
const SWAMP    =3;

// units
const HUMAN_START_LOC=94;
const ORC_START_LOC  =95;

// unit flags
const LAND_UNIT     =0;
const AIR_UNIT      =1;
const SEA_UNIT      =3;
const BUILDING      =5;
const SHORE_BUILDING=16;
const GOLD_MINE     =22;
const GOLD_DEPOT    =12; // town halls
const OIL_PATCH     =21;
const OIL_PLATFORM  =11;
const OIL_DEPOT     =24;

// terrain
const LIGHT=0x00, DARK=0x10;
const PLAIN=0, FILLER=1, RANDOM=2;
const INSPECT=0x0000, WATER=0x0010, DIRT=0x0050, GRASS=0x0030;
const TREES=0x0070, ROCKS=0x0080;
const HUMAN_WALL=0x0090, ORC_WALL=0x00a0;

// objects
const editor  =new Editor();
const overlays=new Overlays();
const files   =new Files("files");

/*
 * initialization
 */

window.addEventListener("load", function() {
	let query=window.location.search.replace(/\?map=(.*)/, "$1");

	if (query=="") {
		files.loadTemplate(DEFAULT_TILESET, DEFAULT_SIZE);
	} else { // loads map specified in optional URL parameter
		let dirs=query.split("/");
		let filename=decodeURIComponent(dirs.pop());

		files.dirs=dirs;
		files.load(filename, editor.open.bind(editor));
	}

	// mouse buttons
	const LEFT =0;
	const RIGHT=2;

	// event listeners
	// for minimap
	$("#frame").addEventListener("mousedown", function(event) {
		if (event.button==LEFT) {
			editor.dragFrame=true;
		}
	});
	$("#frame").addEventListener("mouseup", function(event) {
		if (event.button==LEFT) {
			editor.dragFrame=false;
			editor.moveMap(event.clientX, event.clientY);
		}
	});
	$("#frame").addEventListener("mousemove", function(event) {
		if (editor.dragFrame) {
			editor.moveMap(event.clientX, event.clientY);
		}
	});
	// for map
	$("#select").addEventListener("mousedown", function(event) {
		if (event.button==LEFT) {
			if (editor.mode==SELECT_UNITS) {
				editor.startSelect(event.clientX, event.clientY);
			} else if (editor.mode==PLACE_UNIT) {
				editor.addUnit(event.clientX, event.clientY);
			} else if (editor.mode==PAINT_TERRAIN) {
				editor.startTerrain(event.clientX, event.clientY);
			}
		}
	});
	$("#select").addEventListener("mouseup", function(event) {
		if (event.button==LEFT) {
			if (editor.mode==DRAG_SELECT) {
				editor.selectUnits(
					event.clientX, event.clientY,
					event.shiftKey,
					editor.selectMultiple
				);
			} else if (editor.mode==DRAG_TERRAIN) {
				editor.mode=PAINT_TERRAIN;
			}
		} else if (event.button==RIGHT) {
			if (editor.mode==SELECT_UNITS) {
				if (Object.keys(editor.selected).length>0) {
					overlays.openProperties("unitMap");
				}
			} else if (editor.mode==PLACE_UNIT) {
				editor.mode=SELECT_UNITS;
				editor.clearSelect();
			}
		}
	});
	$("#select").addEventListener("mousemove", function(event) {
		if (editor.mode==DRAG_SELECT) {
			editor.drawSelect(event.clientX, event.clientY);
		} else if (editor.mode==PLACE_UNIT) {
			editor.drawUnitBrush(event.clientX, event.clientY);
		} else if (editor.mode==PAINT_TERRAIN) {
			editor.drawTerrainBrush(event.clientX, event.clientY);
		} else if (editor.mode==DRAG_TERRAIN) {
			editor.paintTerrain(event.clientX, event.clientY);
		}
	});
	$("#select").addEventListener("contextmenu", function(event) {
		event.preventDefault();
	});
	// for palettes
	$("#create").addEventListener("click", create);
	$("#open").addEventListener("click", open);
	$("#save").addEventListener("click", save);
	$("#saveImage").addEventListener("click", editor.saveImage.bind(editor));
	$("#link").addEventListener("click", function() {
		if (editor.path) {
			let link=window.location.href.split("?")[0];
			link+="?map="+editor.path;

			$("#text_link").value=link;
			overlays.show("link");
		}
	});
	$("#about").addEventListener("click", function() {
		overlays.show("about");
	});
	$("#filename").addEventListener("click", function() {
		overlays.openProperties("map");
	});
	$("#select_unitsPalette").addEventListener("input", function() {
		editor.changeUnitPalette();
	});
	// for overlay widgets
	$("#file").addEventListener("input", function(event) {
		let file=event.target.files[0];

		if (file) {
			let reader=new FileReader();
			reader.addEventListener("load", function(event) {
				editor.open(file.name, "", event.target.result);
				overlays.hide("browser");
			});
			reader.readAsArrayBuffer(file);
		}
	});
	$("#copy").addEventListener("click", function() {
		$("#"+this.value).select();
		document.execCommand("copy");
	});
	$("#number_icon").addEventListener("input", function() {
		overlays.changeIcon(this, $("#icon"), $("#select_upgrades"));
	});
	$("#range_property").addEventListener("input", function() {
		overlays.changeResource();
	});

	window.addEventListener("keyup", function(event) {
		let key=event.keyCode;

		if (key==13) { // Enter
			if (Object.keys(editor.selected).length>0) {
				overlays.openProperties("unitMap");
			}
		}

		if (key==27) { // Esc
			if (overlays.active) {
				overlays.closeAll();
			} else {
				editor.mode=SELECT_UNITS;
				editor.clearSelect();
			}
		}

		if (key==46) { // Del
			editor.removeSelected();
		}

		if (key>=48&&key<=56) { // 0-8
			editor.selectPlayer(key==48?15:key-49);
		}
	});
	window.addEventListener("keydown", function(event) {
		let key=event.keyCode;

		if (event.ctrlKey^event.metaKey) { // Ctrl or Cmd
			if (key==78) { // N
				event.preventDefault();
				create();
			} else if (key==79) { // O
				event.preventDefault();
				open();
			} else if (key==83) { // S
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

	// new/open/save buttons
	for (let element of $$(".basic")) {
		element.addEventListener("click", function() {
			$("#"+this.value).click();
		});
	}

	// player buttons under minimap
	for (let element of $$(".player")) {
		element.addEventListener("click", function() {
			editor.selectPlayer(this.value);
		});
	}

	// tool palette tabs
	for (let element of $$(".tab")) {
		element.addEventListener("click", function() {
			editor.selectPalette(this.value);
		});
	}

	// layer toggles
	for (let element of $$(".layer")) {
		element.addEventListener("click", function() {
			$("#"+this.value).classList.toggle("hidden", !this.checked);
		});
	}

	// property sheet open buttons
	for (let element of $$(".properties")) {
		element.addEventListener("click", function() {
			overlays.openProperties(this.value);
		});
	}

	// property sheet select boxes
	for (let element of $$(".fill")) {
		element.addEventListener("input", function() {
			let key=this.id.replace("select_", "");

			if (key!="restrictions") {
				let select=$("#select_"+key);
				let option=select.options[select.selectedIndex];
				$("#legend_"+key).textContent=option.label;
			}

			overlays.saveWorking(key);
			overlays.fillProperties(key);
		});
	}

	// overlay save buttons
	for (let element of $$(".save")) {
		element.addEventListener("click", function() {
			overlays.saveProperties(this.value);
		});
	}

	// overlay close buttons
	for (let element of $$(".close")) {
		element.addEventListener("click", function() {
			overlays.hide(this.value);
		});
	}

	// property sheet "Use default values" buttons
	for (let element of $$(".defaults")) {
		element.addEventListener("click", function() {
			$("#select_"+this.value).disabled=this.checked;
		});
	}

	// property sheet "Revert" buttons
	for (let element of $$(".revert")) {
		element.addEventListener("click", function() {
			overlays.revertProperties(this.value);
		});
	}

	// property sheet "Reset to Defaults" buttons
	for (let element of $$(".reset")) {
		element.addEventListener("click", function() {
			overlays.resetProperties(this.value);
		});
	}

	// terrain brightness buttons
	for (let element of $$(".brightness")) {
		element.addEventListener("click", function() {
			editor.brightness=toggleButtons(this);
		});
	}

	// terrain pattern buttons
	for (let element of $$(".pattern")) {
		element.addEventListener("click", function() {
			editor.pattern=toggleButtons(this);
		});
	}

	// terrain brush size buttons
	for (let element of $$(".size")) {
		element.addEventListener("click", function() {
			editor.size=toggleButtons(this);
		});
	}

	// terrain tile buttons
	for (let element of $$(".terrain")) {
		element.addEventListener("click", function() {
			editor.tile=toggleButtons(this);
			editor.mode=editor.tile?PAINT_TERRAIN:SELECT_UNITS;
		});
	}

	function create() {
		overlays.openProperties("create");
	}

	function open() {
		files.browse();
		overlays.show("browser");
	}

	function save() {
		if (Object.keys(editor.pud)==0) {
			return;
		}

		let blob=null;

		try {
			blob=editor.pud.save();
		} catch (err) {
			return overlays.displayError(err);
		}

		let a=$("#download");
		a.download=editor.pud.filename;
		a.href=window.URL.createObjectURL(blob);
		a.click();
		window.URL.revokeObjectURL(blob);
	}

	function toggleButtons(button) {
		let value=button.value;

		for (let element of $$("."+button.className)) {
			element.classList.toggle("active", value==element.value);
		}

		return Number.parseInt(value);
	}
});

function $(selector) {
	return document.querySelector(selector);
}

function $$(selector) {
	return Array.from(document.querySelectorAll(selector));
}

function clear(element, removeListeners=true) {
	if (element==null) {
		return;
	}

	while (element.lastChild) { // removes all children
		element.removeChild(element.lastChild);
	}

	if (removeListeners) {
		// clones element to remove all event listeners
		element.parentNode.replaceChild(element.cloneNode(true), element);
	}
}

/*
 * Editor prototype
 */

function Editor() {
	this.pud={};
	this.path="";

	this.mode=SELECT_UNITS;

	// canvas drawing contexts
	this.tileMap=null;
	this.unitMap=null;
	this.unitBuffer=null;
	this.select=null;
	this.miniTileMap=null;
	this.miniUnitMap=null;
	this.miniUnitBuffer=null;
	this.frame=null;
	this.tiles=null;

	// box selection
	this.selectMultiple=false;
	this.selected={};
	this.selectX=0;
	this.selectY=0;

	// minimap frame
	this.dragFrame=false;
	this.pos=null;
	this.x=0;
	this.y=0;
	this.scaleX=0;
	this.scaleY=0;

	// unit placement
	this.unit=0;
	this.player=0;
	this.positions=[];

	// terrain
	this.brightness=LIGHT;
	this.pattern=PLAIN;
	this.size=1;
	this.tile=GRASS;
	this.terrainX=0;
	this.terrainY=0;
}

Editor.prototype.open=function(filename, path, buffer) {
	window.scrollTo(0, 0);

	if (buffer==null) {
		return overlays.displayError("The map file does not exist.");
	}

	this.pud=new Pud();
	this.pud.load(filename, buffer);

	if (!this.pud.valid) {
		return overlays.displayError("The map file is corrupted or invalid.");
	}

	this.path=path;

	// disables "Link to Map" button if user map is loaded
	$("#link").disabled=!Boolean(path);

	$("#filename").textContent=this.pud.filename;

	let width=this.pud.width*TILE_SIZE, height=this.pud.height*TILE_SIZE;

	setSize("tileMap",     width,        height);
	setSize("unitMap",     width,        height);
	setSize("movementMap", width,        height);
	setSize("grid",        width,        height);
	setSize("select",      width,        height);
	setSize("miniUnitMap", MINIMAP_SIZE, MINIMAP_SIZE);
	setSize("miniTileMap", MINIMAP_SIZE, MINIMAP_SIZE);
	setSize("frame",       MINIMAP_SIZE, MINIMAP_SIZE);

	this.tileMap=$("#tileMap").getContext("2d");
	this.unitMap=$("#unitMap").getContext("2d");
	this.movementMap=$("#movementMap").getContext("2d");
	this.select=$("#select").getContext("2d");
	this.miniTileMap=$("#miniTileMap").getContext("2d");
	this.miniUnitMap=$("#miniUnitMap").getContext("2d");
	this.frame=$("#frame").getContext("2d");

	// buffers are kept in memory but never inserted into DOM
	this.unitBuffer    =createBuffer("unitMap");
	this.miniUnitBuffer=createBuffer("miniUnitMap");

	this.pos=$("#frame").getBoundingClientRect();
	this.scaleX=MINIMAP_SIZE/$("#tileMap").width;
	this.scaleY=MINIMAP_SIZE/$("#tileMap").height;

	this.miniTileMap.scale(this.scaleX, this.scaleY);
	this.miniUnitMap.scale(this.scaleX, this.scaleY);
	this.miniUnitBuffer.scale(this.scaleX, this.scaleY);

	this.selectPlayer(this.player);
	this.selectPalette("units");

	// keeps track of unit positions so they persist when units are redrawn
	this.positions=Array(this.pud.unitMap.length).fill();

	// draws tile map and unit map, changes unit icons to match tileset
	this.changeTileset(this.pud.tileset);
	// draws movement map
	this.drawMovementMap();

	function setSize(id, w, h) {
		$("#"+id).width =w;
		$("#"+id).height=h;
	}

	function createBuffer(id) {
		let buffer=document.createElement("canvas");
		buffer.width =$("#"+id).width;
		buffer.height=$("#"+id).height;

		return buffer.getContext("2d");
	}
};

Editor.prototype.drawTileMap=function() {
	let tiles=data.tilesets[this.pud.tileset];
	let x=0, y=0;

	for (let [i, tile] of this.pud.tileMap.entries()) {
		let cx=x*TILE_SIZE, cy=y*TILE_SIZE;

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
		}

		if ((i+1)%this.pud.width==0) { // new row
			x=0;
			y++;
		} else {
			x++;
		}
	}

	this.drawFrame();
};

Editor.prototype.drawUnitMap=function() {
	let width=$("#unitMap").width, height=$("#unitMap").height;

	// clears canvas every time or units will stack when tileset changed
	this.unitBuffer.clearRect(0, 0, width, height);
	this.miniUnitBuffer.clearRect(0, 0, width, height);

	let self=this;
	let bottomPromises=[], topPromises=[], top=[];

	// sorts units by stacking priority
	for (let [i, unit] of this.pud.unitMap.entries()) {
		if (unit.id==HUMAN_START_LOC||unit.id==ORC_START_LOC
		  ||this.pud.units.flags[unit.id][AIR_UNIT]
		) {
			top.push(i);
		} else {
			bottomPromises.push(makePromise(i));
		}
	}

	Promise.all(bottomPromises).then(function() {
		// draws flying units and start locations after other units
		topPromises=top.map(makePromise);

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
		let unit=self.pud.unitMap[i], unitSize=1;

		if (unit.id in self.pud.units.unitSize) {
			unitSize=self.pud.units.unitSize[unit.id];
		}

		let path="units/"+self.getTileset(self.pud.tileset)+"/";

		let img=new Image();
		img.src=path+unit.id.toString().padStart(4, "0")+".png";
		img.addEventListener("load", function() {
			let x=unit.x*TILE_SIZE, y=unit.y*TILE_SIZE;
			let w=unitSize.x*TILE_SIZE, h=unitSize.y*TILE_SIZE;

			drawToUnitMap(x, y, w, h, i, unit, img);
			drawToMiniMap(x, y, w, h, unit);

			resolve();
		});

		return img;
	}

	function drawToUnitMap(x, y, w, h, i, unit, img) {
		let sx=0, sy=0, owner=Math.min(unit.owner, 7);
		let startLocation=unit.id==HUMAN_START_LOC||unit.id==ORC_START_LOC;

		if (!startLocation&&!self.pud.units.flags[unit.id][BUILDING]) {
			// centers unit in tile
			x-=(img.width-w)/2;
			y-=(img.width-h)/2;

			w=img.width;
			h=w;

			if (self.positions[i]==undefined) {
				// picks random idle frame
				sy=h*Math.floor(Math.random()*5);
				self.positions[i]=sy;
			} else {
				sy=self.positions[i];
			}
		}

		self.unitBuffer.drawImage(img, sx, sy, w, h, x, y, w, h);

		if (owner==0) { // artwork is already in player 1 colors by default
			return;
		}

		let imageData=self.unitBuffer.getImageData(x, y, w, h);

		// changes player colors to match unit owner
		for (let i=0; i<imageData.data.length; i+=4) { // 4 for RGBA
			for (let j=0; j<4; j++) { // 4 colors for each player
				if (imageData.data[i]  ==data.colors[0][j].r
				  &&imageData.data[i+1]==data.colors[0][j].g
				  &&imageData.data[i+2]==data.colors[0][j].b
				) {
					imageData.data[i]  =data.colors[owner][j].r;
					imageData.data[i+1]=data.colors[owner][j].g;
					imageData.data[i+2]=data.colors[owner][j].b;
				}
			}
		}

		self.unitBuffer.putImageData(imageData, x, y);
	}

	function drawToMiniMap(x, y, w, h, unit) {
		// neutral players use player 8 colors
		let owner=Math.min(unit.owner, 7);

		// uses first player color for minimap squares
		let r=data.colors[owner][0].r.toString(16).padStart(2, "0");
		let g=data.colors[owner][0].g.toString(16).padStart(2, "0");
		let b=data.colors[owner][0].b.toString(16).padStart(2, "0");

		x=Math.floor(x);
		y=Math.floor(y);
		w=Math.ceil(w);
		h=Math.ceil(h);

		self.miniUnitBuffer.fillStyle="#"+r+g+b;
		self.miniUnitBuffer.fillRect(x, y, w, h);
	}
};


Editor.prototype.drawMovementMap=function() {
	let x=0, y=0, w=TILE_SIZE-4, h=w;

	this.movementMap.lineWidth=1;

	for (let [i, tile] of this.pud.movementMap.entries()) {
		if (tile in data.movement) {
			this.movementMap.strokeStyle=data.movement[tile];
			this.movementMap.strokeRect(x*TILE_SIZE+2, y*TILE_SIZE+2, w, h);
		}

		if ((i+1)%this.pud.width==0) { // new row
			x=0;
			y++;
		} else {
			x++;
		}
	}
};

Editor.prototype.moveMap=function(x, y) {
	x-=this.pos.left;
	y-=this.pos.top;

	window.scroll(
		x/this.scaleX-window.innerWidth/2-LEFT_MARGIN,
		y/this.scaleY-window.innerHeight
	);
};

Editor.prototype.updateCoords=function() {
	this.x=this.scaleX*window.scrollX;
	this.y=this.scaleY*window.scrollY;
};

Editor.prototype.drawFrame=function() {
	this.frame.clearRect(0, 0, $("#frame").width, $("#frame").height);
	this.frame.lineWidth=2;
	this.frame.strokeStyle=FRAME_COLOR;
	this.frame.strokeRect(
		this.x, this.y,
		this.scaleX*(window.innerWidth-LEFT_MARGIN),
		this.scaleY*window.innerHeight
	);
};

Editor.prototype.clearSelect=function() {
	this.select.clearRect(0, 0, $("#select").width, $("#select").height);
};

Editor.prototype.startSelect=function(x, y) {
	this.mode=DRAG_SELECT;
	this.selectX=window.scrollX+x-LEFT_MARGIN;
	this.selectY=window.scrollY+y;
};

Editor.prototype.startTerrain=function(x, y) {
	[x, y]=this.findNearestTile(x, y, this.size, this.size);

	this.mode=DRAG_TERRAIN;
	this.terrainX=x;
	this.terrainY=y;
};

Editor.prototype.drawSelect=function(x, y) {
	this.selectMultiple=true;
	let w=window.scrollX+x-this.selectX-LEFT_MARGIN;
	let h=window.scrollY+y-this.selectY;

	this.clearSelect();
	this.select.lineWidth=1;
	this.select.strokeStyle=SELECT_COLOR;
	this.select.strokeRect(this.selectX, this.selectY, w, h);
};

Editor.prototype.selectUnits=function(x, y, add=false, multiple=false) {
	this.mode=SELECT_UNITS;
	this.selectMultiple=false;

	if (!add) {
		this.selected={};

		this.clearSelect();
		this.select.lineWidth=1;
		this.select.strokeStyle=SELECT_COLOR;
	}

	let x1=0, y1=0, x2=0, y2=0;

	if (multiple) {
		x1=Math.floor(this.selectX/TILE_SIZE);
		y1=Math.floor(this.selectY/TILE_SIZE);
	}

	x2=Math.floor((window.scrollX+x-LEFT_MARGIN)/TILE_SIZE);
	y2=Math.floor((window.scrollY+y)/TILE_SIZE);

	for (let [i, unit] of this.pud.unitMap.entries()) {
		if (!this.pud.units.unitSize.hasOwnProperty(unit.id)) {
			continue;
		}

		let unitSize=this.pud.units.unitSize[unit.id];
		let gx1=unit.x, gy1=unit.y; // top left
		let gx2=unit.x+unitSize.x-1, gy2=unit.y+unitSize.y-1; // bottom right

		let boundaries=false;

		if (multiple) {
			if (x2>x1&&y2>y1) {
				// top left to bottom right
				boundaries=(x1<=gx1&&y1<=gy1)&&(x2>=gx1&&y2>=gy1);
			} else if (x1>x2&&y1>y2) {
				// bottom right to top left
				boundaries=(x2<=gx2&&y2<=gy2)&&(x1>=gx2&&y1>=gy2);
			} else if (x2>x1&&y2<y1) {
				// bottom left to top right
				boundaries=(x1<=gx1&&y1>=gy2)&&(x2>=gx1&&y2<=gy2);
			} else {
				// top right to bottom left
				boundaries=(x2<=gx2&&y2>=gy1)&&(x1>=gx2&&y1<=gy1);
			}
		} else { // single unit
			boundaries=(x2>=gx1&&x2<=gx2)&&(y2>=gy1&&y2<=gy2);
		}

		if (boundaries&&(!add||!this.selected.hasOwnProperty(i))) {
			this.select.strokeRect(
				gx1*TILE_SIZE, gy1*TILE_SIZE,
				unitSize.x*TILE_SIZE, unitSize.y*TILE_SIZE
			);

			this.selected[i]=unit;
		}
	}
};

Editor.prototype.drawUnitBrush=function(x, y) {
	let unitSize=this.pud.units.unitSize[this.unit];
	[x, y]=this.findNearestTile(x, y, unitSize.x, unitSize.y);

	let valid=this.validateArea(x, y);

	this.clearSelect();
	this.select.lineWidth=1;
	this.select.strokeStyle=valid?PLACE_VALID_COLOR:PLACE_ERROR_COLOR;
	this.select.strokeRect(
		x*TILE_SIZE, y*TILE_SIZE,
		TILE_SIZE*unitSize.x, TILE_SIZE*unitSize.y
	);
};

Editor.prototype.drawTerrainBrush=function(x, y) {
	[x, y]=this.findNearestTile(x, y, this.size, this.size);

	this.clearSelect();
	this.select.lineWidth=1;
	this.select.strokeStyle=PLACE_VALID_COLOR;
	this.select.strokeRect(
		x*TILE_SIZE, y*TILE_SIZE,
		TILE_SIZE*this.size, TILE_SIZE*this.size
	);
};

Editor.prototype.addUnit=function(x, y) {
	let unitSize=this.pud.units.unitSize[this.unit];
	[x, y]=this.findNearestTile(x, y, unitSize.x, unitSize.y);

	if (!this.validateArea(x, y)) {
		return;
	}

	let property=0;

	let flags=this.pud.units.flags[this.unit];

	// default resources
	if (flags[GOLD_MINE]) {
		property=DEFAULT_GOLD;
	} else if (flags[OIL_PATCH]||flags[OIL_PLATFORM]) {
		property=DEFAULT_OIL;
	}

	// removes existing start location if new one is placed
	if (this.unit==HUMAN_START_LOC||this.unit==ORC_START_LOC) {
		for (let [i, unit] of this.pud.unitMap.entries()) {
			let startLocation=unit.id==HUMAN_START_LOC||unit.id==ORC_START_LOC;

			if (startLocation&&unit.owner==this.player) {
				this.removeUnit(i);
			}
		}
	}

	let unit={
		x,
		y,
		id:    this.unit,
		owner: this.player,
		property
	};
	this.pud.unitMap.push(unit);
	this.drawUnitMap();
};

Editor.prototype.removeUnit=function(id) {
	this.pud.unitMap=this.pud.unitMap.filter(function(undefined, i) {
		return id!=i;
	});
	this.positions=this.positions.filter(function(undefined, i) {
		return id!=i;
	});
	this.drawUnitMap();
};

Editor.prototype.removeSelected=function() {
	this.pud.unitMap=this.pud.unitMap.filter(function(undefined, i) {
		return !(i in this.selected);
	}, this);
	this.clearSelect();
	this.drawUnitMap();
};

Editor.prototype.convertUnit=function(id, race, otherRace) {
	if (race==otherRace) {
		return id;
	}

	let races=["orc", "human"];
	race=races[race];
	otherRace=races[otherRace];

	for (let group of Object.keys(data.units)) {
		for (let type of Object.keys(data.units[group])) {
			for (let race of Object.keys(data.units[group][type])) {
				if (!data.units[group][type].hasOwnProperty(race)) {
					continue;
				}

				if (data.units[group][type][race].id!=id) {
					continue;
				}

				if (!data.units[group][type].hasOwnProperty(otherRace)) {
					continue;
				}

				return data.units[group][type][otherRace].id;
			}
		}
	}

	return id;
};

Editor.prototype.paintTerrain=function(x, y) {
	let self=this;

	this.drawTerrainBrush(x, y);

	[x, y]=this.findNearestTile(x, y, this.size, this.size);
	let points=computePoints(x, y);

	let tile=this.tile;

	if (tile>=WATER&&tile<TREES) {
		tile+=this.brightness;
	}

	let tiles=data.tilesets[this.pud.tileset];

	for (let point of points) {
		this.pud.tileMap[point]=tile;

		let cx=point%this.pud.width*TILE_SIZE;
		let cy=Math.floor(point/this.pud.height)*TILE_SIZE;

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
	}

	function computePoints(x, y) {
		let points=[];

		for (let i=0; i<self.size; i++) {
			for (let j=0; j<self.size; j++) {
				points.push(x+j+self.pud.width*(y+i));
			}
		}

		return points;
	}
};

Editor.prototype.findNearestTile=function(x, y, w, h) {
	x+=window.scrollX;
	y+=window.scrollY;

	x=Math.max(Math.floor((x-LEFT_MARGIN)/TILE_SIZE), 0);
	y=Math.max(Math.floor(y/TILE_SIZE), 0);

	if (this.mode==PLACE_UNIT) {
		let flags=this.pud.units.flags[this.unit];

		// oil patches are only allowed on odd dimensions
		if (flags[OIL_PATCH]||flags[OIL_PLATFORM]) {
			if (x%2==0) {
				x++;
			}

			if (y%2==0) {
				y++;
			}
		}
	}

	if (x+w>this.pud.width) {
		x=this.pud.width-w; // prevents placing past map width
	}

	if (y+h>this.pud.width) {
		y=this.pud.height-h; // prevents placing past map height
	}

	if (this.mode==PLACE_UNIT) {
		// air and sea units are only allowed on even dimensions
		if (flags[AIR_UNIT]||flags[SEA_UNIT]) {
			if (x%2!=0) {
				x++;
			}

			if (y%2!=0) {
				y++;
			}
		}
	}

	return [x, y];
};

Editor.prototype.validateArea=function(x, y) {
	let self=this, valid=true;
	let unitSize=this.pud.units.unitSize[this.unit];
	let points=computePoints(x, y, unitSize);

	const LAND=1, AIR=2, SEA=3;
	let flags=this.pud.units.flags[this.unit];
	let unitType=getUnitType(flags);

	let resourceArea=[];

	if (flags[GOLD_MINE]||flags[GOLD_DEPOT]
	  ||flags[OIL_PATCH]||flags[OIL_PLATFORM]||flags[OIL_DEPOT]
	) { // enforces exclusion area between resource sources and return points
		let start=points[0]-RESOURCE_DISTANCE-this.pud.width*RESOURCE_DISTANCE;
		let row=2*RESOURCE_DISTANCE+unitSize.x;
		let col=2*RESOURCE_DISTANCE+unitSize.y;

		for (let i=0; i<col; i++) {
			for (let j=0; j<row; j++) {
				let coord=start+j+i*this.pud.width;

				// ignores negative values from placing building on top or left
				// edges of map
				if (coord<0) {
					continue;
				}

				// computes distance from building to calculated point to omit
				// "wraparound" values from placing building on right or bottom
				// edges of map
				let h=Math.abs(x-coord%this.pud.width);
				let v=Math.abs(y-Math.floor(coord/this.pud.height));

				if (h>RESOURCE_DISTANCE+unitSize.x
				  ||v>RESOURCE_DISTANCE+unitSize.y
				) {
					continue;
				}

				resourceArea.push(coord);
			}
		}
	}

	// checks if area contains other units
	for (let unit of Array.from(this.pud.unitMap)) {
		if ((this.unit==HUMAN_START_LOC||this.unit==ORC_START_LOC)
		   ^(unit.id==HUMAN_START_LOC||unit.id==ORC_START_LOC)
		) {
			// start locations ignore collision with everything except
			// other start locations
			continue;
		}

		let compareType=getUnitType(this.pud.units.flags[unit.id]);
		let compareFlags=this.pud.units.flags[unit.id];

		if ((flags[AIR_UNIT]^compareFlags[AIR_UNIT])
		  &&((unitType==LAND||unitType==SEA||flags[BUILDING])
		    ^(compareType==LAND||compareType==SEA||compareFlags[BUILDING]))
		) {
			continue; // allows air units over ground and sea units/buildings
		}

		let compareUnitSize=this.pud.units.unitSize[unit.id];

		for (let point of computePoints(unit.x, unit.y, compareUnitSize)) {
			if (points.includes(point)) {
				valid=false;
				break;
			}

			if ((flags[GOLD_MINE]&&compareFlags[GOLD_DEPOT])
			  ||(flags[GOLD_DEPOT]&&compareFlags[GOLD_MINE])
			  ||((flags[OIL_PATCH]||flags[OIL_PLATFORM])
			    &&compareFlags[OIL_DEPOT])
			  ||(flags[OIL_DEPOT]
			    &&(compareFlags[OIL_PATCH]||compareFlags[OIL_PLATFORM]))
			) {
				if (resourceArea.includes(point)) {
					valid=false;
					break;
				}
			}
		}
	}

	let startLocation=this.unit==HUMAN_START_LOC||this.unit==ORC_START_LOC;
	let coastTiles=0;

	// checks if unit is allowed on movement tile
	for (let point of points) {
		let special=this.pud.movementMap[point]&0xff00;
		let tile   =this.pud.movementMap[point]&0x00ff;

		if (special==0x00) {
			if (unitType==LAND||startLocation) {
				valid&=tile==0x00||tile==0x01||tile==0x11;
			} else if (unitType==AIR) {
				valid&=true;
			} else if (unitType==SEA||flags[OIL_PATCH]||flags[OIL_PLATFORM]) {
				valid&=tile==0x00||tile==0x40;
			} else if (flags[BUILDING]) {
				if (flags[SHORE_BUILDING]) {
					valid&=tile==0x02||tile==0x82||tile==0x40;
					coastTiles+=tile==0x02||tile==0x82; // counts coast tiles
				} else {
					valid&=tile==0x00||tile==0x01;
				}
			}
		} else if (special==0x02) {
			if (unitType==AIR) {
				valid=false;
			}
		} else if (special==0xff) {
			valid=false;
		}

		if (!valid) {
			break;
		}
	}

	if (flags[SHORE_BUILDING]) {
		// shore buildings must be on at least one coast tile
		valid&=coastTiles>0;
	}

	return valid;

	function computePoints(x, y, unitSize) {
		let points=[];

		for (let i=0; i<unitSize.y; i++) {
			for (let j=0; j<unitSize.x; j++) {
				points.push(x+j+self.pud.width*(y+i));
			}
		}

		return points;
	}

	function getUnitType(flags) {
		return LAND*flags[0]+AIR*flags[1]+SEA*flags[3];
	}
};

Editor.prototype.selectPlayer=function(player) {
	for (let element of $$(".player")) {
		element.classList.toggle("current", element.value==player);
	}

	player=Number.parseInt(player);

	let ownerChanged=0;

	// does not reassign ownership of critters, gold mines, oil patches,
	// or start locations in box selections
	let omit=[57, 92, 93, HUMAN_START_LOC, ORC_START_LOC];

	// reassigns owner of selected units
	for (let unit of Object.values(this.selected)) {
		if (omit.includes(unit.id)) {
			continue;
		}

		// changes race of unit when owner is changed if necessary
		unit.id=this.convertUnit(
			unit.id,
			this.pud.races[player],
			this.pud.races[unit.owner]
		);
		unit.owner=player;
		ownerChanged++;
	}

	let raceChanged=this.pud.races[this.player]!=this.pud.races[player];

	if (ownerChanged||raceChanged) {
		// redraw units if owner or race changes
		this.drawUnitMap();

		if (this.mode==PLACE_UNIT) {
			this.unit=this.convertUnit(
				this.unit,
				editor.pud.races[player],
				editor.pud.races[this.player]
			);
		}
	}

	this.player=player;

	if (raceChanged) {
		this.changeUnitPalette();
	}
};

Editor.prototype.selectPalette=function(palette) {
	for (let element of $$(".palette")) {
		element.classList.toggle("open", element.id==palette);
	}

	for (let element of $$(".tab")) {
		element.classList.toggle("current", element.value==palette);
	}
};

Editor.prototype.changeTileset=function(tileset) {
	this.pud.tileset=tileset;

	let tilename=this.getTileset(tileset);

	this.tiles=new Image();
	this.tiles.src="tilesets/"+tilename+".png";
	this.tiles.addEventListener("load", this.drawTileMap.bind(this));

	if (tileset==SWAMP) {
		// remaps tiles that are unspecified for swamp tileset
		this.pud.tileMap=this.pud.tileMap.map(function(tile) {
			let rand=Math.floor(Math.random()*3)-1;

			switch (tile) {
				case 0x003a:
				case 0x003b:
					return 0x0030+rand;
				case 0x004a:
				case 0x004b:
					return 0x0040+rand;
				default:
					return tile;
			}
		});
	}

	// changes terrain buttons to match tileset
	for (let element of $$(".tile")) {
		let path=element.getAttribute("src").split("/");
		path[2]=tilename;
		element.setAttribute("src", path.join("/"));
	}

	this.drawUnitMap();
	this.changeTerrainPalette();
	this.changeUnitPalette();
};

Editor.prototype.changeTerrainPalette=function() {
	for (let element of $$(".terrain img")) {
		let icon=element.parentElement.value+".png";

		let img=new Image();
		img.src="icons/terrain/"+this.getTileset(this.pud.tileset)+"/"+icon;
		img.addEventListener("load", function() {
			element.src=this.src;
		});
	}
};

Editor.prototype.changeUnitPalette=function() {
	let group=$("#select_unitsPalette").value;

	if (!data.units.hasOwnProperty(group)) {
		return;
	}

	clear($("#unitsPalette"));

	let ul=document.createElement("ul");
	ul.id="unitsPalette";

	for (let type of Object.values(data.units[group])) {
		let race=this.pud.races[this.player]?"orc":"human";

		if (!type.hasOwnProperty(race)) {
			race="neutral";
		}

		let unit=type[race];

		let li=document.createElement("li");
		let button=document.createElement("button");
		let img=document.createElement("img");

		let icon=unit.icon.toString().padStart(4, "0")+".png";

		button.className="unit";
		button.value=unit.id;
		button.addEventListener("click", function() {
			this.mode=PLACE_UNIT;
			this.unit=unit.id;
		}.bind(this));

		img.src="icons/"+this.getTileset(this.pud.tileset)+"/"+icon;
		img.setAttribute("alt", "["+unit.name+"]");
		img.setAttribute("title", unit.name);

		button.appendChild(img);
		li.appendChild(button);
		ul.appendChild(li);
	}

	$("#unitsPalette").replaceWith(ul);
};

Editor.prototype.getTileset=function(num) {
	switch (num) {
		case 1:
			return "winter";
		case 2:
			return "wasteland";
		case 3:
			return "swamp";
		default:
			return "forest";
	}
};

Editor.prototype.saveImage=function() {
	let canvas=document.createElement("canvas");
	canvas.width =$("#tileMap").width;
	canvas.height=$("#tileMap").height;

	let context=canvas.getContext("2d");
	// composites all layers into a single image
	context.drawImage($("#tileMap"), 0, 0, canvas.width, canvas.height);
	context.drawImage($("#unitMap"), 0, 0, canvas.width, canvas.height);
	context.drawImage($("#grid"),    0, 0, canvas.width, canvas.height);

	let filename=this.pud.filename.replace(/\.pud$/, ".png");

	canvas.toBlob(function(blob) {
		let a=$("#download");
		a.download=filename;
		a.href=window.URL.createObjectURL(blob);
		a.click();
		window.URL.revokeObjectURL(blob);
	}, "image/png");
};

/*
 * Overlays prototype
 */

function Overlays() {
	// currently active overlay
	this.active="";

	// property sheet working object
	this.working={};
	this.index="";
}

Overlays.prototype.show=function(id) {
	this.closeAll();
	this.active=id;
	$("#overlay_"+id).classList.add("open");

	editor.dragFrame=false;

	if (editor.mode!=SELECT_UNITS) {
		editor.mode=SELECT_UNITS;
		editor.clearSelect();
	}
};

Overlays.prototype.hide=function(id) {
	this.active="";
	this.working={};
	this.index="";
	$("#overlay_"+id).classList.remove("open");
};

Overlays.prototype.closeAll=function() {
	if (this.active) {
		this.hide(this.active);
	}
};

Overlays.prototype.displayError=function(message) {
	$("#overlay_error>p").textContent=message;
	this.show("error");
};

Overlays.prototype.openProperties=function(key) {
	let self=this;

	if (key=="create") {
		openCreate();
	} else if (key=="map") {
		openMap();
	} else if (key=="players") {
		openPlayers();
	} else if (key=="resources") {
		openResources();
	} else if (key=="units") {
		openUnits();
	} else if (key=="upgrades") {
		openUpgrades();
	} else if (key=="restrictions") {
		openRestrictions();
	} else if (key=="unitMap") {
		openSelection();
	}

	this.show(key);

	function openCreate() {
		setRadio("size",    editor.pud.width||DEFAULT_SIZE);
		setRadio("terrain", editor.pud.tileset||DEFAULT_TILESET);
	}

	function openMap() {
		setRadio("tileset", editor.pud.tileset);

		$("#text_filename").value   =editor.pud.filename;
		$("#text_width").value      =editor.pud.width;
		$("#text_height").value     =editor.pud.height;
		$("#text_description").value=editor.pud.description;
	}

	function openPlayers() {
		for (let element of $$(".ai")) {
			for (let [id, name] of data.ai) {
				let option=document.createElement("option");
				option.value=id;
				option.textContent=name;
				element.appendChild(option);
			}
		}

		for (let i=0; i<PLAYERS; i++) {
			setRadio("race"+i,        editor.pud.races[i]);
			setSelect("controller"+i, editor.pud.controller[i]);
			setSelect("ai"+i,         editor.pud.ai[i]);
		}
	}

	function openResources() {
		for (let i=0; i<PLAYERS; i++) {
			$("#number_startingGold"+i).value  =editor.pud.startingGold[i];
			$("#number_startingLumber"+i).value=editor.pud.startingLumber[i];
			$("#number_startingOil"+i).value   =editor.pud.startingOil[i];
		}
	}

	function openUnits() {
		let select=$("#select_units"), units={};

		for (let group of Object.keys(data.units)) {
			for (let type of Object.keys(data.units[group])) {
				for (let race of Object.keys(data.units[group][type])) {
					if (!units.hasOwnProperty(race)) {
						units[race]=[];
					}

					let unit=data.units[group][type][race];

					if (unit.skip) {
						continue;
					}

					units[race].push(unit);
				}
			}
		}

		for (let race of Object.keys(units)) {
			let optgroup=document.createElement("optgroup");
			let label=race.charAt(0).toUpperCase()+race.slice(1);
			optgroup.setAttribute("label", label);

			units[race].sort();

			for (let unit of units[race]) {
				let option=document.createElement("option");
				option.value=unit.id;
				option.textContent=unit.name;
				optgroup.appendChild(option);
			}

			select.appendChild(optgroup);
		}

		$("#checkbox_units").checked=editor.pud.units.useDefaults;
		select.disabled=editor.pud.units.useDefaults;
		select.selectedIndex=0;

		let option=select.options[select.selectedIndex];
		$("#legend_units").textContent=option.label;

		self.fillProperties("units");
	}

	function openUpgrades() {
		let select=$("#select_upgrades");

		for (let race of Object.keys(data.upgrades)) {
			let optgroup=document.createElement("optgroup");
			let label=race.charAt(0).toUpperCase()+race.slice(1);
			optgroup.setAttribute("label", label);

			for (let [id, name] of data.upgrades[race]) {
				let option=document.createElement("option");
				option.value=id;
				option.textContent=name;
				optgroup.appendChild(option);
			}

			select.appendChild(optgroup);
		}

		$("#checkbox_upgrades").checked=editor.pud.upgrades.useDefaults;
		select.disabled=editor.pud.upgrades.useDefaults;
		select.selectedIndex=0;

		let option=select.options[select.selectedIndex];
		$("#legend_upgrades").textContent=option.label;

		self.fillProperties("upgrades");
	}

	function openRestrictions() {
		$("#checkbox_restrictions").checked=!editor.pud.useAlow;
		$("#select_restrictions").disabled=!editor.pud.useAlow;

		self.fillProperties("restrictions");
	}

	function openSelection() {
		let select=$("#select_unitMap"), units={};

		clear(select, false);

		for (let group of Object.keys(data.units)) {
			for (let id of Object.keys(data.units[group])) {
				for (let race of Object.keys(data.units[group][id])) {
					let unit=data.units[group][id][race];
					units[unit.id]=unit.name;
				}
			}
		}

		for (let [key, value] of Object.entries(editor.selected)) {
			let item=document.createElement("option");
			item.value=key;
			item.textContent=units[value.id]||"Unknown";
			select.appendChild(item);
		}

		select.selectedIndex=0;
		self.fillProperties("unitMap");
		self.changeResource();
	}

	function setRadio(name, compare) {
		let radios=document.getElementsByName("radio_"+name);

		for (let element of radios) {
			element.checked=element.value==compare;
		}
	}

	function setSelect(id, value) {
		let select=$("#select_"+id), options=select.options;

		for (let i in options) {
			if (options[i].value==value) {
				select.selectedIndex=i;
				break;
			}
		}
	}
};

Overlays.prototype.fillProperties=function(key) {
	if (!editor.pud.hasOwnProperty(key)) {
		return;
	}

	let self=this;

	if (key=="restrictions") {
		return fillRestrictionProperties();
	} else if (key=="unitMap") {
		return fillSelectionProperties();
	}

	let index=$("#select_"+key).value, value="";

	for (let element of $$("."+key)) {
		let [type, id, sub]=element.id.split("_");

		if (editor.pud[key].hasOwnProperty(id)) {
			if (editor.pud[key][id].hasOwnProperty(index)) {
				if (sub&&editor.pud[key][id][index].hasOwnProperty(sub)) {
					value=editor.pud[key][id][index][sub];
				}

				value=editor.pud[key][id][index];
			}
		}

		if (this.working.hasOwnProperty(index)) {
			if (this.working[index].hasOwnProperty(id)) {
				if (sub&&this.working[index][id].hasOwnProperty(sub)) {
					value=this.working[index][id][sub];
				}

				value=this.working[index][id];
			}
		}

		if (sub) {
			for (let property in value) {
				if (property==sub) {
					if (type=="checkbox") {
						$("#"+element.id).checked=Boolean(value[property]);
					} else {
						$("#"+element.id).value=value[property];
					}
				}
			}
		} else {
			if (type=="checkbox") {
				$("#"+element.id).checked=Boolean(value);
			} else {
				$("#"+element.id).value=value;
			}
		}
	}

	if (key=="units") {
		$("#select_rmbAction").disabled=editor.pud.units.flags[index][BUILDING];
	} else if (key=="upgrades") {
		this.changeIcon($("#number_icon"), $("#icon"), $("#select_upgrades"));
	}

	this.index=index;

	function fillRestrictionProperties() {
		let index=$("#select_restrictions").value;
		let category=index.replace(/Research(ed|ing)/, "");

		let tr=document.createElement("tr");
		let td=document.createElement("th");
		tr.appendChild(td);

		for (let i=1; i<=PLAYERS; i++) {
			let td=document.createElement("th");
			td.className="player"+i;
			td.textContent=i;
			td.addEventListener("click", function() {
				for (let element of $$(".restrictions")) {
					let [type, index, player]=element.id.split("_");

					if (player==i-1) {
						element.checked=!element.checked;
					}
				}
			});
			tr.appendChild(td);
		}

		if ($$(".restrictions").length>0) {
			self.saveWorking("restrictions");
		}

		clear($("#restrictions table"));
		$("#restrictions table").appendChild(tr);

		for (let [i, item] of data.restrictions[category].entries()) {
			if (item=="") {
				continue;
			}

			tr=document.createElement("tr");
			td=document.createElement("td");
			td.textContent=item;
			td.addEventListener("click", function() {
				for (let element of $$(".restrictions")) {
					let [type, index, player]=element.id.split("_");

					if (index==i) {
						element.checked=!element.checked;
					}
				}
			});
			tr.appendChild(td);

			for (let j=0; j<PLAYERS; j++) {
				let value=false;

				if (self.working.hasOwnProperty(index)) {
					if (self.working[index].hasOwnProperty(i)) {
						value=self.working[index][i][j];
					}
				} else {
					if (editor.pud.restrictions[index].hasOwnProperty(j)) {
						value=editor.pud.restrictions[index][j][i];
					}
				}

				if (value==undefined) {
					// false for researched/researching, true otherwise
					value=index==category;
				}

				td=document.createElement("td");

				let input=document.createElement("input");
				input.id="checkbox_"+i+"_"+j;
				input.className="restrictions";
				input.checked=Boolean(value);
				input.value=i;
				input.setAttribute("type", "checkbox");

				td.appendChild(input);
				tr.appendChild(td);
			}

			$("#restrictions table").appendChild(tr);
		}

		self.index=index;
	}

	function fillSelectionProperties() {
		let select=$("#select_unitMap");
		let option=select.options[select.selectedIndex], index=option.value;

		$("#legend_unitMap").textContent=option.label;

		self.saveWorking("unitMap");

		let unit=editor.selected[index], value="";

		for (let element of $$(".unitMap")) {
			let [type, id]=element.id.split("_");

			if (editor.selected.hasOwnProperty(index)) {
				if (editor.selected[index].hasOwnProperty(id)) {
					value=editor.selected[index][id];
				}
			}

			if (self.working.hasOwnProperty(index)) {
				if (self.working[index].hasOwnProperty(id)) {
					value=self.working[index][id];
				}
			}

			$("#"+element.id).value=value;
		}

		let startLocation=unit.id==HUMAN_START_LOC||unit.id==ORC_START_LOC;

		if (startLocation) {
			$("#row_owner").classList.add("hidden");
			$("#select_owner").disabled=true;
		} else {
			$("#row_owner").classList.remove("hidden");
			$("#select_owner").disabled=false;
		}

		let flags=editor.pud.units.flags[unit.id];

		if (flags[GOLD_MINE]||flags[OIL_PATCH]||flags[OIL_PLATFORM]) {
			$("#row_resource").classList.remove("hidden");
			$("#range_property").disabled=false;
		} else {
			$("#row_resource").classList.add("hidden");
			$("#range_property").disabled=true;
			self.changeResource();
		}

		if (!startLocation&&!flags[BUILDING]) { // units, not buildings
			$("#row_ai").classList.remove("hidden");
			$("#select_property").disabled=false;
		} else {
			$("#row_ai").classList.add("hidden");
			$("#select_property").disabled=true;
		}

		self.index=index;
	}
};

Overlays.prototype.saveProperties=function(key) {
	let self=this;

	this.saveWorking(key);

	if (key=="create") {
		saveCreate();
	} else if (key=="map") {
		saveMap();
	} else if (key=="players") {
		savePlayers();
	} else if (key=="resources") {
		saveResources();
	} else if (key=="restrictions") {
		saveRestrictions();
		editor.pud.useAlow=!$("#checkbox_restrictions").checked;
	} else if (key=="unitMap") {
		saveSelection();
	} else { // units and upgrades
		mergeWorking(key);
		editor.pud[key].useDefaults=$("#checkbox_"+key).checked;
	}

	this.hide(key);

	function saveCreate() {
		let tileset=readRadio("terrain");
		let size   =readRadio("size");

		files.loadTemplate(editor.getTileset(tileset), size);
	}

	function saveMap() {
		editor.pud.filename=$("#text_filename").value;
		editor.pud.description=$("#text_description").value;

		let tileset=readRadio("tileset");

		if (editor.pud.tileset!=tileset){
			editor.changeTileset(tileset);
		}

		$("#filename").textContent=editor.pud.filename;
	}

	function savePlayers() {
		for (let i=0; i<PLAYERS; i++) {
			editor.pud.races[i]     =readRadio("race"+i);
			editor.pud.controller[i]=$("#controller"+i).value;
			editor.pud.ai[i]        =$("#ai"+i).value;
		}

		editor.changeUnitPalette();
	}

	function saveResources() {
		for (let i=0; i<PLAYERS; i++) {
			editor.pud.startingGold[i]  =readNumber("startingGold"+i);
			editor.pud.startingLumber[i]=readNumber("startingLumber"+i);
			editor.pud.startingOil[i]   =readNumber("startingOil"+i);
		}
	}

	function saveRestrictions() {
		for (let index of Object.keys(self.working)) {
			for (let i of Object.keys(self.working[index])) {
				for (let j of Object.keys(self.working[index][i])) {
					if (!editor.pud.restrictions[index].hasOwnProperty(j)) {
						continue;
					}

					let value=Boolean(self.working[index][i][j]);
					editor.pud.restrictions[index][j][i]=value;
				}
			}
		}
	}

	function saveSelection() {
		let ownerChanged=0;

		for (let index of Object.keys(self.working)) {
			for (let property of Object.keys(self.working[index])) {
				if (!editor.pud.unitMap.hasOwnProperty(index)) {
					continue;
				}

				if (!editor.pud.unitMap[index].hasOwnProperty(property)) {
					continue;
				}

				let value=Number(self.working[index][property]);

				if (property=="owner") {
					let unit=editor.pud.unitMap[index];

					// changes race of unit when owner is changed if necessary
					unit.id=editor.convertUnit(
						unit.id,
						editor.pud.races[value],
						editor.pud.races[unit.owner]
					);
					ownerChanged++;
				}

				editor.pud.unitMap[index][property]=value;

			}
		}

		if (ownerChanged) { // redraws units if a unit's owner has changed
			editor.drawUnitMap();
		}
	}

	function readNumber(id, size) {
		let num=Number.parseInt($("#number_"+id).value);
		return Math.max(num, 0);
	}

	function readRadio(name) {
		let radios=document.getElementsByName("radio_"+name);

		for (let element of radios) {
			if (element.checked) {
				return Number.parseInt(element.value);
			}
		}
	}

	function mergeWorking(key) {
		if (!editor.pud.hasOwnProperty(key)) {
			return;
		}

		for (let index of Object.keys(self.working)) {
			for (let property of Object.keys(self.working[index])) {
				if (!editor.pud[key].hasOwnProperty(property)) {
					continue;
				}

				if (!editor.pud[key][property].hasOwnProperty(index)) {
					continue;
				}

				editor.pud[key][property][index]=self.working[index][property];
			}
		}
	}
};

Overlays.prototype.revertProperties=function(key) {
	let index=$("#select_"+key).value;
	delete this.working[index];
	this.fillProperties(key);
};

Overlays.prototype.resetProperties=function(key) {
	let index=$("#select_"+key).value;

	if (!this.working.hasOwnProperty(index)) {
		this.working[index]={};
	}

	for (let property of Object.keys(data.defaults[key])) {
		if (property=="useDefaults") {
			continue;
		}

		let keys=Object.keys(data.defaults[key][property][index]);

		if (keys.length>0) {
			for (let sub of keys) {
				if (!this.working[index].hasOwnProperty(property)) {
					this.working[index][property]={};
				}

				let value=data.defaults[key][property][index][sub];
				this.working[index][property][sub]=value;
			}
		} else {
			this.working[index][property]=data.defaults[key][property][index];
		}
	}

	this.fillProperties(key);
};

Overlays.prototype.saveWorking=function(key) {
	if (this.index=="") {
		return;
	}

	this.working[this.index]=$$("."+key).reduce(function(obj, element) {
		if (!element.disabled) {
			let [type, id, sub]=element.id.split("_");
			let value=false;

			if (type=="checkbox") {
				value=element.checked;
			} else {
				value=Number.parseInt(element.value);
			}

			if (sub==undefined) {
				obj[id]=value;
			} else {
				if (!obj.hasOwnProperty(id)) {
					obj[id]={};
				}

				obj[id][sub]=value;
			}
		}

		return obj;
	}, {});
};

Overlays.prototype.changeIcon=function(input, img, select) {
	input.value=Math.min(Math.max(input.value, 0), LAST_ICON);

	let icon=input.value.padStart(4, "0");
	img.src="icons/"+editor.getTileset(editor.pud.tileset)+"/"+icon+".png";
};

Overlays.prototype.changeResource=function() {
	$("#resource").textContent=$("#range_property").value*2500;
};

/*
 * Pud prototype
 */

function Pud(filename="", struct={}) {
	this.filename=filename;
	this.struct=struct;
	this.valid=true;

	this.id="";
	this.version=STANDARD;
	this.signature=0;
	this.description="";
	this.width=0;
	this.height=0;
	this.tileset=0;
	this.useAlow=false;

	this.races=[];
	this.controller=[];
	this.ai=[];

	this.startingGold=[];
	this.startingLumber=[];
	this.startingOil=[];

	this.tileMap=[];
	this.movementMap=[];
	this.actionMap=[];
	this.unitMap=[];

	this.units={};
	this.upgrades={};
	this.restrictions={};
}

Pud.prototype.load=function(filename, buffer) {
	let pos=0;

	while (pos<buffer.byteLength) {
		try {
			let key=hexToStr(new Uint8Array(buffer, pos, DWORD));
			let length=new DataView(buffer, pos+4, DWORD).getInt32(0, true);

			this.struct[key]=new Uint8Array(buffer, pos+8, length);
			pos+=length+8;
		} catch (err) {
			console.error(err);
			break;
		}
	}

	this.filename=filename;

	const REQUIRED=true, NOT_REQUIRED=false;
	let self=this;

	this.id            =readType();
	this.version       =readSection("VER ");
	this.description   =readDesc();
	this.controller    =readSection("OWNR");
	this.tileset       =readSection("ERAX", NOT_REQUIRED)||readSection("ERA ");
	[this.width, this.height]=readDim();
	this.units         =readSection("UDTA");
	this.upgrades      =readSection("UGRD");
	this.restrictions  =readSection("ALOW", NOT_REQUIRED);
	this.races         =readSection("SIDE");
	this.startingGold  =readSection("SGLD");
	this.startingLumber=readSection("SLBR");
	this.startingOil   =readSection("SOIL");
	this.ai            =readSection("AIPL");
	this.tileMap       =readSection("MTXM");
	this.movementMap   =readSection("SQM ");
	this.oilMap        =readSection("OILM"); // unused
	this.actionMap     =readSection("REGM");
	this.signature     =readSection("SIGN", NOT_REQUIRED)||0;
	this.unitMap       =readUnit();

	this.valid=this.version==STANDARD||this.version==EXPANSION;
	this.valid=this.tileset<=0xff;

	let dimensions=this.width*this.height;
	this.valid=this.tileMap.length==dimensions;
	this.valid=this.movementMap.length==dimensions;

	this.tileset=this.tileset>SWAMP?FOREST:this.tileset;

	this.controller=this.controller.map(function(controller) {
		if (controller>0xff) {
			this.valid=false;
		}

		if (controller==0x01) { // computer
			return 0x04;
		}

		if (controller>=0x08) { // passive computer
			return 0x00;
		}

		return controller;
	}, this);

	this.races=this.races.map(function(race) {
		return race>0x02?0x02:race; // neutral
	});

	this.ai=this.ai.map(function(ai) {
		return Math.min(ai, 0x52);
	});

	this.useAlow=this.restrictions!=undefined;

	if (!this.useAlow) { // copies default restriction data if no ALOW section
		this.restrictions={};

		for (let key of Object.keys(data.defaults.restrictions)) {
			this.restrictions[key]=[];

			for (let i of Object.keys(data.defaults.restrictions[key])) {
				let keys=Object.keys(data.defaults.restrictions[key][i]);
				this.restrictions[key][i]=[];

				for (let j of keys) {
					let value=data.defaults.restrictions[key][i][j];
					this.restrictions[key][i][j]=value;
				}
			}
		}
	}

	if (this.unitMap.length==0) { // generates random ID for new maps
		this.id=this.id.map(function() {
			return Math.floor(Math.random()*256);
		});
	}

	// converts hex to ASCII
	function hexToStr(arr) {
		return arr.reduce(function(str, hex) {
			return str+String.fromCharCode(hex);
		}, "");
	}

	// parses typed array to little-endian number
	function parseNum(arr) {
		return arr.reduce(function(num, hex, i) {
			return num+(hex<<i*8);
		}, 0);
	}

	function readSection(key, required=REQUIRED) {
		if (!self.struct.hasOwnProperty(key)) {
			if (required) {
				self.valid=false;
			}

			return;
		}

		let schema=data.schema[key];

		if (schema.type==ARRAY) {
			return makeArray(self.struct[key], schema.size);
		} else if (schema.type==MAP) {
			return makeMap(self.struct[key], schema);
		} else if (schema.type==NUMBER) {
			return parseNum(self.struct[key]);
		}
	}

	// breaks typed array into array with elements of given size
	function makeArray(data, size) {
		if (size==BYTE) {
			return data;
		}

		let arr=[];

		for (let i=0; i<data.length; i+=size) {
			arr.push(parseNum(data.slice(i, i+size)));
		}

		return arr;
	}

	// breaks typed array into named chunks containing arrays of given size
	function makeMap(arr, schema) {
		let obj={}, addr=0;

		for (let [key, value] of schema.map) {
			let [len, size, type]=value;
			obj[key]=arr.slice(addr, addr+len*size);

			if (type==ARRAY) {
				obj[key]=makeArray(obj[key], size);
			} else if (type==BOOLEAN) {
				obj[key]=Boolean(obj[key]);
			} else if (type==DIMENSIONS) {
				obj[key]=parseDim(obj[key]);
			} else if (type==BIT_FIELD) {
				obj[key]=parseBits(makeArray(obj[key], size));
			} else if (type==OCTAL) {
				obj[key]=parseOctal(obj[key]);
			}

			addr+=len*size;
		}

		return obj;
	}

	// parses two words into dimensions
	function parseDim(data) {
		let dim=[];

		for (let i=0; i<data.length; i+=DWORD) {
			dim.push({
				x: data[i],
				y: data[i+WORD]
			});
		}

		return dim;
	}

	// breaks bit fields into arrays of booleans
	function parseBits(arr) {
		return arr.map(function(value) {
			const SIZE=32;
			let sub=[];

			for (let i=0; i<SIZE; i++) {
				sub.push(Boolean(value&(1<<i)));
			}

			return sub;
		});
	}

	// parses octal values
	function parseOctal(arr) {
		return Array.from(arr).map(function(value) {
			return [
				Boolean(value&0b001),
				Boolean(value&0b010),
				Boolean(value&0b100)
			];
		});
	}

	// identifies as PUD file and gets unique map ID
	function readType() {
		if (!self.struct.hasOwnProperty("TYPE")) {
			self.valid=false;
			return;
		}

		let type=self.struct["TYPE"];

		// checks for file format magic number
		if (!hexToStr(type).startsWith(FILE_SIGNATURE)) {
			self.valid=false;
			return;
		}

		return type.slice(FILE_SIGNATURE.length);
	}

	// reads scenario description
	function readDesc() {
		if (!self.struct.hasOwnProperty("DESC")) {
			self.valid=false;
			return;
		}

		let desc=hexToStr(self.struct["DESC"]);
		let stop=desc.indexOf("\x00"); // terminates at null char

		return desc.slice(0, stop);
	}

	// gets map dimensions
	function readDim() {
		if (!self.struct.hasOwnProperty("DIM ")) {
			self.valid=false;
			return;
		}

		let dim=self.struct["DIM "];

		if (dim.length!=4) {
			self.valid=false;
			return;
		}

		let x=dim[0];
		let y=dim[2];

		if (x>MAX_WIDTH&&y>MAX_HEIGHT) {
			self.valid=false;
		}

		return [x, y];
	}

	// gets unit map
	function readUnit() {
		if (!self.struct.hasOwnProperty("UNIT")) {
			self.valid=false;
			return;
		}

		let unit=self.struct["UNIT"], unitMap=[];

		for (let i=0; i<unit.length; i+=QWORD) {
			unitMap.push({
				x:        parseNum(unit.slice(i,   i+WORD)),
				y:        parseNum(unit.slice(i+2, i+2+WORD)),
				id:       unit[i+4],
				owner:    unit[i+5],
				property: parseNum(unit.slice(i+6, i+6+WORD))
			});
		}

		return unitMap;
	}
};

Pud.prototype.save=function() {
	let self=this;

	if (!validateMap()) {
		return;
	}

	let sections=new Map([ // order is significant
		["TYPE", saveType()],
		["VER ", convertNum(this.version, WORD)],
		["DESC", saveDesc()],
		["OWNR", this.controller],
		["ERA ", convertNum(this.tileset==SWAMP?WASTELAND:this.tileset, WORD)],
		["ERAX", this.tileset==SWAMP?convertNum(this.tileset, WORD):null],
		["DIM ", convertNum(this.width|this.height<<16, DWORD)],
		["UDTA", convertMap(this.units,        data.schema["UDTA"])],
		["UGRD", convertMap(this.upgrades,     data.schema["UGRD"])],
		["ALOW", convertMap(this.restrictions, data.schema["ALOW"])],
		["SIDE", this.races],
		["SGLD", convertArray(this.startingGold,   WORD)],
		["SLBR", convertArray(this.startingLumber, WORD)],
		["SOIL", convertArray(this.startingOil,    WORD)],
		["AIPL", this.ai],
		["MTXM", convertArray(this.tileMap,        WORD)],
		["SQM ", convertArray(this.movementMap,    WORD)],
		["OILM", convertArray(this.oilMap,         WORD)],
		["REGM", convertArray(this.actionMap,      WORD)],
		["UNIT", saveUnit()]
	]);

	let length=0;

	for (let [key, contents] of sections) {
		if (contents==undefined) {
			continue;
		}

		// only writes restriction data if not using default values
		if (key=="ALOW"&&!this.useAlow) {
			sections.delete(key);
			continue;
		}

		length+=QWORD+contents.length;
	}

	let file=new Uint8Array(length), pos=0;

	for (let [key, contents] of sections) {
		if (contents==undefined) {
			continue;
		}

		for (let i=0; i<key.length; i++, pos++) { // section name
			file[pos]=key.charCodeAt(i);
		}

		let len=convertNum(contents.length, DWORD);

		for (let i=0; i<len.length; i++, pos++) { // section length
			file[pos]=len[i];
		}

		for (let i=0; i<contents.length; i++, pos++) {
			file[pos]=contents[i];
		}
	}

	return new Blob([file], {type: MIME_TYPE});

	function validateMap() {
		if (self.unitMap.length==0) {
			throw "The map is empty. Place one or more units.";
		}

		let players=new Set();
		let start=Array(self.controller.length).fill();

		// determines active players (i.e., players with units placed)
		for (let unit of self.unitMap) {
			players.add(unit.owner);

			// requires start locations for active players
			if (unit.id==HUMAN_START_LOC||unit.id==ORC_START_LOC) {
				start[unit.owner]=true;
			}
		}

		const NEUTRAL=15;
		const NOBODY=3, HUMAN=5;

		for (let player of players) {
			if (player!=NEUTRAL&&start[player]==undefined) {
				throw "Must place a start location for player "+(player+1)+".";
			}
		}

		self.controller=self.controller.map(function(controller, i) {
			if (players.has(i)) {
				if (controller==NOBODY) {
					return HUMAN; // sets nobody to human if player has units
				}
			} else { // sets inactive players to nobody
				return NOBODY;
			}
		});

		return true;
	}

	// converts number to big-endian typed array
	function convertNum(num, size) {
		let arr=new Uint8Array(size);

		return arr.map(function(undefined, i) {
			return (num&(0xff<<i*8))>>i*8;
		});
	}

	// converts array with elements of given size into typed array
	function convertArray(data, size) {
		let arr=new Uint8Array(data.length*size);

		for (let i=0; i<data.length; i++) {
			let num=convertNum(data[i], size);

			for (let j=0; j<num.length; j++) {
				arr[i*size+j]=num[j];
			}
		}

		return arr;
	}

	function convertMap(data, schema) {
		if (data==undefined) {
			return;
		}

		let length=0;

		for (let [key, value] of schema.map) {
			let [len, size, type]=value;
			length+=len*size;
		}

		let arr=new Uint8Array(length), pos=0;

		for (let [key, value] of schema.map) {
			let [len, size, type]=value;
			let contents=null;

			if (type==ARRAY) {
				contents=convertArray(data[key], size);
			} else if (type==BOOLEAN) {
				contents=convertNum(Number(data[key]), size);
			} else if (type==DIMENSIONS) {
				contents=convertDim(data[key]);
			} else if (type==BIT_FIELD) {
				contents=convertBits(data[key]);
			} else if (type==OCTAL) {
				contents=convertOctal(data[key]);
			}

			for (let i=0; i<contents.length; i++, pos++) {
				arr[pos]=contents[i];
			}
		}

		return arr;
	}

	function convertDim(data) {
		let arr=new Uint8Array(DWORD*data.length), pos=0;

		for (let i=0; i<data.length; i++, pos+=DWORD) {
			let x=convertNum(data[i].x, WORD), y=convertNum(data[i].y, WORD);

			arr[pos]  =x[0];
			arr[pos+1]=x[1];
			arr[pos+2]=y[0];
			arr[pos+3]=y[1];
		}

		return arr;
	}

	function convertBits(data) {
		let arr=new Uint8Array(data.length*DWORD), pos=0;

		for (let i=0; i<data.length; i++) {
			let value=0;

			for (let j=0; j<data[i].length; j++) {
				value+=data[i][j]<<j;
			}

			let num=convertNum(value, DWORD);

			for (let j=0; j<num.length; j++, pos++) {
				arr[pos]=num[j];
			}
		}

		return arr;
	}

	function convertOctal(data) {
		let arr=new Uint8Array(data.length);

		return arr.map(function(undefined, i) {
			return data[i][0]*0b001|data[i][1]*0b010|data[i][2]*0b100;
		});
	}

	function saveType() {
		let len=FILE_SIGNATURE.length;
		let arr=new Uint8Array(len+DWORD);

		for (let i=0; i<len; i++) {
			arr[i]=FILE_SIGNATURE.charCodeAt(i);
		}

		for (let i=0; i<self.id.length; i++) {
			arr[i+len]=self.id[i];
		}

		return arr;
	}

	function saveDesc() {
		let arr=new Uint8Array(32);
		self.description=self.description.slice(0, 30);

		for (let i=0; i<self.description.length; i++) {
			arr[i]=self.description.charCodeAt(i);
		}

		return arr;
	}

	function saveUnit() {
		let arr=new Uint8Array(QWORD*self.unitMap.length), pos=0;

		for (let unit of self.unitMap) {
			let x=convertNum(unit.x, WORD), y=convertNum(unit.y, WORD);
			let property=convertNum(unit.property, WORD);

			arr[pos]  =x[0];
			arr[pos+1]=x[1];
			arr[pos+2]=y[0];
			arr[pos+3]=y[1];
			arr[pos+4]=unit.id;
			arr[pos+5]=unit.owner;
			arr[pos+6]=property[0];
			arr[pos+7]=property[1];

			pos+=QWORD;
		}

		return arr;
	}
};

/*
 * Files prototype
 */

function Files(id) {
	this.id=id;
	this.dirs=[];
}

Files.prototype.browse=function() {
	let self=this;
	let xhr=new XMLHttpRequest();

	if (this.dirs.includes("templates")) {
		this.dirs=[];
	}

	xhr.addEventListener("readystatechange", function() {
		if (this.readyState==4&&this.status==200) {
			let dirs=this.response.dirs, files=this.response.files;

			let ul=document.createElement("ul");
			ul.id=self.id;

			if (self.dirs.length>0) { // except root directory
				ul.appendChild(createItem("dir", "[..]",
					function() {
						self.dirs.pop();
						self.browse();
					})
				);
			}

			for (let dir of dirs) {
				ul.appendChild(createItem("dir", "["+dir+"]",
					function() {
						self.dirs.push(dir);
						self.browse();
					})
				);
			}

			for (let file of files) {
				ul.appendChild(createItem("pud", file,
					function() {
						overlays.hide("browser");
						self.load(file, editor.open.bind(editor));
					})
				);
			}

			$("#"+self.id).replaceWith(ul);
		}
	});
	xhr.open("GET", MAPS_DIR+this.dirs.join("/")+"/index.json", true);
	xhr.responseType="json";
	xhr.send();

	function createItem(className, file, callback) {
		let li=document.createElement("li");

		let a=document.createElement("a");
		a.className=className;
		a.textContent=file;
		a.addEventListener("click", callback);
		li.appendChild(a);

		return li;
	}
};

Files.prototype.load=function(filename, callback) {
	let xhr=new XMLHttpRequest();
	let path=this.dirs.join("/")+"/"+filename;

	// remove initial slash from file path if present
	if (path.slice(0, 1)=="/") {
		path=path.slice(1);
	}

	xhr.addEventListener("readystatechange", function() {
		if (this.readyState==4) {
			callback(filename, path, this.status==200?this.response:null);
		}
	});
	xhr.open("GET", MAPS_DIR+path, true);
	xhr.responseType="arraybuffer";
	xhr.send();
};

Files.prototype.loadTemplate=function(tileset, size) {
	this.dirs=["templates", tileset];
	this.load(size+"x"+size+".pud", editor.open.bind(editor));
};