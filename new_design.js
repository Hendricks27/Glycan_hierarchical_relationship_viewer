"use strict";

var glycanviewer = {
    // The "global variables" are declared here
    // It is not necessary to do so
    // It is just a reminder of I can use this "things" directly

    firstInit : true,
    // A list of div in HTML page. save the trouble of document.getElement blah blah
    div_root: 0,
    div_header: 0,
    div_img: 0,
    div_network: 0,
    div_navi: 0,

    // Parameters from HTML file
    para : 0,
    // A portion of json file that will be used to build the network
    component : 0,
    // Things related to the network
    rootname : 0,
    topoonly : 0,
    rootlevel : 0,
    displaynodes : 0,
    magicNumberForHeightScaleRatio : 0,
    verticalSpace : 0,
    horizontalSpace : 0,
    // Image cache
    resouceStatus : {},
    nodeImg : {},



    init: function (parameters) {
        if (this.IEQuestionMark())
        {
            this.compatibleDraw(parameters);
        }
        else {
            this.para = this.paraCheck(parameters);
            this.component = parameters.essentials.component;
            this.allocateDiv();
            this.dataPreProcessing();
        }
    },

    // Check the integrity and legitimacy of the parameters
    paraCheck : function (para){
        var checked = para;
        if (!para.display.naviOption.size){
            checked.display.naviOption.size = 0.15;
        }
        if (!para.display.naviOption.postion){
            checked.display.naviOption.postion = 4;
        }
        if (![1,2,3,4].includes(para.display.naviOption.postion)){
            checked.display.naviOption.postion = 4;
        }
        return checked
    },

    // Allocate the DIV
    allocateDiv: function () {
        var thisLib = this;

        // This variable stands for the prefix of the div id.
        var id = this.para.essentials.div_ID + "_glycanviewer_";

        //Locate the div && pre allocate space for each gadgets
        this.div_root = document.getElementById(thisLib.para.essentials.div_ID);
        while (thisLib.div_root.firstChild){
            thisLib.div_root.removeChild(thisLib.div_root.firstChild);
        }
        this.div_root.style.overflow = "hidden";

        this.div_header = document.createElement("div");
        this.div_header.setAttribute("id",id+"header");

        this.div_realStuff = document.createElement("div");
        this.div_realStuff.setAttribute("id",id+"realStuff");
        this.div_realStuff.style = "width: 100%; height: 100%; position: relative; left: 0; top: 0;";

        this.div_network = document.createElement("div");
        this.div_network.setAttribute("id",id+"container");
        this.div_network.style = "width: 100%; height: 100%;position: relative; left: 0; top: 0;";
        this.div_navi = document.createElement("div");
        this.div_navi.setAttribute("id",id+"navi");
        //this.div_navi.style = "position: absolute; left: 0; top: 0; float: right; width: 100%; height: 100%";
        this.div_contextMenu = document.createElement("div");
        this.div_contextMenu.setAttribute("id",id+"contextMenu");

        this.div_realStuff.appendChild(this.div_network);
        this.div_realStuff.appendChild(this.div_navi);
        this.div_realStuff.appendChild(this.div_contextMenu);

        this.div_root.appendChild(this.div_header);
        this.div_root.appendChild(this.div_realStuff);
    },

    getJson : function() {
        var thisLib = this;
        d3.json(thisLib.para.content.json_url, function(data){

            var component = data[thisLib.para.content.composition];
            thisLib.component = component;
            thisLib.dataPreProcessing();


        });
    },

    dataPreProcessing : function(){
        var thisLib = this;

        var component = this.component;
        var rootname = component.root;
        var topoonly = this.para.essentials.topoOnly;

        this.rootname = rootname;
        this.topoonly = topoonly;


        if (this.para.essentials.viewRoot){
            rootname = this.para.essentials.viewRoot;
        }

        computeLevels();
        function computeLevels(){}


        // Loading the title
        if (this.para.display.enableTitle){
            var header = document.createElement("h2");
            header.style = "margin: 1px;";
            this.div_header.appendChild(header);
            header.innerHTML = rootname + " (" + component.mw + ") - " + "Level " + component.nodes[rootname].level;
        }


        this.network = new vis.Network(thisLib.div_network);

        // Original code for computing level
        /*
        var displaynodes = {};
        var toexplore = [ rootname ];
        var parentnode;
        var rootlevel = component.nodes[rootname].level;

        while (true) {
            break;
            if (toexplore.length == 0) {
                break;
            }
            var r = toexplore.pop();
            if (topoonly == 1) {
                if (component.nodes[r].type != 'Saccharide') {
                    displaynodes[r] = 1;
                }
            } else {
                displaynodes[r] = 1;
            }
            d3.keys(component.edges).forEach(function (k) {
                component.edges[k].forEach(function(e) {
                    if (e.from == r) {
                        toexplore.push(e.to);
                    }
                    if (e.to == rootname) {
                        parentnode = e.from;
                    }
                })
            });
        }
        */

        this.computeLevel(component, rootname);
        var displaynodes = this.displaynodes;

        // Calculate the nodeSpace and height scale ratio
        var nodeImageScaleRatioComparedToDefaultSetting = 2.0, // It means how many fold larger do you want your node to present
            nodeHorizontalSpaceRatio = 0.95;
        // How many ford larger do you want the node space to be. 1 means just no overlap
        var allWidth = [],
            allHeight = [];
        var greatestWidth = 0,
            greatestHeight = 0;
        var verticalSpace = 150,
            horizontalSpace = 150; //those 2 values are default value

        d3.keys(component.nodes).forEach(function (k) {
            var d = component.nodes[k];
            if (displaynodes[k] == 1) {
                allWidth.push(d.width);
                allHeight.push(d.height);
                thisLib.resouceStatus[d.name] = false;
                thisLib.getImageURL(d.name);
            }
        });


        /*
        In case of the outlier (extremely high&thin or short&fat images) that only occurs 1 time
        Preserved for future development
        */
        allWidth.sort(function(a, b){return b-a});
        allHeight.sort(function(a, b){return b-a});
        greatestWidth = allWidth[0];
        greatestHeight = allHeight[0];


        var magicNumberForHeightScaleRatio = 5;
        if (greatestWidth != undefined && greatestHeight != undefined ){
            magicNumberForHeightScaleRatio = greatestHeight/nodeImageScaleRatioComparedToDefaultSetting/25;
            horizontalSpace = 25 * nodeImageScaleRatioComparedToDefaultSetting / greatestHeight * greatestWidth * nodeHorizontalSpaceRatio *2;
        }
        else{
            verticalSpace = 220;
            horizontalSpace = 400;
        }


        this.magicNumberForHeightScaleRatio = magicNumberForHeightScaleRatio;
        this.verticalSpace = verticalSpace;
        this.horizontalSpace = horizontalSpace;


        if(this.para.essentials.useGlyTouCanAsImageSource){
            for (var node in component.nodes){
                var img = new Images();
                img.src = "https://glytoucan.org/glycans/" + node + "/image?style=extended&format=png&notation=cfg"
            }
            this.networkDraw();
        }


    },

    computeLevel : function(component, rootname){

        var rootlevel = 0;
        var thisLevel = 0;
        var thisLevelNodes = [ rootname ];
        var nextLevelNodes = [];
        var displaynodes = [];

        // Change all nodes level to undefined
        for (var node in component.nodes){
            var a = component.nodes[node].level;
            component.nodes[node].level = 1;
            var b = component.nodes[node].level;
            //console.log(a,b);
        }

        while (thisLevelNodes.length > 0){
            for(var i=0; i < thisLevelNodes.length; i++){
                var currentNode = thisLevelNodes[i];
                var edgesOfCurrentNode = component.edges[currentNode];
                if (edgesOfCurrentNode != undefined){
                    for (var currentEdgeIndex in edgesOfCurrentNode){
                        var currentEdge = edgesOfCurrentNode[currentEdgeIndex];
                        nextLevelNodes.push(currentEdge.to);
                        component.nodes[ currentNode ].level = thisLevel;
                        displaynodes[ currentNode ] = 1;
                    }
                }
                else{
                    component.nodes[ currentNode ].level = thisLevel;
                    displaynodes[ currentNode ] = 1;
                }

            }

            thisLevelNodes = nextLevelNodes;
            nextLevelNodes = [];
            thisLevel += 1;
        }

        this.rootlevel = rootlevel;
        this.displaynodes = displaynodes;
        this.component = component;

    },

    getImageURL : function (accession){
        if (this.para.essentials.useGlyTouCanAsImageSource){
            this.getGlyTouCanImageURL(accession);
        }
        else{
            this.getBase64Image(accession);
        }
    },

    getGlyTouCanImageURL : function(accession){
        var url = "https://glytoucan.org/glycans/" + accession + "/image?style=extended&format=png&notation=cfg";
        this.nodeImg[accession] = url;
    },

    getBase64Image : function (accession){
        var thisLib = this;

        var imgURL = this.para.essentials.imgURL + accession + ".png";

        var img = document.createElement("img");
        img.setAttribute("src",imgURL);


        img.onload = function (){

            // Create an empty canvas element
            var canvas = document.createElement("canvas");
            canvas.width = img.width;
            canvas.height = img.height;

            var ctx = canvas.getContext("2d");
            ctx.drawImage(img, 0, 0);
            var dataURL = canvas.toDataURL("image/png");

            thisLib.nodeImg[accession] = dataURL;
            thisLib.resouceStatus[accession] = true;
            thisLib.resouceSync();

        }
    },

    resouceSync : function(){
        var clearToProceed = true;

        for (var key in this.resouceStatus) {
            if (!this.resouceStatus[key]){
                clearToProceed = false;
                break;
            }
        }

        if (clearToProceed){
            this.networkDraw();
        }
    },

    networkDraw : function (){
        var thisLib = this;

        var component = this.component;
        var rootlevel = this.rootlevel;
        var displaynodes = this.displaynodes;

        var nodes = new vis.DataSet();
        d3.keys(component.nodes).forEach(function (k) {
            var d = component.nodes[k];
            d.id = d.name;
            d.label = d.name;
            d.level -= rootlevel;
            d.shape = 'image';

            d.borderColor = "#FFFFFF";
            d.shapeProperties = {
                useBorderWithImage: true
            };

            d.image = thisLib.nodeImg[d.name];
            d.brokenImage = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+ip1sAAAAASUVORK5CYII";

            d.size = d.height / thisLib.magicNumberForHeightScaleRatio;


            if (displaynodes[k] != 1) {
                //d.hidden = true;
            } else {
                //d.hidden = false;
                nodes.update(d);
            }
        });


        var edges = new vis.DataSet();
        d3.keys(component.edges).forEach(function (k) {
            component.edges[k].forEach(function(e) {
                e.arrows = 'middle';
                if (e.type == 'equals') {
                    e.color = {color:'red'};
                } else if (e.type == 'contains') {
                    e.color = {color: 'blue'};
                }
                if ((e.to in displaynodes)&&(e.from in displaynodes)){
                    edges.update(e);
                }
            });
        });

        // create a network
        var data = {
            nodes: nodes,
            edges: edges
        };
        var options = {
            layout: {
                hierarchical: {
                    direction: 'UD',
                    enabled: true,
                    levelSeparation: thisLib.verticalSpace, // the default value is 150
                    nodeSpacing: thisLib.horizontalSpace // might be affected by physics engine, default value 100
                }
            },
            manipulation: {
                enabled: false,
                initiallyActive: true,
                addNode: false,
                addEdge:  function(edgeData,callback) {
                    console.log(JSON.stringify(edgeData,null,4));
                    var lvl = nodes._data[edgeData.from].level;
                    d3.values(edges._data).forEach(function (e) {
                        if ((e.to == edgeData.to) && (e.id != edgeData.id)) {
                            if (nodes._data[e.from].level > lvl) {
                                lvl = nodes._data[e.from].level;
                            }
                        }
                    });
                    nodes._data[edgeData.to].level = (lvl + 1);
                    callback(edgeData);
                    forceredraw(false);
                },
                editEdge: function(edgeData,callback) {
                    console.log(JSON.stringify(edgeData,null,4));
                    var lvl = nodes._data[edgeData.from].level;
                    d3.values(edges._data).forEach(function (e) {
                        if ((e.to == edgeData.to) && (e.id != edgeData.id)) {
                            if (nodes._data[e.from].level > lvl) {
                                lvl = nodes._data[e.from].level;
                            }
                        }
                    });
                    nodes._data[edgeData.to].level = (lvl + 1);
                    callback(edgeData);
                    forceredraw(false);
                },
                deleteEdge: function(edgeData,callback){
                    callback(edgeData);
                    forceredraw(false);
                }
            },
            physics: {
                enabled: false,
                hierarchicalRepulsion: {
                    springConstant: 0.3,
                    nodeDistance: thisLib.horizontalSpace
                }
            },
            nodes: {
                borderWidth: 0,
                borderWidthSelected: 2,
                chosen: true,
                color: {
                    border: '#FFFFFF',
                    background: '#FFFFFF',
                    highlight: {
                        border: '#2B7CE9',
                        background: '#FFFFFF'
                    },
                    hover: {
                        border: '#2B7CE9',
                        background: '#FFFFFF'
                    }
                }
            }
        };
        thisLib.nodes = nodes;
        thisLib.edges = edges;
        thisLib.options = options;

        this.network.setOptions(options);
        forceredraw(true);

        function forceredraw(init){
            thisLib.network.setData(data);
            function drawNavi(){
                if (init){
                    thisLib.network.fit(thisLib.naviInitial());
                }
                else {
                    thisLib.naviInitial();
                }
            }
            function temp(){
                setTimeout(drawNavi,50);
            }
            if (thisLib.para.display.enableNavi ){
                thisLib.network.once('afterDrawing', temp, false);
            }
        }

        var d = new Date();
        var lastclick = d.getTime();


        thisLib.network.on("doubleClick",zoomWhenDoubleClicked);
        function zoomWhenDoubleClicked(data){
            var selectnode = data.nodes;
            var connectednode = [];
            if (selectnode.length > 0){
                connectednode = thisLib.network.getConnectedNodes(selectnode);
                connectednode.push(selectnode);
            }

            if (connectednode.length > 1) {
                thisLib.network.fit({
                    nodes: connectednode,
                    animation: true
                });
            }
        }

        thisLib.network.on("doubleClick",highlightWhenDoubleClicked);
        function highlightWhenDoubleClicked(data){
            var selectnode = data.nodes;
            if (selectnode == undefined){
                selectnode = [];
            }
            if (selectnode.length > 0){
                var highLightNodes = [];
                selectnode.forEach(function(node){
                    var connectedNodes = thisLib.network.getConnectedNodes(node);
                    highLightNodes = highLightNodes.concat(connectedNodes);
                    highLightNodes.push(node);
                });

                highLightNodes.forEach(function(nodeID){
                    // Alternative way to highlight the node - Enlarge the node
                    //nodes._data[nodeID].size = nodes._data[nodeID].size * 1.5;
                });

                thisLib.network.selectNodes(highLightNodes);

                //forceredraw(false);

            }
        }


        // Context menu, pop-up when you right click
        thisLib.div_network.addEventListener("contextmenu",rightClickMenuGenerator,false);

        function rightClickMenuGenerator(clickData){
            //console.log(clickData);
            document.addEventListener("click",clearEverythingInContextMenu,{once: true});

            var menuELE = thisLib.div_contextMenu;
            var menuList = document.createElement("dl");

            clearEverythingInContextMenu();
            //var x = clickData.pointer.DOM.x;
            //var y = clickData.pointer.DOM.y;
            var x = clickData.layerX;
            var y = clickData.layerY;
            clickData.preventDefault();

            var root = thisLib.rootname;
            //var selectedNodes = thisLib.network.getSelectedNodes();
            var selectedNode = thisLib.network.getNodeAt({x:x,y:y});
            var selectedNodes = [ selectedNode ];
            var connectedNodes = [];

            //updateList("Close Menu","dt");
            menuELE.style = "margin: 0; padding: 0; overflow: hidden; position: absolute; left: "+x+"px; top: "+y+"px; background-color: #333333; border: none; ";//width: 100px; height: 100px

            updateList("Jump to Composition:", "dt");
            updateList(root, "dd");

            if (selectedNode !== undefined){
                selectedNodes.forEach(function(nodeID){
                    var c0 = thisLib.network.getConnectedNodes(nodeID);
                    connectedNodes = connectedNodes.concat(c0);
                });

                updateList("Jump to Selected Nodes:","dt");
                selectedNodes.forEach(function(nodeID){
                    updateList(nodeID,"dd");
                });

                if (connectedNodes.length > 0){
                    updateList("Jump to Connected Nodes:","dt");
                    connectedNodes.forEach(function(nodeID){
                        updateList(nodeID,"dd");
                    });
                }
            }

            menuELE.appendChild(menuList);

            function updateList(id,DOMType){
                // dds are used to call functions
                // dts are just descriptive words

                var entry = document.createElement(DOMType);
                entry.style = "display: block; color: white; text-align: left; padding: 5px; text-decoration: none;";
                entry.onmouseover = function(d){
                    entry.style = "display: block; color: white; text-align: left; padding: 5px; text-decoration: none; background-color: #111111";
                };
                entry.onmouseout = function(d){
                    entry.style = "display: block; color: white; text-align: left; padding: 5px; text-decoration: none; background-color: #333333";
                };
                entry.innerHTML = id;
                if(id == "Close Menu"){
                    entry.onclick = function(){
                        clearEverythingInContextMenu();
                    }
                }
                else if (DOMType == "dd"){
                    entry.onclick = function(){
                        var para = thisLib.para;
                        para.essentials.viewRoot = id;
                        thisLib.init(para)
                    }
                }
                menuList.appendChild(entry);
                return 0;

            }


        }

        function clearEverythingInContextMenu(){
            //console.log("closing");
            var menuELE = thisLib.div_contextMenu;
            while (menuELE.firstChild){
                menuELE.removeChild(menuELE.firstChild);
            }
            menuELE.style = "";
        }

    },



    // *********************************************************
    // ******************* Mini Map Function *******************
    // *********************************************************

    // The "global variables" for Mini-map are declared here
    fitScale : 0,
    fitPos : 0,
    rectPointer : 0,
    naviWindowWidth : 0,
    naviWindowHeight : 0,

    naviInitial : function (){
        var thisLib = this;
        var currentScale = this.network.getScale();
        var currentPos = this.network.getViewPosition();

        while(thisLib.div_navi.firstChild){
            thisLib.div_navi.remove(thisLib.div_navi.firstChild)
        }

        var css = thisLib.naviWindowPos() + " background-color: #f2ffff; height: "+ thisLib.naviWindowHeight + "px; width: " + thisLib.naviWindowWidth + "px;";
        thisLib.div_navi.style = css;

        var naviNetworkContainer = document.createElement("div");
        naviNetworkContainer.style = "position: absolute; border: 1px solid lightgray; height: 100%; width: 100%";

        thisLib.div_navi.appendChild(naviNetworkContainer);
        var naviNetwork = new vis.Network(naviNetworkContainer);
        var data, nodes, edges, options;
        nodes = thisLib.nodes;
        edges = thisLib.edges;
        options = thisLib.options;
        data = {
            nodes: nodes,
            edges: edges
        };
        naviNetwork.setOptions(options);
        naviNetwork.setData(data);

        thisLib.rectPointer = document.createElement("canvas");
        thisLib.rectPointer.setAttribute("style","position: absolute; border: 1px solid lightgray;"); // border: 1px solid lightgray
        thisLib.rectPointer.setAttribute("width",thisLib.naviWindowWidth);
        thisLib.rectPointer.setAttribute("height",thisLib.naviWindowHeight);
        //thisLib.rectPointer.setAttribute("id","glycanviewer_rect");

        thisLib.div_navi.appendChild(thisLib.rectPointer);

        thisLib.fitScale = thisLib.network.getScale();
        thisLib.fitPos = thisLib.network.getViewPosition();

        thisLib.whereAmI();


        //this.network.fit(capture());

        function capture(){
            var networkCanvas = thisLib.div_network.getElementsByTagName("canvas")[0];
            var image,
                dataURI = networkCanvas.toDataURL();
            thisLib.naviWindowSizeCalc();
            image = document.createElement('img');
            image.src = dataURI;
            image.width = thisLib.naviWindowWidth;
            image.height = thisLib.naviWindowHeight;
            image.setAttribute("style","position: absolute; background-color: #f2ffff; border: 1px solid lightgray;"); // border: 1px solid lightgray

            var navi = thisLib.div_navi;
            navi.setAttribute("style",thisLib.naviWindowPos());
            while (navi.childElementCount > 0) {
                navi.removeChild(navi.children[0]);
            }
            navi.appendChild(image);

            thisLib.rectPointer = document.createElement("canvas");
            thisLib.rectPointer.setAttribute("style","position: absolute; border: 1px solid lightgray;"); // border: 1px solid lightgray
            thisLib.rectPointer.setAttribute("width",thisLib.naviWindowWidth);
            thisLib.rectPointer.setAttribute("height",thisLib.naviWindowHeight);
            thisLib.rectPointer.setAttribute("id","glycanviewer_rect");

            navi.appendChild(thisLib.rectPointer);
            thisLib.fitScale = thisLib.network.getScale();
            thisLib.fitPos = thisLib.network.getViewPosition();
            moveBack();

        }

        function moveBack(){
            thisLib.network.moveTo(
                {
                    position: {x:currentPos.x, y:currentPos.y},
                    scale: currentScale,
                    offset: {x:0, y:0}
                },thisLib.whereAmI()
            );
            //console.log(currentPos);
            return 0;
        }
    },

    whereAmI : function (){
        var thisLib = this;

        working();
        //thisLib.div_network.eventListeners = null;
        thisLib.div_network.addEventListener('click', working);
        thisLib.div_network.addEventListener('wheel', working);
        thisLib.div_network.addEventListener('touchend', working);

        function working(){
            var ctx = thisLib.rectPointer.getContext("2d");
            ctx.clearRect(0, 0, thisLib.rectPointer.width, thisLib.rectPointer.height);
            ctx.beginPath();

            var rectWidth, rectHeight, rectRatio, dx, dy;
            var canvas2thumbnailScale;
            var currentScale = thisLib.network.getScale();
            var currentPos = thisLib.network.getViewPosition();

            rectRatio = thisLib.fitScale / currentScale;
            rectWidth = thisLib.naviWindowWidth * rectRatio;
            rectHeight = thisLib.naviWindowHeight * rectRatio;

            var networkCanvas = thisLib.div_network.getElementsByTagName("canvas")[0];
            canvas2thumbnailScale = thisLib.naviWindowWidth / networkCanvas.width;

            dx = (currentPos.x - thisLib.fitPos.x)*thisLib.fitScale*canvas2thumbnailScale - 0.5*(rectWidth - thisLib.naviWindowWidth);
            dy = (currentPos.y - thisLib.fitPos.y)*thisLib.fitScale*canvas2thumbnailScale - 0.5*(rectHeight - thisLib.naviWindowHeight);

            // Consider page zooming issue
            // Not sure whether it will work with browser other than chrome
            var wholePageZoomLevel = thisLib.getZoomLevel();

            // This formula is use to compensate for window scale
            dx = (currentPos.x - thisLib.fitPos.x)*thisLib.fitScale*canvas2thumbnailScale * wholePageZoomLevel - 0.5*(rectWidth - thisLib.naviWindowWidth);
            dy = (currentPos.y - thisLib.fitPos.y)*thisLib.fitScale*canvas2thumbnailScale * wholePageZoomLevel - 0.5*(rectHeight - thisLib.naviWindowHeight);

            // complement the whole rectangle
            var x1, x2, y1, y2;
            x1 = (dx > 0)&&(dx < thisLib.naviWindowWidth);
            x2 = (dx+rectWidth > 0)&&(dx+rectWidth < thisLib.naviWindowWidth);
            y1 = (dy > 0)&&(dy < thisLib.naviWindowHeight);
            y2 = (dy+rectHeight > 0)&&(dy+rectHeight < thisLib.naviWindowHeight);

            // console.log([dx,dy]);
            ctx.lineWidth = 2;
            ctx.strokeStyle = "orange";
            ctx.rect(dx,dy,rectWidth,rectHeight);
            if (!x1){ctx.rect(1,dy,0,rectHeight);}
            if (!x2){ctx.rect(thisLib.naviWindowWidth - 1,dy,0,rectHeight);}
            if (!y1){ctx.rect(dx,1,rectWidth,0);}
            if (!y2){ctx.rect(dx,thisLib.naviWindowHeight - 1,rectWidth,0);}
            ctx.stroke();
        }

    },

    naviWindowSizeCalc : function (){
        var networkCanvas = this.div_network.getElementsByTagName("canvas")[0];
        var percentage = this.para.display.naviOption.size;
        var devicePixelRatio = window.devicePixelRatio;
        var w1 = Math.round(networkCanvas.width * percentage / devicePixelRatio);
        var h1 = Math.round(networkCanvas.height * percentage / devicePixelRatio);

        this.naviWindowWidth = w1;
        this.naviWindowHeight = h1;

        return 0;
    },

    getZoomLevel : function () {
        var level = this.div_network.getElementsByTagName("canvas")[0].width / this.div_root.clientWidth;
        return level
    },

    naviWindowPos : function (){
        this.naviWindowSizeCalc();
        var h = this.naviWindowHeight;
        var w = this.naviWindowWidth;
        var pos = this.para.display.naviOption.position;

        var tl2t = 0,
            tl2b = 0,
            tl2r = 0,
            tl2l = 0;
        var css = "position: absolute; ";

        if (pos == 1 || pos == 3){
            tl2l = w / 10;
            css += "left: "+tl2l+"px; "
        }

        if (pos == 2 || pos == 4){
            //tl2r = this.div_root.clientWidth - w * 1.1;
            tl2r = w / 10;
            css += "right: "+tl2r+"px; "
        }

        if (pos == 1 || pos == 2){
            tl2t = h / 10;
            css += "top: "+ tl2t +"px; "
        }

        if (pos == 3 || pos == 4){
            tl2b = h / 10;
            if (this.para.display.enableTitle)
            {
                tl2b = tl2b + 27;
            }
            css += "bottom: "+tl2b+"px; "
        }
        return css;
    },

    // *********************************************************
    // ******************* Helper  Function ********************
    // *********************************************************

    // *********************************************************
    // ********************** IE Related ***********************
    // *********************************************************

    IEQuestionMark : function(){
        var ua = window.navigator.userAgent;
        var msie = ua.indexOf("MSIE ");

        return (msie > 0 || !!navigator.userAgent.match(/Trident.*rv\:11\./))
    },

    compatibleDraw : function(para){

        var component = para.essentials.component;

        var rootname = component.root;
        var topoonly = para.essentials.topoOnly;

        if (para.essentials.viewRoot){
            rootname = para.essentials.viewRoot;
        }
        recomputeLevels(component);

        function recomputeLevels(component) {
            var toexplore = [ component.root ];
            var r;
            while (true) {
                if (toexplore.length == 0) {
                    break;
                }
                r = toexplore.pop();
                var rlevel = component.nodes[r].level;
                if (r in component.edges) {
                    component.edges[r].forEach(function(e) {
                        if (component.nodes[e.to].level < (rlevel+1)) {
                            component.nodes[e.to].level = (rlevel+1);
                        }
                        toexplore.push(e.to);
                    });
                }
            }
        }

        // Loading the title
        var div_root = document.getElementById(para.essentials.div_ID);
        while(div_root.firstChild){
            div_root.removeChild(div_root.firstChild);
        }
        var id = para.essentials.div_ID + "_glycanviewer_";

        var networkContainer = document.createElement("div");
        networkContainer.id = id+"networkContainer";
        networkContainer.setAttribute("style","width: 100%; height: 90%;position: relative; left: 0; top: 0;");
        var header = document.createElement("h2");
        header.innerHTML = "For better user experience and new features, Please Please Please use modern browsers";

        div_root.appendChild(header);
        div_root.appendChild(networkContainer);

        var network = new vis.Network(networkContainer);

        var displaynodes = {};
        var toexplore = [ rootname ];
        var parentnode;
        var rootlevel = component.nodes[rootname].level;

        while (true) {
            if (toexplore.length == 0) {
                break;
            }
            var r = toexplore.pop();
            if (topoonly == 1) {
                if (component.nodes[r].type != 'Saccharide') {
                    displaynodes[r] = 1;
                }
            } else {
                displaynodes[r] = 1;
            }
            d3.keys(component.edges).forEach(function (k) {
                component.edges[k].forEach(function(e) {
                    if (e.from == r) {
                        toexplore.push(e.to);
                    }
                    if (e.to == rootname) {
                        parentnode = e.from;
                    }
                })
            });
        }


        // Calculate the nodeSpace and height scale ratio
        var nodeImageScaleRatioComparedToDefaultSetting = 2.0, // It means how many fold larger do you want your node to present
            nodeHorizotalSpaceRatio = 0.95;
        // How many ford larger do you want the node space to be. 1 means just no overlap
        var allWidth = [],
            allHeight = [];
        var greatestWidth = 0,
            greatestHeight = 0;
        var verticalSpace = 150,
            horizontalSpace = 150; //those 2 values are default value

        d3.keys(component.nodes).forEach(function (k) {
            var d = component.nodes[k];
            if (displaynodes[k] == 1) {
                allWidth.push(d.width);
                allHeight.push(d.height);
            }
        });

        allWidth.sort(function(a, b){return b-a});
        allHeight.sort(function(a, b){return b-a});
        greatestWidth = allWidth[0];
        greatestHeight = allHeight[0];

        var magicNumberForHeightScaleRatio = greatestHeight/nodeImageScaleRatioComparedToDefaultSetting/25;
        horizontalSpace = 25 * nodeImageScaleRatioComparedToDefaultSetting / greatestHeight * greatestWidth * nodeHorizotalSpaceRatio *2;

        var nodes = new vis.DataSet();
        d3.keys(component.nodes).forEach(function (k) {
            var d = component.nodes[k];
            d.id = d.name;
            d.label = d.name;
            d.level -= rootlevel;
            d.shape = 'image';
            //d.image = "http://glytoucan.org/glycans/"+d.name+"/image?style=extended&format=png&notation=cfg";
            d.image = para.essentials.imgURL + d.name + '.png';

            d.size = d.height / magicNumberForHeightScaleRatio;


            if (displaynodes[k] != 1) {
                d.hidden = true;
            } else {
                d.hidden = false;
                nodes.update(d);
            }
        });


        var edges = new vis.DataSet();
        d3.keys(component.edges).forEach(function (k) {
            component.edges[k].forEach(function(e) {
                e.arrows = 'middle';
                if (e.type == 'equals') {
                    e.color = {color:'red'};
                } else if (e.type == 'contains') {
                    e.color = {color: 'blue'};
                }
                edges.update(e);
            });
        });

        // create a network
        var data = {
            nodes: nodes,
            edges: edges
        };
        var options = {
            layout: {
                hierarchical: {
                    direction: 'UD',
                    enabled: true,
                    levelSeparation: verticalSpace, // the default value is 150
                    nodeSpacing: horizontalSpace // might be affected by physics engine, default value 100
                }
            }
        };

        network.setOptions(options);
        network.setData(data);
        network.fit()

    }


};