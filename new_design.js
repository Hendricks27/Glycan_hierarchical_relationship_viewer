"use strict";

var glycanviewer = {
    // The "global variables" are declared here
    // It is not necessary to do so
    // It is just a reminder of I can use this "things" directly

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
            this.allocateDiv();
            this.getJson();
        }
    },

    // Check the integrity and legitimacy of the parameters
    paraCheck : function (para){
        var checked = para;
        if (!para.navi.size){
            checked.navi.size = 0.15;
        }
        if (!para.navi.position){
            checked.navi.position = 4;
        }
        if (![1,2,3,4].includes(para.navi.position)){
            checked.navi.position = 4;
        }
        return checked
    },

    // Allocate the DIV
    allocateDiv: function () {
        var thisLib = this;

        // This variable stands for the prefix of the div id.
        var id = this.para.content.div_id + "_glycanviewer_";

        //Locate the div && pre allocate space for each gadgets
        this.div_root = document.getElementById(thisLib.para.content.div_id);
        while (thisLib.div_root.firstChild){
            thisLib.div_root.removeChild(thisLib.div_root.firstChild);
            console.log("removing");
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

        this.div_realStuff.appendChild(this.div_network);
        this.div_realStuff.appendChild(this.div_navi);

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
        var topoonly = this.para.content.topoonly;

        this.rootname = rootname;
        this.topoonly = topoonly;


        if (this.para.content.view_root){
            rootname = this.para.content.view_root;
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
        if (this.para.display.enable_title){
            var header = document.createElement("h2");
            header.style = "margin: 1px;";
            this.div_header.appendChild(header);
            header.innerHTML = rootname + " (" + component.mw + ") - " + "Level " + component.nodes[rootname].level;
        }



        this.network = new vis.Network(thisLib.div_network);

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
        this.rootlevel = rootlevel;
        this.displaynodes = displaynodes;



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
                thisLib.resouceStatus[d.name] = false;
                thisLib.getBase64Image(d.name);
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

        var magicNumberForHeightScaleRatio = greatestHeight/nodeImageScaleRatioComparedToDefaultSetting/25;
        horizontalSpace = 25 * nodeImageScaleRatioComparedToDefaultSetting / greatestHeight * greatestWidth * nodeHorizotalSpaceRatio *2;

        this.magicNumberForHeightScaleRatio = magicNumberForHeightScaleRatio;
        this.verticalSpace = verticalSpace;
        this.horizontalSpace = horizontalSpace;


    },

    getBase64Image : function (accession){
        var thisLib = this;

        var imgURL = this.para.content.img_url + accession + ".png";

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
            //d.image = "http://glytoucan.org/glycans/"+d.name+"/image?style=extended&format=png&notation=cfg";
            //d.image = thisLib.para.content.img_url+d.name+'.png';

            d.image = thisLib.nodeImg[d.name];

            d.size = d.height / thisLib.magicNumberForHeightScaleRatio;


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
            }
        };

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
            if (thisLib.para.navi.enable ){
                thisLib.network.once('afterDrawing', temp, false);
            }
        }

        var d = new Date();
        var lastclick = d.getTime();



        var doubleClickTime = 0;
        var threshold = 200;
        function onClick(params) {
            var t0 = new Date();
            if (t0 - doubleClickTime > threshold) {
                setTimeout(function () {
                    if (t0 - doubleClickTime > threshold) {
                        doOnClick(params);
                    }
                },threshold);
            }
        }

        function doOnClick(params) {
            if (params['nodes'].length != 1) {
                return;
            }
            var id = params['nodes'][0];
            if (id == rootname) {
                if (parentnode) {
                    window.location.href='network1.html?'+parts[0]+'&'+parts[1]+'&'+parts[2]+"&"+parentnode;
                }
            } else {
                window.location.href='network1.html?'+parts[0]+'&'+parts[1]+'&'+parts[2]+"&"+id;
            }
        }

        function onDoubleClick(params) {
            doubleClickTime = new Date();
            if (params['nodes'].length != 1) {
                return;
            }
            var id = params['nodes'][0];
            window.open('http://edwardslab.bmcb.georgetown.edu/smw/'+id,'_blank');
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
        this.network.fit(capture());

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
        var percentage = this.para.navi.size;
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

        var tl2b = 0,
            tl2l = 0;

        if (this.para.navi.position == 1){
            tl2l = 10;
            tl2b = this.div_root.clientHeight - 10 ;
            if (this.para.display.enable_title)
            {
                tl2b = tl2b - 30;
            }

        }

        if (this.para.navi.position == 2){
            tl2l = this.div_root.clientWidth - this.naviWindowWidth * 1.1 ;
            tl2b = this.div_root.clientHeight - 10 ;
            if (this.para.display.enable_title)
            {
                tl2b = tl2b - 30;
            }
        }

        if (this.para.navi.position == 3){
            tl2b = this.naviWindowHeight + 10;
            if (this.para.display.enable_title)
            {
                tl2b = tl2b + 30;
            }

            tl2l = 10 ;
        }

        if (this.para.navi.position == 4){
            tl2b = this.naviWindowHeight + 10;
            if (this.para.display.enable_title)
            {
                tl2b = tl2b + 30;
            }

            tl2l = this.div_root.clientWidth - this.naviWindowWidth * 1.1 ;
        }

        var css = "position: absolute; bottom: " + tl2b + "px; left: " + tl2l + "px;";
        return css


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
        d3.json(para.content.json_url, function(data){
            var component = data[para.content.composition];

            var rootname = component.root;
            var topoonly = para.content.topoonly;

            if (para.content.view_root){
                rootname = para.content.view_root;
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
            var div_root = document.getElementById(para.content.div_id);
            while(div_root.firstChild){
                div_root.removeChild(div_root.firstChild);
            }
            var id = para.content.div_id + "_glycanviewer_";

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
                d.image = para.content.img_url+d.name+'.png';

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
        });
    }


};