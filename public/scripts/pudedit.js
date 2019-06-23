"use strict";

/*
 * constants
 */

// data sizes
const BYTE=1;
const WORD=2;
const LONG=4;

// file format
const FILE_SIGNATURE="WAR2 MAP\x00\x00\x0a\xff";
const STANDARD_SCENARIO =0x11;
const EXPANSION_SCENARIO=0x13;

// factions
const HUMAN="human";
const ORC="orc";
const NEUTRAL="neutral";

// game mechanics
const MAX_PLAYERS=8;
const TILE_SIZE=32;

// layout/appearance
const MINIMAP_SIZE=200;
const LEFT_MARGIN=270;
const FRAME_COLOR="#fff";
const SELECT_COLOR="#0f0";

// file names and locations
const MAPS_DIR="maps/";

// objects
const editor=new Editor();
const files=new Files("files");

/*
 * initialization
 */

window.addEventListener("load", function() {
	let query=window.location.search.replace(/\?map=(.*)/, "$1");

	if (query=="") {
		files.loadTemplate("forest", 128);
	} else {
		let dirs=query.split("/");
		let filename=decodeURIComponent(dirs.pop());

		files.dirs=dirs;
		files.load(filename, editor.open.bind(editor));
	}

	// mouse buttons
	const LEFT=0;
	const RIGHT=2;

	// event listeners
	// for minimap
	$("frame").addEventListener("mousedown", function(event) {
		if (event.button==LEFT) {
			editor.dragFrame=true;
		}
	});
	$("frame").addEventListener("mouseup", function(event) {
		if (event.button==LEFT) {
			editor.dragFrame=false;
			editor.moveMap(event.clientX, event.clientY);
		}
	});
	$("frame").addEventListener("mousemove", function(event) {
		if (editor.dragFrame) {
			editor.moveMap(event.clientX, event.clientY);
		}
	});
	// for map
	$("select").addEventListener("mousedown", function(event) {
		if (event.button==LEFT) {
			editor.startSelect(event.clientX, event.clientY);
		}
	});
	$("select").addEventListener("mouseup", function(event) {
		if (event.button==LEFT) {
			editor.selectUnits(
				event.clientX, event.clientY,
				event.shiftKey,
				editor.selectMultiple
			);
		} else if (event.button==RIGHT) {
			if (Object.keys(editor.selected).length>0) {
				editor.openSelectionProperties();
				editor.show("selectionProperties");
			}
		}
	});
	$("select").addEventListener("mousemove", function(event) {
		if (editor.dragSelect) {
			editor.drawSelect(event.clientX, event.clientY);
		}
	});
	$("select").addEventListener("contextmenu", function(event) {
		event.preventDefault();
	});
	// for palettes
	$("create").addEventListener("click", function() {
		editor.openCreate();
		editor.show("create");
	});
	$("open").addEventListener("click", function() {
		files.browse();
		editor.show("browser");
	});
	$("save").addEventListener("click", function() {
		if (editor.pud==null) {
			return;
		}

		let a=document.getElementById("download");
		a.download=editor.pud.filename;
		a.href=window.URL.createObjectURL(editor.pud.save());
		a.click();
	});
	$("saveImage").addEventListener("click", function() {
		editor.saveImage();
	});
	$("link").addEventListener("click", function() {
		if (editor.path) {
			let link=window.location.href.split("?")[0];
			link+="?map="+editor.path;

			$("text_link").value=link;
			editor.show("link");
		}
	});
	$("copy").addEventListener("click", function() {
		$(this.value).select();
		document.execCommand("copy");
	});
	$("about").addEventListener("click", function() {
		editor.show("about");
	});
	$("filename").addEventListener("click", function() {
		editor.openMapProperties();
		editor.show("mapProperties");
	});
	// for overlay widgets
	$("select_unitsPalette").addEventListener("input", function() {
		editor.changeUnitPalette();
	});
	$("number_icon").addEventListener("input", function() {
		editor.changeIcon(this, $("icon"), $("select_upgrades"));
	});
	$("select_selection").addEventListener("input", function() {
		editor.fillSelectionProperties();
	});
	$("range_property").addEventListener("input", function() {
		editor.changeResource();
	});
	// for file browser in open overlay
	$("file").addEventListener("input", function(event) {
		let file=event.target.files[0];

		if (file) {
			let reader=new FileReader();
			reader.addEventListener("load", function(event) {
				editor.open(file.name, "", event.target.result);
				editor.hide("browser");
			});
			reader.readAsArrayBuffer(file);
		}
	});

	window.addEventListener("keyup", function(event) {
		let key=event.keyCode;

		if (key==13) { // Enter
			if (Object.keys(editor.selected).length>0) {
				editor.openSelectionProperties();
				editor.show("selectionProperties");
			}
		}

		if (key==27) { // Esc
			editor.closeAll();
		}

		if (key>=48&&key<=56) { // 0-8
			editor.selectPlayer(key==48?15:key-49);
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
	let basic=document.getElementsByClassName("basic");

	for (let element of basic) {
		element.addEventListener("click", function() {
			$(this.value).click();
		});
	}

	// player buttons under minimap
	let players=document.getElementsByClassName("player");

	for (let element of players) {
		element.addEventListener("click", function() {
			editor.selectPlayer(this.value);
		});
	}

	// tool palette tabs
	let tabs=document.getElementsByClassName("tab");

	for (let element of tabs) {
		element.addEventListener("click", function() {
			editor.selectPalette(this.value);
		});
	}

	// layer toggles
	let toggles=document.getElementsByClassName("layer");

	for (let element of toggles) {
		element.addEventListener("click", function() {
			$(this.value).classList.toggle("hidden", !this.checked);
		});
	}

	// property sheet open buttons
	let properties=document.getElementsByClassName("properties");

	for (let element of properties) {
		element.addEventListener("click", function() {
			let fn=this.value.charAt(0).toUpperCase()+this.value.slice(1);
			editor["open"+fn]();
			editor.show(this.value);
		});
	}

	// property sheet select boxes
	let fill=document.getElementsByClassName("fill");

	for (let element of fill) {
		element.addEventListener("input", function() {
			let key=this.id.replace("select_", "");
			let select=$("select_"+key);
			let option=select.options[select.selectedIndex];

			$("legend_"+key).innerHTML=option.label;

			editor.saveWorking(key);
			editor.fillProperties(key);
		});
	}

	// overlay save buttons
	let save=document.getElementsByClassName("save");

	for (let element of save) {
		element.addEventListener("click", function() {
			let fn=this.value.charAt(0).toUpperCase()+this.value.slice(1);
			editor["save"+fn]();
			editor.hide(this.value);
		});
	}

	// overlay close buttons
	let close=document.getElementsByClassName("close");

	for (let element of close) {
		element.addEventListener("click", function() {
			editor.hide(this.value);
		});
	}

	// property sheet revert buttons
	let revert=document.getElementsByClassName("revert");

	for (let element of revert) {
		element.addEventListener("click", function() {
			editor.revertProperties(this.value);
		});
	}
});

function $(id) {
	return document.getElementById(id);
}

/*
 * Editor prototype
 */

function Editor() {
	this.pud=null;
	this.path="";

	// current player
	this.player=0;

	// canvases
	this.tileMap=null;
	this.unitMap=null;
	this.select=null;
	this.miniTileMap=null;
	this.miniUnitMap=null;
	this.frame=null;
	this.tiles=null;

	// box selection
	this.dragSelect=false;
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

	// property sheet working object
	this.index=-1;
	this.working={};
}

Editor.prototype.open=function(filename, path, buffer) {
	window.scrollTo(0, 0);

	this.pud=new Pud();
	this.pud.load(filename, buffer);

	if (!this.pud.valid) {
		this.show("error");
		return;
	}

	this.path=path;
	$("link").disabled=!Boolean(path);

	$("filename").innerHTML=this.pud.filename;

	setSize("tileMap", this.pud.width*TILE_SIZE, this.pud.height*TILE_SIZE);
	setSize("unitMap", this.pud.width*TILE_SIZE, this.pud.height*TILE_SIZE);
	setSize("grid",    this.pud.width*TILE_SIZE, this.pud.height*TILE_SIZE);
	setSize("select",  this.pud.width*TILE_SIZE, this.pud.height*TILE_SIZE);
	setSize("miniUnitMap", MINIMAP_SIZE, MINIMAP_SIZE);
	setSize("miniTileMap", MINIMAP_SIZE, MINIMAP_SIZE);
	setSize("frame",       MINIMAP_SIZE, MINIMAP_SIZE);

	this.tileMap=$("tileMap").getContext("2d");
	this.unitMap=$("unitMap").getContext("2d");
	this.select=$("select").getContext("2d");
	this.miniTileMap=$("miniTileMap").getContext("2d");
	this.miniUnitMap=$("miniUnitMap").getContext("2d");
	this.frame=$("frame").getContext("2d");

	this.pos=$("frame").getBoundingClientRect();
	this.scaleX=MINIMAP_SIZE/$("tileMap").width;
	this.scaleY=MINIMAP_SIZE/$("tileMap").height;
	this.miniTileMap.scale(this.scaleX, this.scaleY);

	this.selectPlayer(this.player);
	this.selectPalette("units");

	// draws tile map and changes unit icons to match tileset
	this.changeTileset(this.pud.tileset);

	function setSize(id, w, h) {
		$(id).width=w;
		$(id).height=h;
	}
};

Editor.prototype.drawTileMap=function() {
	let tiles=data.tilesets[this.pud.tileset];
	let x=0, y=0;

	this.pud.tileMap.forEach(function(tile, i) {
		let w=x*TILE_SIZE, h=y*TILE_SIZE;

		if (tile in tiles) {
			this.tileMap.drawImage(
				this.tiles,
				tiles[tile].x, tiles[tile].y,
				TILE_SIZE, TILE_SIZE,
				w, h,
				TILE_SIZE, TILE_SIZE
			);
			this.miniTileMap.drawImage(
				this.tiles,
				tiles[tile].x, tiles[tile].y,
				TILE_SIZE, TILE_SIZE,
				w, h,
				TILE_SIZE, TILE_SIZE
			);
		}

		if ((i+1)%this.pud.width==0) { // new row
			x=0;
			y++;
		} else {
			x++;
		}
	}, this);

	this.drawFrame();
};

Editor.prototype.drawUnitMap=function() {
	let unitMap=this.unitMap, miniUnitMap=this.miniUnitMap;

	// clears canvas every time or units will stack when tileset changed
	unitMap.clearRect(0, 0, $("unitMap").width, $("unitMap").height);
	miniUnitMap.scale(this.scaleX, this.scaleY);

	this.pud.unitMap.forEach(function(unit) {
		let unitSize=1, img=new Image();

		if (unit.type in this.pud.units.unitSize) {
			unitSize=this.pud.units.unitSize[unit.type];
		}

		let path="units/"+this.getTileset(this.pud.tileset)+"/";

		img.src=path+unit.type.toString().padStart(4, "0")+".png";
		img.addEventListener("load", function() {
			let x=unit.x*TILE_SIZE, y=unit.y*TILE_SIZE;
			let w=unitSize.x*TILE_SIZE, h=unitSize.y*TILE_SIZE;

			drawUnit(unitMap, this, unit, x, y, w, h);
			drawMiniMap(miniUnitMap, unit.owner, x, y, w, h, unit);
		});
	}, this);

	function drawUnit(unitMap, img, unit, x, y, w, h) {
		let sx=0, sy=0, type=unit.type, owner=unit.owner;

		if (type<58) { // units, not buildings
			// centers unit in tile
			x-=(img.width-w)/2;
			y-=(img.width-h)/2;

			w=img.width;
			h=img.width;

			// picks random idle frame
			sy=h*Math.floor(Math.random()*5);
		}

		unitMap.drawImage(img, sx, sy, w, h, x, y, w, h);

		if (owner==0) { // artwork is already in player 1 colors by default
			return;
		}

		if (owner>7) { // neutral players use same colors as player 8
			owner=7;
		}

		let imageData=unitMap.getImageData(x, y, w, h);
		owner=Number.parseInt(owner);

		// changes player colors to match unit owner
		for (let i=0; i<imageData.data.length; i+=4) { // 4 for RGBA
			for (let j=0; j<4; j++) { // 4 colors for each player
				if (
					imageData.data[i]  ==data.colors[0][j].r&&
					imageData.data[i+1]==data.colors[0][j].g&&
					imageData.data[i+2]==data.colors[0][j].b
				) {
					imageData.data[i]  =data.colors[owner][j].r;
					imageData.data[i+1]=data.colors[owner][j].g;
					imageData.data[i+2]=data.colors[owner][j].b;
				}
			}
		}

		unitMap.putImageData(imageData, x, y);
	}

	function drawMiniMap(miniUnitMap, owner, x, y, w, h) {
		if (owner>7) { // neutral players use same color as player 8
			owner=7;
		}

		// uses first player color for minimap squares
		let r=data.colors[owner][0].r.toString(16).padStart(2, "0");
		let g=data.colors[owner][0].g.toString(16).padStart(2, "0");
		let b=data.colors[owner][0].b.toString(16).padStart(2, "0");

		x=Math.floor(x);
		y=Math.floor(y);
		w=Math.ceil(w);
		h=Math.ceil(h);

		miniUnitMap.fillStyle="#"+r+g+b;
		miniUnitMap.fillRect(x, y, w, h);
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
	this.frame.clearRect(0, 0, $("frame").width, $("frame").height);
	this.frame.beginPath();
	this.frame.rect(
		this.x, this.y,
		this.scaleX*(window.innerWidth-LEFT_MARGIN),
		this.scaleY*window.innerHeight
	);
	this.frame.lineWidth=2;
	this.frame.strokeStyle=FRAME_COLOR;
	this.frame.stroke();
};

Editor.prototype.startSelect=function(x, y) {
	this.dragSelect=true;
	this.selectX=window.scrollX+x-LEFT_MARGIN;
	this.selectY=window.scrollY+y;
};

Editor.prototype.drawSelect=function(x, y) {
	this.selectMultiple=true;
	let w=window.scrollX+x-this.selectX-LEFT_MARGIN;
	let h=window.scrollY+y-this.selectY;

	this.select.clearRect(0, 0, $("select").width, $("select").height);
	this.select.beginPath();
	this.select.rect(this.selectX, this.selectY, w, h);
	this.select.lineWidth=1;
	this.select.strokeStyle=SELECT_COLOR;
	this.select.stroke();
};

Editor.prototype.selectUnits=function(x, y, add=false, multiple=false) {
	this.dragSelect=false;
	this.selectMultiple=false;

	if (!add) {
		this.selected={};

		this.select.clearRect(0, 0, $("select").width, $("select").height);
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

	Object.values(this.pud.unitMap).forEach(function(unit, i) {
		if (!this.pud.units.unitSize.hasOwnProperty(unit.type)) {
			return;
		}

		let unitSize=this.pud.units.unitSize[unit.type];
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
			this.select.beginPath();
			this.select.rect(
				gx1*TILE_SIZE, gy1*TILE_SIZE,
				unitSize.x*TILE_SIZE, unitSize.y*TILE_SIZE
			);
			this.select.stroke();

			this.selected[i]=unit;
		}
	}, this);
};

Editor.prototype.openCreate=function() {
	this.setRadio("radio_size",    this.pud.width);
	this.setRadio("radio_terrain", this.pud.tileset);
};

Editor.prototype.openMapProperties=function() {
	this.setRadio("radio_tileset", this.pud.tileset);

	$("text_filename").value   =this.pud.filename;
	$("text_width").value      =this.pud.width;
	$("text_height").value     =this.pud.height;
	$("text_description").value=this.pud.description;
};

Editor.prototype.openPlayerProperties=function() {
	let ais=document.getElementsByClassName("ai");

	for (let element of ais) {
		for (let [id, name] of data.ai) {
			let option=document.createElement("option");
			option.value=id;
			option.textContent=name;
			element.appendChild(option);
		}
	}

	for (let i=0; i<MAX_PLAYERS; i++) {
		this.setRadio("radio_race"+i,         this.pud.races[i]);
		this.setSelect("select_controller"+i, this.pud.controller[i]);
		this.setSelect("select_ai"+i,         this.pud.ai[i]);
	}
};

Editor.prototype.openStartingConditions=function() {
	for (let i=0; i<MAX_PLAYERS; i++) {
		$("number_startingGold"+i).value  =this.pud.startingGold[i];
		$("number_startingLumber"+i).value=this.pud.startingLumber[i];
		$("number_startingOil"+i).value   =this.pud.startingOil[i];
	}
};

Editor.prototype.openUnitProperties=function() {
	let units={};

	Object.keys(data.units).forEach(function(group) {
		Object.keys(data.units[group]).forEach(function(type) {
			Object.keys(data.units[group][type]).forEach(function(race) {
				if (!units.hasOwnProperty(race)) {
					units[race]=[];
				}

				let unit=data.units[group][type][race];

				if (unit.skip) {
					return;
				}

				units[race].push(unit);
			});
		});
	});

	Object.keys(units).forEach(function(race) {
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

		$("select_units").appendChild(optgroup);
	});

	$("checkbox_units").checked=this.pud.defaultUnits;

	$("select_units").selectedIndex=0;
	this.fillProperties("units");
};

Editor.prototype.openUpgradeProperties=function() {
	Object.keys(data.upgrades).forEach(function(race) {
		let optgroup=document.createElement("optgroup");
		let label=race.charAt(0).toUpperCase()+race.slice(1);
		optgroup.setAttribute("label", label);

		for (let [id, name] of data.upgrades[race]) {
			let option=document.createElement("option");
			option.value=id;
			option.textContent=name;
			optgroup.appendChild(option);
		}

		$("select_upgrades").appendChild(optgroup);
	});

	$("checkbox_upgrades").checked=this.pud.defaultUpgrades;

	$("select_upgrades").selectedIndex=0;
	this.fillProperties("upgrades");
};

Editor.prototype.openSelectionProperties=function() {
	let select=$("select_selection"), units={};

	while (select.lastChild) { // removes all children
		select.removeChild(select.lastChild);
	}

	Object.keys(data.units).forEach(function(group) {
		Object.keys(data.units[group]).forEach(function(type) {
			Object.keys(data.units[group][type]).forEach(function(race) {
				let unit=data.units[group][type][race];
				units[unit.id]=unit.name;
			});
		});
	});

	Object.entries(this.selected).forEach(function([key, value]) {
		let item=document.createElement("option");
		item.value=key;
		item.textContent=units[value.type]||"Unknown";

		select.appendChild(item);
	});

	select.selectedIndex=0;
	this.fillSelectionProperties();
	this.changeResource();
};

Editor.prototype.selectPlayer=function(player) {
	let players=document.getElementsByClassName("player");

	for (let element of players) {
		element.classList.toggle("current", element.value==player);
	}

	player=Number.parseInt(player);

	// changes owner of selected units
	Object.values(this.selected).forEach(function(unit) {
		// does not change ownership of gold mines or oil patches
		if (unit.type!=92&&unit.type!=93) {
			unit.owner=player;
		}
	}, this);

	this.player=player;
	this.changeUnitPalette();
};

Editor.prototype.selectPalette=function(palette) {
	let palettes=document.getElementsByClassName("palette");

	for (let element of palettes) {
		element.classList.toggle("open", element.id==palette);
	}

	let tabs=document.getElementsByClassName("tab");

	for (let element of tabs) {
		element.classList.toggle("current", element.value==palette);
	}
};

Editor.prototype.clear=function(element) {
	if (element==null) {
		return;
	}

	while (element.lastChild) { // removes all children
		element.removeChild(element.lastChild);
	}
};

Editor.prototype.changeTileset=function(tileset) {
	this.pud.tileset=tileset;

	this.tiles=new Image();
	this.tiles.src="tilesets/"+this.getTileset(tileset)+".png";
	this.tiles.addEventListener("load", this.drawTileMap.bind(this));

	this.drawUnitMap();
	this.changeTerrainPalette();
	this.changeUnitPalette();
};

Editor.prototype.changeTerrainPalette=function() {
	let icons=document.getElementsByClassName("terrain");

	for (let element of icons) {
		let icon=element.value+".png";

		let img=new Image();
		img.src="icons/terrain/"+this.getTileset(this.pud.tileset)+"/"+icon;
		img.addEventListener("load", function() {
			element.getElementsByTagName("img")[0].src=this.src;
		});
	}
};

Editor.prototype.changeUnitPalette=function() {
	let group=$("select_unitsPalette").value;

	if (!data.units.hasOwnProperty(group)) {
		return;
	}

	this.clear($("unitsPalette"));

	let ul=document.createElement("ul");
	ul.id="unitsPalette";

	for (let type in data.units[group]) {
		let race=this.getRace();

		if (!data.units[group][type].hasOwnProperty(race)) {
			race=NEUTRAL;
		}

		let unit=data.units[group][type][race];

		let li=document.createElement("li");
		let button=document.createElement("button");
		let img=document.createElement("img");

		let icon=unit.icon.toString().padStart(4, "0")+".png";

		button.className="unit";
		button.value=unit.icon;

		img.src="icons/"+this.getTileset(this.pud.tileset)+"/"+icon;
		img.setAttribute("alt", "["+unit.name+"]");
		img.setAttribute("title", unit.name);

		button.appendChild(img);
		li.appendChild(button);
		ul.appendChild(li);
	}

	$("unitsPalette").replaceWith(ul);
};

Editor.prototype.fillSelectionProperties=function() {
	let select=$("select_selection");
	let option=select.options[select.selectedIndex], index=option.value;

	$("legend_selection").innerHTML=option.label;

	this.saveWorking("unitMap");

	let unit=this.selected[index];
	let inputs=document.getElementsByClassName("unitMap"), value="";

	for (let element of inputs) {
		let [type, id]=element.id.split(/_/);

		if (this.selected.hasOwnProperty(index)) {
			if (this.selected[index].hasOwnProperty(id)) {
				value=this.selected[index][id];
			}
		}

		if (this.working.hasOwnProperty(index)) {
			if (this.working[index].hasOwnProperty(id)) {
				value=this.working[index][id];
			}
		}

		$(element.id).value=value;
	}

	if (unit.type==92||unit.type==93) { // gold mine or oil patch
		$("row_resource").classList.remove("hidden");
		$("range_property").disabled=false;
	} else {
		$("row_resource").classList.add("hidden");
		$("range_property").disabled=true;
		this.changeResource();
	}

	if (unit.type<58) { // units, not buildings
		$("row_ai").classList.remove("hidden");
		$("select_property").disabled=false;
	} else {
		$("row_ai").classList.add("hidden");
		$("select_property").disabled=true;
	}

	this.index=index;
};

Editor.prototype.saveCreate=function() {
	let tileset=this.saveRadio("radio_terrain");
	let size=this.saveRadio("radio_size");

	files.loadTemplate(this.getTileset(tileset), size);
};

Editor.prototype.saveMapProperties=function() {
	this.pud.filename=$("text_filename").value;
	this.pud.description=$("text_description").value;

	let tileset=this.saveRadio("radio_tileset");

	if (this.pud.tileset!=tileset){
		this.changeTileset(tileset);
	}

	$("filename").textContent=this.pud.filename;
};

Editor.prototype.savePlayerProperties=function() {
	for (let i=0; i<MAX_PLAYERS; i++) {
		this.pud.races[i]     =this.saveRadio("radio_race"+i);
		this.pud.controller[i]=this.saveSelect("select_controller"+i);
		this.pud.ai[i]        =this.saveSelect("select_ai"+i);
	}

	this.changeUnitPalette();
};

Editor.prototype.saveStartingConditions=function() {
	for (let i=0; i<MAX_PLAYERS; i++) {
		this.pud.startingGold[i]  =this.saveNumber("number_startingGold"+i);
		this.pud.startingLumber[i]=this.saveNumber("number_startingLumber"+i);
		this.pud.startingOil[i]   =this.saveNumber("number_startingOil"+i);
	}
};

Editor.prototype.saveUnitProperties=function() {
	this.saveWorking("units");
	this.mergeWorking("units");
};

Editor.prototype.saveUpgradeProperties=function() {
	this.saveWorking("upgrades");
	this.mergeWorking("upgrades");
};

Editor.prototype.saveSelectionProperties=function() {
	this.saveWorking("unitMap");

	Object.keys(this.working).forEach(function(index) {
		Object.keys(this.working[index]).forEach(function(property) {
			if (!this.pud.unitMap.hasOwnProperty(index)) {
				return;
			}

			if (!this.pud.unitMap[index].hasOwnProperty(property)) {
				return;
			}

			this.pud.unitMap[index][property]=this.working[index][property];
		}, this);
	}, this);
};

Editor.prototype.saveWorking=function(key) {
	if (this.index<0) {
		return;
	}

	let inputs=document.getElementsByClassName(key);
	this.working[this.index]=Array.from(inputs).reduce(function(obj, element) {
		if (!element.disabled) {
			let [type, id, sub]=element.id.split(/_/g);

			if (sub==undefined) {
				obj[id]=Number.parseInt(element.value);
			} else {
				if (!obj.hasOwnProperty(id)) {
					obj[id]={};
				}

				obj[id][sub]=Number.parseInt(element.value);
			}
		}

		return obj;
	}, {});
};

Editor.prototype.mergeWorking=function(key) {
	if (!this.pud.hasOwnProperty(key)) {
		return;
	}

	Object.keys(this.working).forEach(function(index) {
		Object.keys(this.working[index]).forEach(function(property) {
			if (!this.pud[key].hasOwnProperty(property)) {
				return;
			}

			if (!this.pud[key][property].hasOwnProperty(index)) {
				return;
			}

			this.pud[key][property][index]=this.working[index][property];
		}, this);
	}, this);
};

Editor.prototype.resetWorking=function() {
	this.index=-1;
	this.working={};
};

Editor.prototype.fillProperties=function(key) {
	if (!this.pud.hasOwnProperty(key)) {
		return;
	}

	let inputs=document.getElementsByClassName(key), value="";
	let index=$("select_"+key).value;

	for (let element of inputs) {
		let [type, id, sub]=element.id.split(/_/);

		if (this.pud[key].hasOwnProperty(id)) {
			if (this.pud[key][id].hasOwnProperty(index)) {
				if (sub&&this.pud[key][id][index].hasOwnProperty(sub)) {
					value=this.pud[key][id][index][sub];
				}

				value=this.pud[key][id][index];
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
					$(element.id).value=value[property];
				}
			}
		} else {
			$(element.id).value=value;
		}
	}

	if (key=="units") {
		$("number_rmbAction").disabled=index>=58; // units, not buildings
	}

	if (key=="upgrades") {
		this.changeIcon($("number_icon"), $("icon"), $("select_upgrades"));
	}

	this.index=index;
};

Editor.prototype.revertProperties=function(key) {
	let index=$("select_"+key).value;
	delete this.working[index];
	this.fillProperties(key);
};

Editor.prototype.getRace=function() {
	if (this.player in this.pud.races) {
		return this.pud.races[this.player]?ORC:HUMAN;
	}
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

Editor.prototype.changeIcon=function(input, img, select) {
	if (input.value<0) { // lower boundary
		input.value=0;
	}

	if (input.value>195) { // upper boundary
		input.value=195;
	}

	let icon=input.value.padStart(4, "0");
	img.src="icons/"+this.getTileset(this.pud.tileset)+"/"+icon+".png";
};

Editor.prototype.changeResource=function() {
	$("resource").textContent=$("range_property").value*2500;
};

Editor.prototype.setRadio=function(name, compare) {
	let radios=document.getElementsByName(name);

	for (let element of radios) {
		element.checked=element.value==compare;
	}
};

Editor.prototype.setSelect=function(id, value) {
	let select=$(id), options=select.options;

	for (let i in options) {
		if (options[i].value==value) {
			select.selectedIndex=i;
		}
	}
};

Editor.prototype.saveNumber=function(id, size) {
	let max=1<<(8*size)-1, num=Number.parseInt($(id).value);

	if (num<0) {
		return 0;
	}

	if (num>max) {
		return max;
	}

	return num;
};

Editor.prototype.saveRadio=function(name) {
	let radios=document.getElementsByName(name);

	for (let element of radios) {
		if (element.checked) {
			return Number.parseInt(element.value);
		}
	}
};

Editor.prototype.saveSelect=function(id) {
	return $(id).value;
};

Editor.prototype.saveImage=function() {
	let canvas=document.createElement("canvas");
	canvas.width =$("tileMap").width;
	canvas.height=$("tileMap").height;

	let context=canvas.getContext("2d");
	// composites all layers into a single image
	context.drawImage($("tileMap"), 0, 0, canvas.width, canvas.height);
	context.drawImage($("unitMap"), 0, 0, canvas.width, canvas.height);
	context.drawImage($("grid"), 0, 0, canvas.width, canvas.height);

	let filename=this.pud.filename.replace(/\.pud$/, ".png");

	canvas.toBlob(function(blob) {
		let a=document.getElementById("download");
		a.download=filename;
		a.href=window.URL.createObjectURL(blob);
		a.click();
	}, "image/png");
};

Editor.prototype.show=function(id) {
	this.closeAll();
	$("overlay_"+id).classList.add("open");
};

Editor.prototype.hide=function(id) {
	this.resetWorking();
	$("overlay_"+id).classList.remove("open");
};

Editor.prototype.closeAll=function() {
	let overlays=document.getElementsByClassName("overlay");

	Array.from(overlays).forEach(function(overlay) {
		overlay.classList.remove("open");
	});
};

/*
 * Pud prototype
 */

function Pud(filename="", struct={}) {
	this.filename=filename;
	this.struct=struct;

	this.valid=true;

	this.id="";
	this.version=STANDARD_SCENARIO;
	this.description="";
	this.width=0;
	this.height=0;
	this.tileset=0;

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

	this.defaultUnits=true;
	this.defaultUpgrades=true;
	this.units=[];
	this.upgrades=[];
	this.restrictions=[];
}

Pud.prototype.load=function(filename, buffer) {
	let pos=0;

	while (pos<buffer.byteLength) {
		try {
			let section=this.hexToStr(new Uint8Array(buffer, pos, LONG));
			let length=new DataView(buffer, pos+4, LONG).getInt32(0, true);

			this.struct[section]=new Uint8Array(buffer, pos+8, length);
			pos+=length+8;
		} catch (err) {
			console.error(err);
			break;
		}
	}

	this.filename=filename;

	this.readType();
	this.readVer();
	this.readDesc();
	this.readOwnr();
	this.readEra();
	this.readDim();
	this.readUdta();
	this.readAlow();
	this.readUgrd();
	this.readSide();
	this.readAipl();
	this.readUnit();

	let self=this;

	this.startingGold  =readSection("SGLD", WORD);
	this.startingLumber=readSection("SLBR", WORD);
	this.startingOil   =readSection("SOIL", WORD);

	this.tileMap    =readSection("MTXM", WORD);
	this.movementMap=readSection("SQM ", WORD);
	this.oilMap     =readSection("OILM", WORD); // unused
	this.actionMap  =readSection("REGM", WORD);

	function readSection(section, size) {
		if (!self.struct.hasOwnProperty(section)) {
			self.valid=false;
			return;
		}

		return self.getArray(self.struct[section], size);
	}
};

Pud.prototype.save=function() {
	let self=this;
	let sections={
		"TYPE": saveType(),
		"VER ": saveVer(),
		"DESC": saveDesc(),
		"OWNR": this.controller,
		"ERA ": saveEra(STANDARD_SCENARIO),
		"ERAX": saveEra(EXPANSION_SCENARIO)
	};
/*	saveDim();
	saveUdta();
	saveAlow();
	saveUgrd();
	saveSide();
	saveAipl();
	saveUnit();

	this.startingGold  =saveSection("SGLD", WORD);
	this.startingLumber=saveSection("SLBR", WORD);
	this.startingOil   =saveSection("SOIL", WORD);

	this.tileMap    =saveSection("MTXM", WORD);
	this.movementMap=saveSection("SQM ", WORD);
	this.actionMap  =saveSection("REGM", WORD);*/

	let length=Object.values(sections).reduce(function(length, contents) {
		if (contents==undefined) {
			return length;
		}

		return length+2*LONG+contents.length;
	}, 0);

	let file=new Uint8Array(length), pos=0;

	Object.entries(sections).forEach(function([section, contents]) {
		if (contents==undefined) {
			return;
		}

		for (let i=0; i<LONG; i++, pos++) { // section name
			file[pos]=section.charCodeAt(i);
		}

		for (let i=0; i<LONG; i++, pos++) { // section length
			file[pos]=contents.length&0xff<<i*8;
		}

		for (let i=0; i<contents.length; i++, pos++) {
			file[pos]=contents[i];
		}
	});

	return new Blob([file], {type: "application/x-warcraft2-scenario"});

	function saveType() {
		let len=FILE_SIGNATURE.length;
		let arr=new Uint8Array(len+LONG);

		for (let i=0; i<len; i++) {
			arr[i]=FILE_SIGNATURE.charCodeAt(i);
		}

		for (let i=0; i<self.id.length; i++) {
			arr[i+len]=self.id[i];
		}

		return arr;
	}

	function saveVer() {
		return self.convertNum(self.version, WORD);
	}

	function saveDesc() {
		let arr=new Uint8Array(32);
		self.description=self.description.slice(0, 30);

		for (let i=0; i<self.description.length; i++) {
			arr[i]=self.description.charCodeAt(i);
		}

		return arr;
	}

	function saveEra(version) {
		if (self.version!=version) {
			return;
		}

		return self.convertNum(self.tileset, WORD);
	}
};

// converts hex to ASCII
Pud.prototype.hexToStr=function(arr) {
	return arr.reduce(function(str, hex) {
		return str+String.fromCharCode(hex);
	}, "");
};

// parses typed array to little-endian number
Pud.prototype.parseNum=function(arr) {
	return arr.reduce(function(num, hex, i) {
		return num+(hex<<i*8);
	}, 0);
};

// converts number to big-endian typed array
Pud.prototype.convertNum=function(num, size) {
	if (size==WORD) {
		num=(num&0xff)<<8|(num>>8)&0xff;
	}

	if (size==LONG) {
		num=(num&0xff<<24)|(num&0xff00)<<8|(num>>8)&0xff00|(num>>24)&0xff;
	}

	let arr=new Uint8Array(size);

	for (let i=0; i<arr.length; i++) {
		arr[i]=num&0xff<<i*8;
	}

	return arr;
};

// breaks array buffer into array with elements of given size
Pud.prototype.getArray=function(data, size) {
	let arr=[];

	for (let i=0; i<data.length; i+=size) {
		arr.push(this.parseNum(data.slice(i, i+size)));
	}

	return arr;
};

// breaks array buffer into named chunks containing arrays of given size
Pud.prototype.getMap=function(arr, addr, schema) {
	let obj={};

	for (let [key, value] of schema) {
		let [len, size]=value;
		obj[key]=arr.slice(addr, addr+len*size);
		addr+=len*size;
	}

	return obj;
};

// identifies as PUD file and gets unique map ID
Pud.prototype.readType=function() {
	if (this.struct["TYPE"]==undefined) {
		this.valid=false;
		return;
	}

	let type=this.struct["TYPE"];

	// checks for file format magic number
	if (!this.hexToStr(type).startsWith(FILE_SIGNATURE)) {
		this.valid=false;
		return;
	}

	this.id=type.slice(FILE_SIGNATURE.length);

	if (this.id.length!=LONG) {
		this.valid=false;
	}
};

// determines classic or expansion
Pud.prototype.readVer=function() {
	if (this.struct["VER "]==undefined) {
		this.valid=false;
		return;
	}

	this.expansion=this.parseNum(this.struct["VER "]);

	if (this.expansion!=STANDARD_SCENARIO&&this.expansion!=EXPANSION_SCENARIO) {
		this.valid=false;
	}
};

// reads scenario description
Pud.prototype.readDesc=function() {
	if (this.struct["DESC"]==undefined) {
		this.valid=false;
		return;
	}

	let desc=this.hexToStr(this.struct["DESC"]);
	let stop=desc.indexOf("\x00"); // terminates at null char
	this.description=desc.slice(0, stop);
};

// identifies controller of each player
Pud.prototype.readOwnr=function() {
	if (this.struct["OWNR"]==undefined) {
		this.valid=false;
		return;
	}

	this.controller=this.struct["OWNR"].map(function(controller) {
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
};

// gets tileset
Pud.prototype.readEra=function() {
	if (this.struct["ERAX"]==undefined&&this.struct["ERA "]==undefined) {
		this.valid=false;
		return;
	}

	let era=this.parseNum(this.struct["ERAX"]||this.struct["ERA "]);

	if (era>0xff) {
		this.valid=false;
		return;
	}

	if (era>=0x04) { // forest (default)
		this.tileset=0x00;
	} else {
		this.tileset=era;
	}
};

// gets map dimensions
Pud.prototype.readDim=function() {
	if (this.struct["DIM "]==undefined) {
		this.valid=false;
		return;
	}

	let dim=this.struct["DIM "];

	if (dim.length!=4) {
		this.valid=false;
		return;
	}

	const MAX_WIDTH=128, MAX_HEIGHT=128;

	let x=Number.parseInt(dim.slice(0, BYTE));
	let y=Number.parseInt(dim.slice(2, 2+BYTE));

	if (x<=MAX_WIDTH&&y<=MAX_HEIGHT) {
		this.width=x;
		this.height=y;
	}
};

// reads unit data
Pud.prototype.readUdta=function() {
	if (this.struct["UDTA"]==undefined) {
		this.valid=false;
		return;
	}

	let udta=this.getMap(this.struct["UDTA"], 1236, new Map([
		["defaultUnits",      [1,   WORD]],
		["sight",             [110, LONG]],
		["hp",                [110, WORD]],
		["magic",             [110, BYTE]],
		["buildTime",         [110, BYTE]],
		["unitGold",          [110, BYTE]],
		["unitLumber",        [110, BYTE]],
		["unitOil",           [110, BYTE]],
		["unitSize",          [110, LONG]],
		["boxSize",           [110, LONG]],
		["range",             [110, BYTE]],
		["reactComputer",     [110, BYTE]],
		["reactHuman",        [110, BYTE]],
		["armor",             [110, BYTE]],
		["selectable",        [110, BYTE]],
		["priority",          [110, BYTE]],
		["basicDamage",       [110, BYTE]],
		["piercingDamage",    [110, BYTE]],
		["weaponsUpgradable", [110, BYTE]],
		["armorUpgradable",   [110, BYTE]],
		["missile",           [110, BYTE]],
		["type",              [110, BYTE]],
		["decayRate",         [110, BYTE]],
		["annoyFactor",       [110, BYTE]],
		["rmbAction",         [58,  BYTE]],
		["points",            [110, WORD]],
		["canTarget",         [110, BYTE]],
		["flags",             [110, LONG]]
	]));

	udta.sight   =this.getArray(udta.sight,  LONG);
	udta.hp      =this.getArray(udta.hp,     WORD);
	udta.points  =this.getArray(udta.points, WORD);
	udta.flags   =this.getArray(udta.flags,  LONG);

	udta.unitSize=parseDim(udta.unitSize);
	udta.boxSize =parseDim(udta.boxSize);

	this.defaultUnits=Boolean(udta.defaultUnits);
	this.units=udta;

	function parseDim(data) {
		let dim=[];

		for (let i=0; i<data.length; i+=4) {
			dim.push({
				x: Number.parseInt(data.slice(i, i+WORD)),
				y: Number.parseInt(data.slice(i+2, i+2+WORD))
			});
		}

		return dim;
	}
};

// reads unit/ability/upgrade restrictions
Pud.prototype.readAlow=function() {
	if (this.struct["ALOW"]==undefined) {
		return; // optional section
	}

	let alow=this.getMap(this.struct["ALOW"], 0, new Map([
		["units",               [16, LONG]],
		["spellsResearched",    [16, LONG]],
		["spells",              [16, LONG]],
		["spellsResearching",   [16, LONG]],
		["upgrades",            [16, LONG]],
		["upgradesResearching", [16, LONG]]
	]));

	alow.units              =this.getArray(alow.units,               LONG);
	alow.spellsResearched   =this.getArray(alow.spellsResearched,    LONG);
	alow.spells             =this.getArray(alow.spells,              LONG);
	alow.spellsResearching  =this.getArray(alow.spellsResearching,   LONG);
	alow.upgrades           =this.getArray(alow.upgrades,            LONG);
	alow.upgradesResearching=this.getArray(alow.upgradesResearching, LONG);

	alow.units              =readBits(alow.units);
	alow.spellsResearched   =readBits(alow.spellsResearched);
	alow.spells             =readBits(alow.spells);
	alow.spellsResearching  =readBits(alow.spellsResearching);
	alow.upgrades           =readBits(alow.upgrades);
	alow.upgradesResearching=readBits(alow.upgradesResearching);

	this.restrictions=alow;

	function readBits(arr) {
		for (let i=0; i<arr.length; i++) {
			let sub=[];

			for (let j=0; j<32; j++) {
				sub.push(Boolean(arr[i]&(1<<j)));
			}

			arr[i]=sub;
		}

		return arr;
	}
};

// reads upgrade data
Pud.prototype.readUgrd=function() {
	if (this.struct["UGRD"]==undefined) {
		this.valid=false;
		return;
	}

	let ugrd=this.getMap(this.struct["UGRD"], 0, new Map([
		["defaultUpgrades", [1,  WORD]],
		["upgradeTime",     [52, BYTE]],
		["upgradeGold",     [52, WORD]],
		["upgradeLumber",   [52, WORD]],
		["upgradeOil",      [52, WORD]],
		["icon",            [52, WORD]],
		["group",           [52, WORD]],
		["effect",          [52, LONG]]
	]));

	ugrd.upgradeGold  =this.getArray(ugrd.upgradeGold,   WORD);
	ugrd.upgradeLumber=this.getArray(ugrd.upgradeLumber, WORD);
	ugrd.upgradeOil   =this.getArray(ugrd.upgradeOil,    WORD);
	ugrd.icon         =this.getArray(ugrd.icon,          WORD);
	ugrd.group        =this.getArray(ugrd.group,         WORD);
	ugrd.effect       =this.getArray(ugrd.effect,        LONG);

	this.defaultUpgrades=Boolean(ugrd.defaultUpgrades);
	this.upgrades=ugrd;
};

// identifies race of each player
Pud.prototype.readSide=function() {
	if (this.struct["SIDE"]==undefined) {
		this.valid=false;
		return;
	}

	this.races=this.struct["SIDE"].map(function(race) {
		if (race>0xff) {
			this.valid=false;
		}

		if (race>=0x03) { // neutral
			return 0x02;
		}

		return race;
	}, this);
};

// gets AI script of each player
Pud.prototype.readAipl=function() {
	if (this.struct["AIPL"]==undefined) {
		this.valid=false;
		return;
	}

	this.ai=this.struct["AIPL"];
	this.ai.forEach(function(ai) {
		if (ai>0x52) {
			this.valid=false;
		}
	}, this);
};

// gets unit map
Pud.prototype.readUnit=function() {
	if (this.struct["UNIT"]==undefined) {
		this.valid=false;
		return;
	}

	const size=8;
	let unit=this.struct["UNIT"], unitMap=[];

	for (let i=0; i<unit.length; i+=size) {
		unitMap.push({
			x: this.parseNum(unit.slice(i, i+WORD)),
			y: this.parseNum(unit.slice(i+2, i+2+WORD)),
			type: unit[i+4],
			owner: unit[i+5],
			property: this.parseNum(unit.slice(i+6, i+6+WORD))
		});
	}

	this.unitMap=unitMap;
};

/*
 * Files prototype
 */

function Files(id) {
	this.id=id;
	this.dirs=[];
}

Files.prototype.browse=function() {
	let xhr=new XMLHttpRequest();
	let self=this;

	if (this.dirs.includes("templates")) {
		this.dirs=[];
	}

	xhr.addEventListener("readystatechange", function() {
		if (this.readyState==4&&this.status==200) {
			let dirs=this.response.dirs, files=this.response.files;

			let ul=document.createElement("ul");
			ul.id=self.id;

			if (self.dirs.length>0) { // except root directory
				ul.appendChild(self.createItem("dir", "[..]",
					function() {
						self.dirs.pop();
						self.browse();
					})
				);
			}

			for (let dir of dirs) {
				ul.appendChild(self.createItem("dir", "["+dir+"]",
					function() {
						self.dirs.push(dir);
						self.browse();
					})
				);
			}

			for (let file of files) {
				ul.appendChild(self.createItem("pud", file,
					function() {
						editor.hide("browser");
						self.load(file, editor.open.bind(editor));
					})
				);
			}

			$(self.id).replaceWith(ul);
		}
	});
	xhr.open("GET", MAPS_DIR+this.dirs.join("/")+"/index.json", true);
	xhr.responseType="json";
	xhr.send();
};

Files.prototype.load=function(filename, callback) {
	let xhr=new XMLHttpRequest();
	let path=this.dirs.join("/")+"/"+filename;

	// remove initial slash from file path if present
	if (path.slice(0, 1)=="/") {
		path=path.slice(1);
	}

	xhr.addEventListener("readystatechange", function() {
		if (this.readyState==4&&this.status==200) {
			callback(filename, path, this.response);
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

Files.prototype.createItem=function(className, file, callback) {
	let li=document.createElement("li");

	let a=document.createElement("a");
	a.className=className;
	a.innerHTML=file;
	a.addEventListener("click", callback);
	li.appendChild(a);

	return li;
};