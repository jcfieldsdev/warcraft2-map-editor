"use strict";

/*
 * constants
 */

// file format
const FILE_SIGNATURE="WAR2 MAP\x00\x00\x0a\xff";
const STANDARD =0x11;
const EXPANSION=0x13;

// factions
const HUMAN  ="human";
const ORC    ="orc";
const NEUTRAL="neutral";

// game mechanics
const MAX_PLAYERS=8;
const TILE_SIZE  =32;
const MAX_WIDTH  =128;
const MAX_HEIGHT =128

// layout/appearance
const MINIMAP_SIZE=200;
const LEFT_MARGIN =270;
const FRAME_COLOR ="#fff";
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
			editor.startSelect(event.clientX, event.clientY);
		}
	});
	$("#select").addEventListener("mouseup", function(event) {
		if (event.button==LEFT) {
			editor.selectUnits(
				event.clientX, event.clientY,
				event.shiftKey,
				editor.selectMultiple
			);
		} else if (event.button==RIGHT) {
			if (Object.keys(editor.selected).length>0) {
				editor.openSelection();
				editor.show("unitMap");
			}
		}
	});
	$("#select").addEventListener("mousemove", function(event) {
		if (editor.dragSelect) {
			editor.drawSelect(event.clientX, event.clientY);
		}
	});
	$("#select").addEventListener("contextmenu", function(event) {
		event.preventDefault();
	});
	// for palettes
	$("#create").addEventListener("click", function() {
		editor.openCreate();
		editor.show("create");
	});
	$("#open").addEventListener("click", function() {
		files.browse();
		editor.show("browser");
	});
	$("#save").addEventListener("click", function() {
		if (editor.pud==null) {
			return;
		}

		let a=$("#download");
		a.download=editor.pud.filename;
		a.href=window.URL.createObjectURL(editor.pud.save());
		a.click();
	});
	$("#saveImage").addEventListener("click", function() {
		editor.saveImage();
	});
	$("#link").addEventListener("click", function() {
		if (editor.path) {
			let link=window.location.href.split("?")[0];
			link+="?map="+editor.path;

			$("#text_link").value=link;
			editor.show("link");
		}
	});
	$("#copy").addEventListener("click", function() {
		$("#"+this.value).select();
		document.execCommand("copy");
	});
	$("#about").addEventListener("click", function() {
		editor.show("about");
	});
	$("#filename").addEventListener("click", function() {
		editor.openMapProperties();
		editor.show("mapProperties");
	});
	// for overlay widgets
	$("#select_unitsPalette").addEventListener("input", function() {
		editor.changeUnitPalette();
	});
	$("#number_icon").addEventListener("input", function() {
		editor.changeIcon(this, $("#icon"), $("#select_upgrades"));
	});
	$("#select_selection").addEventListener("input", function() {
		editor.fillSelectionProperties();
	});
	$("#range_property").addEventListener("input", function() {
		editor.changeResource();
	});
	// for file browser in open overlay
	$("#file").addEventListener("input", function(event) {
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
				editor.openSelection();
				editor.show("unitMap");
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
	$$(".basic").forEach(function(element) {
		element.addEventListener("click", function() {
			$("#"+this.value).click();
		});
	});

	// player buttons under minimap
	$$(".player").forEach(function(element) {
		element.addEventListener("click", function() {
			editor.selectPlayer(this.value);
		});
	});

	// tool palette tabs
	$$(".tab").forEach(function(element) {
		element.addEventListener("click", function() {
			editor.selectPalette(this.value);
		});
	});

	// layer toggles
	$$(".layer").forEach(function(element) {
		element.addEventListener("click", function() {
			$("#"+this.value).classList.toggle("hidden", !this.checked);
		});
	});

	// property sheet open buttons
	$$(".properties").forEach(function(element) {
		element.addEventListener("click", function() {
			let fn=this.value.charAt(0).toUpperCase()+this.value.slice(1);
			editor["open"+fn]();
			editor.show(this.value);
		});
	});

	// property sheet select boxes
	$$(".fill").forEach(function(element) {
		element.addEventListener("input", function() {
			let key=this.id.replace("select_", "");
			let select=$("#select_"+key);
			let option=select.options[select.selectedIndex];

			$("#legend_"+key).innerHTML=option.label;

			editor.saveWorking(key);
			editor.fillProperties(key);
		});
	});

	// overlay save buttons
	$$(".save").forEach(function(element) {
		element.addEventListener("click", function() {
			editor.saveProperties(this.value);
			editor.hide(this.value);
		});
	});

	// overlay close buttons
	$$(".close").forEach(function(element) {
		element.addEventListener("click", function() {
			editor.hide(this.value);
		});
	});

	// property sheet "Use default values" buttons
	$$(".defaults").forEach(function(element) {
		element.addEventListener("click", function() {
			$("#select_"+this.value).disabled=this.checked;
		});
	});

	// property sheet "Revert" buttons
	$$(".revert").forEach(function(element) {
		element.addEventListener("click", function() {
			editor.revertProperties(this.value);
		});
	});
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
	this.pud=null;
	this.path="";
	this.overlay="";

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
	$("#link").disabled=!Boolean(path);

	$("#filename").innerHTML=this.pud.filename;

	setSize("tileMap", this.pud.width*TILE_SIZE, this.pud.height*TILE_SIZE);
	setSize("unitMap", this.pud.width*TILE_SIZE, this.pud.height*TILE_SIZE);
	setSize("grid",    this.pud.width*TILE_SIZE, this.pud.height*TILE_SIZE);
	setSize("select",  this.pud.width*TILE_SIZE, this.pud.height*TILE_SIZE);
	setSize("miniUnitMap", MINIMAP_SIZE, MINIMAP_SIZE);
	setSize("miniTileMap", MINIMAP_SIZE, MINIMAP_SIZE);
	setSize("frame",       MINIMAP_SIZE, MINIMAP_SIZE);

	this.tileMap=$("#tileMap").getContext("2d");
	this.unitMap=$("#unitMap").getContext("2d");
	this.select=$("#select").getContext("2d");
	this.miniTileMap=$("#miniTileMap").getContext("2d");
	this.miniUnitMap=$("#miniUnitMap").getContext("2d");
	this.frame=$("#frame").getContext("2d");

	this.pos=$("#frame").getBoundingClientRect();
	this.scaleX=MINIMAP_SIZE/$("#tileMap").width;
	this.scaleY=MINIMAP_SIZE/$("#tileMap").height;
	this.miniTileMap.scale(this.scaleX, this.scaleY);

	this.selectPlayer(this.player);
	this.selectPalette("units");

	// draws tile map and changes unit icons to match tileset
	this.changeTileset(this.pud.tileset);

	function setSize(id, w, h) {
		$("#"+id).width=w;
		$("#"+id).height=h;
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
	unitMap.clearRect(0, 0, $("#unitMap").width, $("#unitMap").height);
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
	this.frame.clearRect(0, 0, $("#frame").width, $("#frame").height);
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

	this.select.clearRect(0, 0, $("#select").width, $("#select").height);
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

		this.select.clearRect(0, 0, $("#select").width, $("#select").height);
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
	this.setRadio("size",    this.pud.width);
	this.setRadio("terrain", this.pud.tileset);
};

Editor.prototype.openMapProperties=function() {
	this.setRadio("tileset", this.pud.tileset);

	$("#text_filename").value   =this.pud.filename;
	$("#text_width").value      =this.pud.width;
	$("#text_height").value     =this.pud.height;
	$("#text_description").value=this.pud.description;
};

Editor.prototype.openPlayers=function() {
	$$(".ai").forEach(function(element) {
		for (let [id, name] of data.ai) {
			let option=document.createElement("option");
			option.value=id;
			option.textContent=name;
			element.appendChild(option);
		}
	});

	for (let i=0; i<MAX_PLAYERS; i++) {
		this.setRadio("race"+i,        this.pud.races[i]);
		this.setSelect("controller"+i, this.pud.controller[i]);
		this.setSelect("ai"+i,         this.pud.ai[i]);
	}
};

Editor.prototype.openStartingConditions=function() {
	for (let i=0; i<MAX_PLAYERS; i++) {
		$("#number_startingGold"+i).value  =this.pud.startingGold[i];
		$("#number_startingLumber"+i).value=this.pud.startingLumber[i];
		$("#number_startingOil"+i).value   =this.pud.startingOil[i];
	}
};

Editor.prototype.openUnits=function() {
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

		$("#select_units").appendChild(optgroup);
	});

	$("#checkbox_units").checked=this.pud.units.useDefaults;
	$("#select_units").disabled=this.pud.units.useDefaults;
	$("#select_units").selectedIndex=0;
	this.fillProperties("units");

	let select=$("#select_units");
	let option=select.options[select.selectedIndex];
	$("#legend_units").innerHTML=option.label;
};

Editor.prototype.openUpgrades=function() {
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

		$("#select_upgrades").appendChild(optgroup);
	});

	$("#checkbox_upgrades").checked=this.pud.upgrades.useDefaults;
	$("#select_upgrades").disabled=this.pud.upgrades.useDefaults;
	$("#select_upgrades").selectedIndex=0;
	this.fillProperties("upgrades");

	let select=$("#select_upgrades");
	let option=select.options[select.selectedIndex];
	$("#legend_upgrades").innerHTML=option.label;
};

Editor.prototype.openSelection=function() {
	let select=$("#select_selection"), units={};

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
	$$(".player").forEach(function(element) {
		element.classList.toggle("current", element.value==player);
	});

	player=Number.parseInt(player);

	// changes owner of selected units
	Object.values(this.selected).forEach(function(unit) {
		// does not change ownership of critters, gold mines, or oil patches
		if (unit.type!=57&&unit.type!=92&&unit.type!=93) {
			unit.owner=player;
		}
	}, this);

	this.player=player;
	this.changeUnitPalette();
};

Editor.prototype.selectPalette=function(palette) {
	$$(".palette").forEach(function(element) {
		element.classList.toggle("open", element.id==palette);
	});

	$$(".tab").forEach(function(element) {
		element.classList.toggle("current", element.value==palette);
	});
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
	$$(".terrain img").forEach(function(element) {
		let icon=element.value+".png";

		let img=new Image();
		img.src="icons/terrain/"+this.getTileset(this.pud.tileset)+"/"+icon;
		img.addEventListener("load", function() {
			element.src=this.src;
		});
	}, this);
};

Editor.prototype.changeUnitPalette=function() {
	let group=$("#select_unitsPalette").value;

	if (!data.units.hasOwnProperty(group)) {
		return;
	}

	this.clear($("#unitsPalette"));

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

	$("#unitsPalette").replaceWith(ul);
};

Editor.prototype.fillSelectionProperties=function() {
	let select=$("#select_selection");
	let option=select.options[select.selectedIndex], index=option.value;

	$("#legend_selection").innerHTML=option.label;

	this.saveWorking("unitMap");

	let unit=this.selected[index], value="";

	$$(".unitMap").forEach(function(element) {
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

		$("#"+element.id).value=value;
	}, this);

	if (unit.type==92||unit.type==93) { // gold mine or oil patch
		$("#row_resource").classList.remove("hidden");
		$("#range_property").disabled=false;
	} else {
		$("#row_resource").classList.add("hidden");
		$("#range_property").disabled=true;
		this.changeResource();
	}

	if (unit.type<58) { // units, not buildings
		$("#row_ai").classList.remove("hidden");
		$("#select_property").disabled=false;
	} else {
		$("#row_ai").classList.add("hidden");
		$("#select_property").disabled=true;
	}

	this.index=index;
};

Editor.prototype.saveCreate=function() {
	let tileset=this.saveRadio("terrain");
	let size   =this.saveRadio("size");

	files.loadTemplate(this.getTileset(tileset), size);
};

Editor.prototype.saveWorking=function(key) {
	if (this.index<0) {
		return;
	}

	this.working[this.index]=$$("."+key).reduce(function(obj, element) {
		if (!element.disabled) {
			let [type, id, sub]=element.id.split(/_/g);
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

	let index=$("#select_"+key).value, value="";

	$$("."+key).forEach(function(element) {
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
	}, this);

	if (key=="units") {
		$("#select_rmbAction").disabled=index>=58; // units, not buildings
	} else if (key=="upgrades") {
		this.changeIcon($("#number_icon"), $("#icon"), $("#select_upgrades"));
	}

	this.index=index;
};

Editor.prototype.saveProperties=function(key) {
	this.saveWorking(key);

	if (key=="mapProperties") {
		this.pud.filename=$("#text_filename").value;
		this.pud.description=$("#text_description").value;

		let tileset=this.saveRadio("tileset");

		if (this.pud.tileset!=tileset){
			this.changeTileset(tileset);
		}

		$("#filename").textContent=this.pud.filename;
	} else if (key=="players") {
		for (let i=0; i<MAX_PLAYERS; i++) {
			this.pud.races[i]     =this.saveRadio("race"+i);
			this.pud.controller[i]=this.saveSelect("controller"+i);
			this.pud.ai[i]        =this.saveSelect("ai"+i);
		}

		this.changeUnitPalette();
	} else if (key=="startingConditions") {
		for (let i=0; i<MAX_PLAYERS; i++) {
			this.pud.startingGold[i]  =this.saveNumber("startingGold"+i);
			this.pud.startingLumber[i]=this.saveNumber("startingLumber"+i);
			this.pud.startingOil[i]   =this.saveNumber("startingOil"+i);
		}
	} else if (key=="unitMap") {
		Object.keys(this.working).forEach(function(index) {
			Object.keys(this.working[index]).forEach(function(property) {
				if (!this.pud.unitMap.hasOwnProperty(index)) {
					return;
				}

				if (!this.pud.unitMap[index].hasOwnProperty(property)) {
					return;
				}

				let value=Number(this.working[index][property]);
				this.pud.unitMap[index][property]=value;
			}, this);
		}, this);
	} else {
		this.mergeWorking(key);
		this.pud[key].useDefaults=$("#checkbox_"+key).checked;
	}
};

Editor.prototype.revertProperties=function(key) {
	let index=$("#select_"+key).value;
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
	$("#resource").textContent=$("#range_property").value*2500;
};

Editor.prototype.setRadio=function(name, compare) {
	let radios=document.getElementsByName("radio_"+name);

	for (let element of radios) {
		element.checked=element.value==compare;
	}
};

Editor.prototype.setSelect=function(id, value) {
	let select=$("#select_"+id), options=select.options;

	for (let i in options) {
		if (options[i].value==value) {
			select.selectedIndex=i;
		}
	}
};

Editor.prototype.saveNumber=function(id, size) {
	let max=1<<(8*size)-1, num=Number.parseInt($("#number_"+id).value);
	num=Math.min(Math.max(num, 0), max);

	return num;
};

Editor.prototype.saveRadio=function(name) {
	let radios=document.getElementsByName("radio_"+name);

	for (let element of radios) {
		if (element.checked) {
			return Number.parseInt(element.value);
		}
	}
};

Editor.prototype.saveSelect=function(id) {
	return $("#select_"+id).value;
};

Editor.prototype.saveImage=function() {
	let canvas=document.createElement("canvas");
	canvas.width =$("#tileMap").width;
	canvas.height=$("#tileMap").height;

	let context=canvas.getContext("2d");
	// composites all layers into a single image
	context.drawImage($("#tileMap"), 0, 0, canvas.width, canvas.height);
	context.drawImage($("#unitMap"), 0, 0, canvas.width, canvas.height);
	context.drawImage($("#grid"), 0, 0, canvas.width, canvas.height);

	let filename=this.pud.filename.replace(/\.pud$/, ".png");

	canvas.toBlob(function(blob) {
		let a=$("download");
		a.download=filename;
		a.href=window.URL.createObjectURL(blob);
		a.click();
	}, "image/png");
};

Editor.prototype.show=function(id) {
	this.closeAll();
	this.overlay=id;
	$("#overlay_"+id).classList.add("open");
};

Editor.prototype.hide=function(id) {
	this.resetWorking();
	this.overlay="";
	$("#overlay_"+id).classList.remove("open");
};

Editor.prototype.closeAll=function() {
	if (this.overlay) {
		this.hide(this.overlay);
	}
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

	this.units=[];
	this.upgrades=[];
	this.restrictions=[];
}

Pud.prototype.load=function(filename, buffer) {
	let pos=0;

	while (pos<buffer.byteLength) {
		try {
			let key=hexToStr(new Uint8Array(buffer, pos, LONG));
			let length=new DataView(buffer, pos+4, LONG).getInt32(0, true);

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

	readType();
	readDesc();
	readDim();
	readUnit();

	this.expansion     =readSection("VER ");
	this.controller    =readSection("OWNR");
	this.tileset       =readSection("ERAX", NOT_REQUIRED)||readSection("ERA ");
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
	this.signature     =readSection("SIGN", NOT_REQUIRED);

	this.valid=this.expansion==STANDARD||this.expansion==EXPANSION;
	this.valid=this.tileset<=0xff;

	if (this.tileset>=0x04) { // forest (default)
		this.tileset=0x00;
	}

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
		if (race>0xff) {
			this.valid=false;
		}

		if (race>=0x03) { // neutral
			return 0x02;
		}

		return race;
	}, this);

	this.ai.forEach(function(ai) {
		if (ai>0x52) {
			this.valid=false;
		}
	}, this);

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

		for (let i=0; i<data.length; i+=4) {
			dim.push({
				x: Number.parseInt(data.slice(i,   i+WORD)),
				y: Number.parseInt(data.slice(i+2, i+2+WORD))
			});
		}

		return dim;
	}

	// breaks bit fields into arrays of booleans
	function parseBits(arr) {
		return arr.map(function(value) {
			let sub=[];

			for (let i=0; i<32; i++) {
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
		if (self.struct["TYPE"]==undefined) {
			self.valid=false;
			return;
		}

		let type=self.struct["TYPE"];

		// checks for file format magic number
		if (!hexToStr(type).startsWith(FILE_SIGNATURE)) {
			self.valid=false;
			return;
		}

		self.id=type.slice(FILE_SIGNATURE.length);

		if (self.id.length!=LONG) {
			self.valid=false;
		}
	}

	// reads scenario description
	function readDesc() {
		if (self.struct["DESC"]==undefined) {
			self.valid=false;
			return;
		}

		let desc=hexToStr(self.struct["DESC"]);
		let stop=desc.indexOf("\x00"); // terminates at null char
		self.description=desc.slice(0, stop);
	}

	// gets map dimensions
	function readDim() {
		if (self.struct["DIM "]==undefined) {
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

		if (x<=MAX_WIDTH&&y<=MAX_HEIGHT) {
			self.width =x;
			self.height=y;
		}
	};

	// gets unit map
	function readUnit() {
		if (self.struct["UNIT"]==undefined) {
			self.valid=false;
			return;
		}

		const SIZE=8;
		let unit=self.struct["UNIT"], unitMap=[];

		for (let i=0; i<unit.length; i+=SIZE) {
			unitMap.push({
				x:        parseNum(unit.slice(i,   i+WORD)),
				y:        parseNum(unit.slice(i+2, i+2+WORD)),
				type:     unit[i+4],
				owner:    unit[i+5],
				property: parseNum(unit.slice(i+6, i+6+WORD))
			});
		}

		self.unitMap=unitMap;
	}
};

Pud.prototype.save=function() {
	let self=this;
	let sections=new Map([
		["TYPE", saveType()],
		["VER ", convertNum(this.version, WORD)],
		["DESC", saveDesc()],
		["OWNR", this.controller],
		["ERA ", convertNum(this.tileset==0x03?0x02:this.tileset, WORD)],
		["ERAX", this.tileset==0x03?convertNum(this.tileset, WORD):null],
		["DIM ", convertNum(this.width|this.height<<16, LONG)],
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

		length+=2*LONG+contents.length;
	}

	let file=new Uint8Array(length), pos=0;

	for (let [key, contents] of sections) {
		if (contents==undefined) {
			continue;
		}

		for (let i=0; i<key.length; i++, pos++) { // section name
			file[pos]=key.charCodeAt(i);
		}

		let len=convertNum(contents.length, LONG);

		for (let i=0; i<len.length; i++, pos++) { // section length
			file[pos]=len[i];
		}

		for (let i=0; i<contents.length; i++, pos++) {
			file[pos]=contents[i];
		}
	}

	return new Blob([file], {type: "application/x-warcraft2-scenario"});

	// converts number to big-endian typed array
	function convertNum(num, size) {
		let arr=new Uint8Array(size);

		for (let i=0; i<arr.length; i++) {
			arr[i]=(num&(0xff<<i*8))>>i*8;
		}

		return arr;
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
		let arr=new Uint8Array(LONG*data.length), pos=0;

		for (let i=0; i<data.length; i++) {
			let x=convertNum(data[i].x, WORD), y=convertNum(data[i].y, WORD);

			arr[pos]  =x[0];
			arr[pos+1]=x[1];
			arr[pos+2]=y[0];
			arr[pos+3]=y[1];

			pos+=LONG;
		}

		return arr;
	}

	function convertBits(data) {
		let arr=new Uint8Array(data.length*LONG), pos=0;

		for (let i=0; i<data.length; i++) {
			let value=0;

			for (let j=0; j<data[i].length; j++) {
				value+=data[i][j]<<j;
			}

			let num=convertNum(value, LONG);

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
		let arr=new Uint8Array(len+LONG);

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
		let arr=new Uint8Array(2*LONG*self.unitMap.length), pos=0;

		for (let unit of self.unitMap) {
			let x=convertNum(unit.x, WORD), y=convertNum(unit.y, WORD);
			let property=convertNum(unit.property, WORD);

			arr[pos]  =x[0];
			arr[pos+1]=x[1];
			arr[pos+2]=y[0];
			arr[pos+3]=y[1];
			arr[pos+4]=unit.type;
			arr[pos+5]=unit.owner;
			arr[pos+6]=property[0];
			arr[pos+7]=property[1];

			pos+=2*LONG;
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

			$("#"+self.id).replaceWith(ul);
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