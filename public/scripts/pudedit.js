"use strict";

/*
 * constants
 */

// data sizes
const BYTE=1;
const WORD=2;
const LONG=4;

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
const store=new Storage("pudedit");
const editor=new Editor();
const files=new Files("files");
const overlays=new Overlays([
	"about", "create", "browser", "link", "mapProperties", "playerProperties",
	"startingConditions", "unitProperties", "upgradeProperties",
	"selectionProperties"
]);

/*
 * initialization
 */

window.addEventListener("load", function() {
	let query=window.location.search.replace(/\?map=(.*)/, "$1");

	if (query=="") {
		files.loadTemplate("forest", 128);
	} else {
		let path=query.split("/");
		let filename=decodeURIComponent(path.pop());

		files.path=path;
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
			if (editor.selected.length>0) {
				editor.openSelectionProperties();
				overlays.show("selectionProperties");
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
		overlays.show("create");
	});
	$("open").addEventListener("click", function() {
		files.getList();
		overlays.show("browser");
	});
	$("save").addEventListener("click", function() {
		window.location.href+=MAPS_DIR+editor.fullname;
/*		store.save(editor.pud);

		if (editor.pud==null) {
			return;
		}

		let a=document.getElementById("download");
		a.download=editor.pud.filename;
		a.href=window.URL.createObjectURL(editor.pud.save());
		a.click();*/
	});
	$("saveImage").addEventListener("click", function() {
		editor.saveImage();
	});
	$("link").addEventListener("click", function() {
		let link=window.location.href.split("?")[0];
		link+="?map="+editor.fullname;

		$("text_link").value=link;
		overlays.show("link");
	});
	$("copy").addEventListener("click", function() {
		$(this.value).select();
		document.execCommand("copy");
	});
	$("about").addEventListener("click", function() {
		overlays.show("about");
	});
	$("filename").addEventListener("click", function() {
		editor.openMapProperties();
		overlays.show("mapProperties");
	});
	$("btn_mapProperties").addEventListener("click", function() {
		editor.openMapProperties();
		overlays.show("mapProperties");
	});
	$("btn_playerProperties").addEventListener("click", function() {
		editor.openPlayerProperties();
		overlays.show("playerProperties");
	});
	$("btn_startingConditions").addEventListener("click", function() {
		editor.openStartingConditions();
		overlays.show("startingConditions");
	});
	$("btn_unitProperties").addEventListener("click", function() {
		editor.openUnitProperties();
		overlays.show("unitProperties");
	});
	$("btn_upgradeProperties").addEventListener("click", function() {
		editor.openUpgradeProperties();
		overlays.show("upgradeProperties");
	});
	// for overlay save buttons
	$("submit_create").addEventListener("click", function() {
		editor.submitCreate();
		overlays.hide("create");
	});
	$("submit_mapProperties").addEventListener("click", function() {
		editor.submitMapProperties();
		overlays.hide("mapProperties");
	});
	$("submit_playerProperties").addEventListener("click", function() {
		editor.submitPlayerProperties();
		overlays.hide("playerProperties");
	});
	$("submit_startingConditions").addEventListener("click", function() {
		editor.submitStartingConditions();
		overlays.hide("startingConditions");
	});
	$("submit_unitProperties").addEventListener("click", function() {
		editor.submitUnitProperties();
		overlays.hide("unitProperties");
	});
	$("submit_upgradeProperties").addEventListener("click", function() {
		editor.submitUpgradeProperties();
		overlays.hide("upgradeProperties");
	});
	// for overlay widgets
	$("select_unitsPalette").addEventListener("input", function() {
		editor.changeUnitPalette();
	});
	$("select_units").addEventListener("input", function() {
		editor.fillUnitProperties();
	});
	$("select_upgrades").addEventListener("input", function() {
		editor.fillUpgradeProperties();
	});
	$("number_upgradeIcon").addEventListener("input", function() {
		editor.changeIcon(this, $("img_upgradeIcon"), $("select_upgrades"));
	});
	$("select_selection").addEventListener("input", function() {
		editor.fillSelectionProperties();
	});
	$("range_resource").addEventListener("input", function() {
		editor.changeResource();
	});
	// for file browser in open overlay
	$("file").addEventListener("input", function(event) {
		let file=event.target.files[0];

		if (file) {
			let reader=new FileReader();
			reader.addEventListener("load", function(event) {
				editor.open(file.name, event.target.result);
				overlays.hide("browser");
			});
			reader.readAsArrayBuffer(file);
		}
	});

	window.addEventListener("keyup", function(event) {
		if (event.keyCode==13) { // Enter
			if (editor.selected.length>0) {
				editor.openSelectionProperties();
				overlays.show("selectionProperties");
			}
		}

		if (event.keyCode==27) { // Esc
			overlays.closeAll();
		}

		if (event.keyCode==48) { // 0
			editor.selectPlayer(15);
		}

		if (event.keyCode==49) { // 1
			editor.selectPlayer(0);
		}

		if (event.keyCode==50) { // 2
			editor.selectPlayer(1);
		}

		if (event.keyCode==51) { // 3
			editor.selectPlayer(2);
		}

		if (event.keyCode==52) { // 4
			editor.selectPlayer(3);
		}

		if (event.keyCode==53) { // 5
			editor.selectPlayer(4);
		}

		if (event.keyCode==54) { // 6
			editor.selectPlayer(5);
		}

		if (event.keyCode==55) { // 7
			editor.selectPlayer(6);
		}

		if (event.keyCode==56) { // 8
			editor.selectPlayer(7);
		}
	});
	window.addEventListener("beforeunload", function() {
	//	store.save(editor.pud);
	});
	window.addEventListener("resize", function() {
		editor.drawFrame();
	});
	window.addEventListener("scroll", function() {
		editor.updateCoords();
		editor.drawFrame();
	});

	let basic=document.getElementsByClassName("basic");

	for (let element of basic) {
		element.addEventListener("click", function() {
			$(this.value).click();
		});
	}

	let players=document.getElementsByClassName("player");

	for (let element of players) {
		element.addEventListener("click", function() {
			editor.selectPlayer(this.value);
		});
	}

	let modes=document.getElementsByClassName("mode");

	for (let element of modes) {
		element.addEventListener("click", function() {
			editor.selectPalette(this.value);
		});
	}

	let toggles=document.getElementsByClassName("layer");

	for (let element of toggles) {
		element.addEventListener("click", function() {
			$(this.value).classList.toggle("hidden", !this.checked);
		});
	}

	let close=document.getElementsByClassName("close");

	for (let element of close) {
		element.addEventListener("click", function() {
			overlays.hide(this.value);
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
	this.fullname="";

	this.tileMap=null;
	this.unitMap=null;
	this.select=null;
	this.miniTileMap=null;
	this.miniUnitMap=null;
	this.frame=null;
	this.tiles=null;

	this.dragSelect=false;
	this.selectMultiple=false;
	this.selected=[];
	this.selectX=0;
	this.selectY=0;

	this.dragFrame=false;
	this.pos=null;
	this.x=0;
	this.y=0;
	this.scaleX=0;
	this.scaleY=0;

	this.player=0;

	this.units=[];
	this.upgrades=[];
}

Editor.prototype.open=function(filename, fullname, buffer) {
	window.scrollTo(0, 0);

	this.fullname=fullname;

	this.pud=new Pud();
	this.pud.load(filename, buffer);

	$("filename").innerHTML=this.pud.filename;

	setSize("tileMap", this.pud.width*TILE_SIZE, this.pud.height*TILE_SIZE);
	setSize("unitMap", this.pud.width*TILE_SIZE, this.pud.height*TILE_SIZE);
	setSize("grid", this.pud.width*TILE_SIZE, this.pud.height*TILE_SIZE);
	setSize("select", this.pud.width*TILE_SIZE, this.pud.height*TILE_SIZE);
	setSize("miniUnitMap", MINIMAP_SIZE, MINIMAP_SIZE);
	setSize("miniTileMap", MINIMAP_SIZE, MINIMAP_SIZE);
	setSize("frame", MINIMAP_SIZE, MINIMAP_SIZE);

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
					imageData.data[i]==data.colors[0][j].r&&
					imageData.data[i+1]==data.colors[0][j].g&&
					imageData.data[i+2]==data.colors[0][j].b
				) {
					imageData.data[i]=data.colors[owner][j].r;
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
		this.selected=[];

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

	Object.values(this.pud.unitMap).forEach(function(unit) {
		let unitSize=this.pud.units.unitSize[unit.type];

		if (unitSize==undefined) {
			return;
		}

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

		if (boundaries&&(!add||!this.selected.includes(unit))) {
			this.select.beginPath();
			this.select.rect(
				gx1*TILE_SIZE, gy1*TILE_SIZE,
				unitSize.x*TILE_SIZE, unitSize.y*TILE_SIZE
			);
			this.select.stroke();

			this.selected.push(unit);
		}
	}, this);
};

Editor.prototype.openCreate=function() {
	this.setRadio("radio_size", this.pud.width);
	this.setRadio("radio_terrain", this.pud.tileset);
};

Editor.prototype.openMapProperties=function() {
	this.setRadio("radio_tileset", this.pud.tileset);

	$("text_filename").value=this.pud.filename;
	$("text_width").value=this.pud.width;
	$("text_height").value=this.pud.height;
	$("text_description").value=this.pud.description;
};

Editor.prototype.openPlayerProperties=function() {
	for (let i=0; i<MAX_PLAYERS; i++) {
		this.setRadio("radio_race"+i, this.pud.races[i]);
		this.setSelect("select_controller"+i, this.pud.controller[i]);
		this.setSelect("select_ai"+i, this.pud.ai[i]);
	}
};

Editor.prototype.openStartingConditions=function() {
	for (let i=0; i<MAX_PLAYERS; i++) {
		$("number_startingGold"+i).value=this.pud.startingGold[i];
		$("number_startingLumber"+i).value=this.pud.startingLumber[i];
		$("number_startingOil"+i).value=this.pud.startingOil[i];
	}
};

Editor.prototype.openUnitProperties=function() {
	$("checkbox_units").checked=this.pud.defaultUnits;

	$("select_units").selectedIndex=0;
	this.fillUnitProperties();
};

Editor.prototype.openUpgradeProperties=function() {
	$("checkbox_upgrades").checked=this.pud.defaultUpgrades;

	$("select_upgrades").selectedIndex=0;
	this.fillUpgradeProperties();
};

Editor.prototype.openSelectionProperties=function() {
	let select=$("select_selection");

	while (select.lastChild) { // removes all children
		select.removeChild(select.lastChild);
	}

	this.selected.forEach(function(selection, i) {
		let item=document.createElement("option");
		item.value=i;
		item.textContent=data.units[selection.type]||"Undefined";

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

	this.player=player;
	this.changeUnitPalette();
};

Editor.prototype.selectPalette=function(palette) {
	let palettes=document.getElementsByClassName("palette");

	for (let element of palettes) {
		element.classList.toggle("open", element.id==palette);
	}

	let modes=document.getElementsByClassName("mode");

	for (let element of modes) {
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
	let select=$("select_unitsPalette");
	let option=select.options[select.selectedIndex], group=option.value;

	if (data.icons[group]==undefined) {
		return;
	}

	this.clear($("unitsPalette"));

	let ul=document.createElement("ul");
	ul.id="unitsPalette";

	for (let type in data.icons[group]) {
		let race=this.getRace();

		if (data.icons[group][type][race]==undefined) {
			race="neutral";
		}

		let unit=data.icons[group][type][race];

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

Editor.prototype.fillUnitProperties=function() {
	let select=$("select_units");
	let option=select.options[select.selectedIndex], unit=option.value;

	$("legend_unit").innerHTML=option.label;

	$("number_sight").value=this.pud.units.sight[unit];
	$("number_hp").value=this.pud.units.hp[unit];
	$("number_magic").value=this.pud.units.magic[unit];
	$("number_buildTime").value=this.pud.units.buildTime[unit];
	$("number_unitGold").value=this.pud.units.gold[unit];
	$("number_unitLumber").value=this.pud.units.lumber[unit];
	$("number_unitOil").value=this.pud.units.oil[unit];
	$("number_unitSizeX").value=this.pud.units.unitSize[unit].x;
	$("number_unitSizeY").value=this.pud.units.unitSize[unit].y;
	$("number_boxSizeX").value=this.pud.units.boxSize[unit].x;
	$("number_boxSizeY").value=this.pud.units.boxSize[unit].y;
	$("number_range").value=this.pud.units.range[unit];
	$("number_reactComputer").value=this.pud.units.reactComputer[unit];
	$("number_reactHuman").value=this.pud.units.reactHuman[unit];
	$("number_armor").value=this.pud.units.armor[unit];
	$("number_selectable").value=this.pud.units.selectable[unit];
	$("number_priority").value=this.pud.units.priority[unit];
	$("number_basicDamage").value=this.pud.units.basicDamage[unit];
	$("number_piercingDamage").value=this.pud.units.piercingDamage[unit];
	$("number_weaponsUpgradable").value=this.pud.units.weaponsUpgradable[unit];
	$("number_armorUpgradable").value=this.pud.units.armorUpgradable[unit];
	$("number_missile").value=this.pud.units.missile[unit];
	$("number_type").value=this.pud.units.type[unit];
	$("number_decayRate").value=this.pud.units.decayRate[unit];
	$("number_annoyFactor").value=this.pud.units.annoyFactor[unit];
	$("number_points").value=this.pud.units.points[unit];
	$("number_canTarget").value=this.pud.units.canTarget[unit];
	$("number_flags").value=this.pud.units.flags[unit];

	if (unit<58) { // units, not buildings
		$("number_rmbAction").value=this.pud.units.rmbAction[unit];
	}
};

Editor.prototype.fillUpgradeProperties=function() {
	let select=$("select_upgrades");
	let option=select.options[select.selectedIndex], upgrade=option.value;

	$("legend_upgrade").innerHTML=option.label;

	$("number_upgradeTime").value=this.pud.upgrades.time[upgrade];
	$("number_upgradeGold").value=this.pud.upgrades.gold[upgrade];
	$("number_upgradeLumber").value=this.pud.upgrades.lumber[upgrade];
	$("number_upgradeOil").value=this.pud.upgrades.oil[upgrade];
	$("number_upgradeIcon").value=this.pud.upgrades.icon[upgrade];
	$("number_upgradeGroup").value=this.pud.upgrades.group[upgrade];

	this.setSelect("select_upgradeEffect", this.pud.upgrades.effect[upgrade]);

	this.changeIcon(
		$("number_upgradeIcon"),
		$("img_upgradeIcon"),
		$("select_upgrades")
	);
};

Editor.prototype.fillSelectionProperties=function() {
	let select=$("select_selection");
	let option=select.options[select.selectedIndex];

	$("legend_selection").innerHTML=option.label;

	let unit=this.selected[option.value];

	$("text_unitX").value=unit.x+1;
	$("text_unitY").value=unit.y+1;

	this.setSelect("select_owner", unit.owner);

	if (unit.type==92||unit.type==93) { // gold mine or oil patch
		$("row_resource").classList.remove("hidden");
		$("range_resource").value=unit.property;
	} else {
		$("row_resource").classList.add("hidden");
		this.changeResource();
	}

	let radios=document.getElementsByName("radio_ai");

	if (unit.type<58) { // units, not buildings
		$("row_ai").classList.remove("hidden");
		this.setRadio("radio_ai", unit.property);
	} else {
		$("row_ai").classList.add("hidden");
	}
};

Editor.prototype.submitCreate=function() {
	let tileset=this.saveRadio("radio_terrain");
	let size=this.saveRadio("radio_size");

	files.loadTemplate(this.getTileset(Number.parseInt(tileset)), size);
};

Editor.prototype.submitMapProperties=function() {
	this.pud.filename=$("text_filename").value;
	this.pud.description=$("text_description").value;

	let tileset=Number.parseInt(this.saveRadio("radio_tileset"));

	if (this.pud.tileset!=tileset){
		this.changeTileset(tileset);
	}

	$("filename").textContent=this.pud.filename;
};

Editor.prototype.submitPlayerProperties=function() {
	for (let i=0; i<MAX_PLAYERS; i++) {
		this.pud.races[i]=this.saveRadio("radio_race"+i);
		this.pud.controller[i]=this.saveSelect("select_controller"+i);
		this.pud.ai[i]=this.saveSelect("select_ai"+i);
	}

	this.changeUnitPalette();
};

Editor.prototype.submitStartingConditions=function() {
	for (let i=0; i<MAX_PLAYERS; i++) {
		this.pud.startingGold[i]=this.saveNumber("number_startingGold"+i);
		this.pud.startingLumber[i]=this.saveNumber("number_startingLumber"+i);
		this.pud.startingOil[i]=this.saveNumber("number_startingOil"+i);
	}
};

Editor.prototype.submitUnitProperties=function() {
};

Editor.prototype.submitUpgradeProperties=function() {
};

Editor.prototype.submitSelectionProperties=function() {
};

Editor.prototype.getRace=function() {
	if (this.player in this.pud.races) {
		return this.pud.races[this.player]?"orc":"human";
	}
};

Editor.prototype.getTileset=function(num) {
	let tileset="";

	switch (num) {
		case 1: tileset="winter"; break;
		case 2: tileset="wasteland"; break;
		case 3: tileset="swamp"; break;
		default: tileset="forest";
	}

	return tileset;
};

Editor.prototype.changeIcon=function(input, img, select) {
	if (input.value<0) {
		input.value=0;
	}

	if (input.value>195) {
		input.value=195;
	}

	let icon=input.value.padStart(4, "0");
	img.src="icons/"+this.getTileset(this.pud.tileset)+"/"+icon+".png";
};

Editor.prototype.changeResource=function() {
	$("resource").textContent=$("range_resource").value*2500;
};

Editor.prototype.setRadio=function(name, compare) {
	let radios=document.getElementsByName(name);

	for (let element of radios) {
		element.checked=element.value==compare;
	}
};

Editor.prototype.setSelect=function(id, compare) {
	let select=$(id), options=select.options;

	for (let i=0; i<options.length; i++) {
		if (options[i].value==compare) {
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
			return element.value;
		}
	}
};

Editor.prototype.saveSelect=function(id) {
	let select=$(id);

	return select.options[select.selectedIndex].value;
};

Editor.prototype.saveImage=function() {
	let canvas=document.createElement("canvas");
	canvas.width=$("tileMap").width;
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

/*
 * Pud prototype
 */

function Pud(filename="", struct={}) {
	this.filename=filename;
	this.struct=struct;

	this.valid=true;

	this.id="";
	this.expansion=false;
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

	this.startingGold=this.readSection("SGLD", WORD);
	this.startingLumber=this.readSection("SLBR", WORD);
	this.startingOil=this.readSection("SOIL", WORD);

	this.tileMap=this.readSection("MTXM", WORD);
	this.movementMap=this.readSection("SQM ", WORD);
	this.actionMap=this.readSection("REGM", WORD);
};

Pud.prototype.save=function() {
/*	this.saveType();
	this.saveVer();
	this.saveDesc();
	this.saveOwnr();
	this.saveEra();
	this.saveDim();
	this.saveUdta();
	this.saveAlow();
	this.saveUgrd();
	this.saveSide();
	this.saveAipl();
	this.saveUnit();

	this.startingGold=this.saveSection("SGLD", WORD);
	this.startingLumber=this.saveSection("SLBR", WORD);
	this.startingOil=this.saveSection("SOIL", WORD);

	this.tileMap=this.saveSection("MTXM", WORD);
	this.movementMap=this.saveSection("SQM ", WORD);
	this.actionMap=this.saveSection("REGM", WORD);*/

	let file=[];

	for (let section in this.struct) {
		file.push(section);
	}

	return new Blob([file], {
		type: "application/warcraft2-scenario"
	});
};

// converts hex to ASCII
Pud.prototype.hexToStr=function(arr) {
	return arr.reduce(function(str, hex) {
		return str+String.fromCharCode(hex);
	}, "");
};

// parses little-endian number
Pud.prototype.parseNum=function(arr) {
	return arr.reduce(function(num, hex, i) {
		return num+(hex<<i*8);
	}, 0);
};

Pud.prototype.readSection=function(section, size) {
	if (this.struct[section]==undefined) {
		this.valid=false;
		return;
	}

	return this.getArray(this.struct[section], size);
};

// breaks array buffer into array with elements of given size
Pud.prototype.getArray=function(data, size) {
	let arr=[];

	for (let i=0; i<data.length; i+=size) {
		arr.push(this.parseNum(data.slice(i, i+size)));
	}

	return arr;
};

// identifies as PUD file and gets unique map ID
Pud.prototype.readType=function() {
	if (this.struct["TYPE"]==undefined) {
		this.valid=false;
		return;
	}

	const FILE_SIGNATURE="WAR2 MAP\x00\x00\x0a\xff";

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

	const STANDARD_SCENARIO=0x11;
	const EXPANSION_SCENARIO=0x13;

	let ver=this.parseNum(this.struct["VER "]);

	if (ver==STANDARD_SCENARIO) {
		this.expansion=false;
	} else if (ver==EXPANSION_SCENARIO) {
		this.expansion=true;
	} else {
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

	let x=Number.parseInt(dim.slice(0, BYTE));
	let y=Number.parseInt(dim.slice(2, 2+BYTE));

	if (x<=128&&y<=128) {
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

	let udta=this.struct["UDTA"], addr=0, units={};

	this.defaultUnits=Boolean(getAttr(1, WORD));

	addr=1238;
	units.sight=this.getArray(getAttr(110, LONG), LONG);
	units.hp=this.getArray(getAttr(110, WORD), WORD);
	units.magic=getAttr(110, BYTE);
	units.buildTime=getAttr(110, BYTE);
	units.gold=getAttr(110, BYTE);
	units.lumber=getAttr(110, BYTE);
	units.oil=getAttr(110, BYTE);
	units.unitSize=parseDim(getAttr(110, LONG));
	units.boxSize=parseDim(getAttr(110, LONG));
	units.range=getAttr(110, BYTE);
	units.reactComputer=getAttr(110, BYTE);
	units.reactHuman=getAttr(110, BYTE);
	units.armor=getAttr(110, BYTE);
	units.selectable=getAttr(110, BYTE);
	units.priority=getAttr(110, BYTE);
	units.basicDamage=getAttr(110, BYTE);
	units.piercingDamage=getAttr(110, BYTE);
	units.weaponsUpgradable=getAttr(110, BYTE);
	units.armorUpgradable=getAttr(110, BYTE);
	units.missile=getAttr(110, BYTE);
	units.type=getAttr(110, BYTE);
	units.decayRate=getAttr(110, BYTE);
	units.annoyFactor=getAttr(110, BYTE);
	units.rmbAction=getAttr(58, BYTE);
	units.points=this.getArray(getAttr(110, WORD), WORD);
	units.canTarget=getAttr(110, BYTE);
	units.flags=this.getArray(getAttr(110, LONG), LONG);

	this.units=units;

	function getAttr(len, size) {
		let arr=udta.slice(addr, addr+len*size);
		addr+=len*size;

		return arr;
	}

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

// reads unit/ability/upgrade restrictions (optional section)
Pud.prototype.readAlow=function() {
	if (this.struct["ALOW"]==undefined) {
		return;
	}

	let alow=this.struct["ALOW"], addr=0, restrictions={};

	restrictions.units=this.getArray(getAttr(16, LONG), LONG);
	restrictions.spellsResearched=this.getArray(getAttr(16, LONG), LONG);
	restrictions.spells=this.getArray(getAttr(16, LONG), LONG);
	restrictions.spellsResearching=this.getArray(getAttr(16, LONG), LONG);
	restrictions.upgrades=this.getArray(getAttr(16, LONG), LONG);
	restrictions.upgradesResearching=this.getArray(getAttr(16, LONG), LONG);

	restrictions.units=readBits(restrictions.units);
	restrictions.spellsResearched=readBits(restrictions.spellsResearched);
	restrictions.spells=readBits(restrictions.spells);
	restrictions.spellsResearching=readBits(restrictions.spellsResearching);
	restrictions.upgrades=readBits(restrictions.upgrades);
	restrictions.upgradesResearching=readBits(restrictions.upgradesResearching);

	this.restrictions=restrictions;

	function getAttr(len, size) {
		let arr=alow.slice(addr, addr+len*size);
		addr+=len*size;

		return arr;
	}

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

	let ugrd=this.struct["UGRD"], addr=0, upgrades={};

	this.defaultUpgrades=Boolean(getAttr(1, WORD));

	upgrades.time=getAttr(52, BYTE);
	upgrades.gold=this.getArray(getAttr(52, WORD), WORD);
	upgrades.lumber=this.getArray(getAttr(52, WORD), WORD);
	upgrades.oil=this.getArray(getAttr(52, WORD), WORD);
	upgrades.icon=this.getArray(getAttr(52, WORD), WORD);
	upgrades.group=this.getArray(getAttr(52, WORD), WORD);
	upgrades.effect=this.getArray(getAttr(52, LONG), LONG);

	this.upgrades=upgrades;

	function getAttr(len, size) {
		let arr=ugrd.slice(addr, addr+len*size);
		addr+=len*size;

		return arr;
	}
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
 * Overlays prototype
 */

function Overlays(list) {
	this.list=list;
}

Overlays.prototype.show=function(id) {
	this.closeAll();
	$("overlay_"+id).classList.add("open");
};

Overlays.prototype.hide=function(id) {
	$("overlay_"+id).classList.remove("open");
};

Overlays.prototype.closeAll=function() {
	this.list.forEach(function(overlay) {
		this.hide(overlay);
	}, this);
};

/*
 * Files prototype
 */

function Files(id) {
	this.id=id;
	this.path=[];
}

Files.prototype.getList=function() {
	let xhr=new XMLHttpRequest();
	let self=this;

	if (this.path.includes("templates")) {
		this.path=[];
	}

	xhr.addEventListener("readystatechange", function() {
		if (this.readyState==4&&this.status==200) {
			let dirs=this.response.dirs, files=this.response.files;

			let ul=document.createElement("ul");
			ul.id=self.id;

			if (self.path.length>0) { // except root directory
				ul.appendChild(self.createItem("dir", "[..]",
					function() {
						self.path.pop();
						self.getList();
					})
				);
			}

			for (let dir of dirs) {
				ul.appendChild(self.createItem("dir", "["+dir+"]",
					function() {
						self.path.push(dir);
						self.getList();
					})
				);
			}

			for (let file of files) {
				ul.appendChild(self.createItem("pud", file,
					function() {
						overlays.hide("browser");
						self.load(file, editor.open.bind(editor));
					})
				);
			}

			$(self.id).replaceWith(ul);
		}
	});
	xhr.open("GET", MAPS_DIR+this.path.join("/")+"/index.json", true);
	xhr.responseType="json";
	xhr.send();
};

Files.prototype.load=function(filename, callback) {
	let xhr=new XMLHttpRequest();
	let fullname=this.path.join("/")+"/"+filename;

	// remove initial slash from file path if present
	if (fullname.slice(0, 1)=="/") {
		fullname=fullname.slice(1);
	}

	xhr.addEventListener("readystatechange", function() {
		if (this.readyState==4&&this.status==200) {
			callback(filename, fullname, this.response);
		}
	});
	xhr.open("GET", MAPS_DIR+fullname, true);
	xhr.responseType="arraybuffer";
	xhr.send();
};

Files.prototype.loadTemplate=function(tileset, size) {
	this.path=["templates", tileset];
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

/*
 * Storage prototype
 */

function Storage(name) {
	this.name=name;
}

Storage.prototype.load=function() {
	try {
		let contents=localStorage.getItem(this.name);

		if (contents!=null) {
			return JSON.parse(contents);
		}
	} catch (err) {
		console.error(err);
	}
};

Storage.prototype.save=function(data) {
	try {
		localStorage.setItem(this.name, JSON.stringify(data));
	} catch (err) {
		console.error(err);
	}
};

Storage.prototype.reset=function() {
	try {
		localStorage.removeItem(this.name);
	} catch (err) {
		console.error(err);
	}
};