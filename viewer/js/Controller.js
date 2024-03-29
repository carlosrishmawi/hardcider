/*
 * https://github.com/btfou/hardcider
 *
 * here's where the app is built
 */
define([
    './js/settings.js', //app settings
    'dojo/_base/array', //dojo base and dom
    'dojo/_base/lang',
    'dojo/_base/fx',
    'dojo/dom-construct',
    'dojo/dom-style',
    'hardcider/Layout', //the layout class builds and controls the layout
    'hardcider/Map', //extended map class
    'hardcider/iquert/IQueRT', //Identify Query Results Tables - all in one
    'hardcider/draw/Draw', //draw module
    'hardcider/draw/DrawProjects', //draw projects saving
    'hardcider/dijit/OverlayControlContainer', //overlay layers control container (just don't call it a TOC)
    'hardcider/dijit/VectorControlContainer', //vector layers control container (just don't call it a TOC)
    'hardcider/dijit/Measure', //measure
    'hardcider/dijit/AddArcGISService', //add ags services widget
    'hardcider/dijit/AddWebTiledService', //add web tiled widget
    'dijit/form/Button', //a few dijits for the toolbar
    'dijit/form/DropDownButton',
    'dijit/ToolbarSeparator',
    'dijit/Menu',
    'dijit/MenuItem',
    'esri/dijit/Geocoder' //esri geocode
], function(
    settings,
    array,
    lang,
    baseFx,
    domConst,
    domStyle,
    Layout,
    Map,
    IQueRT,
    Draw,
    DrawProjects,
    OverlayControlContainer,
    VectorControlContainer,
    Measure,
    AddArcGISService,
    AddWebTiledService,
    Button,
    DropDownButton,
    ToolbarSeparator,
    Menu,
    MenuItem,
    Geocoder
) {
    'use strict';
    return {
        //rock and roll
        build: function(loadingNode, applicationNode) {
            if (!loadingNode || !applicationNode) {
                console.log('Controller error::loadingNode and applicationNode are required');
                return;
            }
            //build layout
            this.layout = new Layout(applicationNode);
            this.layout.build();

            //the map
            this.map = new Map('map-panel', settings.map);

            //let's do the rest after map loads
            // so many classes require a loaded map
            // this prevents all map not loaded errors
            // seems to load smoother and w/o performance loss
            this.map.on('load', lang.hitch(this, function(r) {
                //the map and layout objects
                var map = r.map,
                    layout = this.layout;

                //add overlay control container
                this.overlayControlContainer = new OverlayControlContainer({
                    map: map,
                    basemapCount: map.basemaps.count
                }, 'layers-overlays');

                //add vector control container
                this.vectorControlContainer = new VectorControlContainer({
                    map: map, //the map
                    includeDrawLayers: true //init and add draw layers (true by default)
                }, 'layers-features');
                this.vectorControlContainer.startup();

                //the draw module
                this.draw = new Draw({
                    map: map, //the map
                    drawLayers: this.vectorControlContainer.drawLayers
                });
                var draw = this.draw;
                this.drawProjects = new DrawProjects({
                    draw: this.draw,
                    pouchDbName: settings.drawProjects.pouchDbName,
                    couchDbUrl: settings.drawProjects.couchDbUrl,
                    couchDbGetProjectsUrl: settings.drawProjects.couchDbGetProjectsUrl
                });

                //iquert - Identify Query Results Tables
                this.vectorControlContainer.addLayer({
                    type: 'application',
                    id: 'gl_iquert_results',
                    print: false
                });
                this.iquert = new IQueRT({
                    map: map,
                    draw: this.draw,
                    resultsNode: 'iquert-results',
                    resultsLayerId: 'gl_iquert_results',
                    showResults: function() {
                        layout.left.selectChild(layout.iquertTab.id);
                        layout.iquertTab.selectChild('iquert-results-tab');
                    },
                    queryNode: 'iquert-query',
                    showQuery: function() {
                        layout.left.selectChild(layout.iquertTab.id);
                        layout.iquertTab.selectChild('iquert-query-tab');
                    },
                    queryBuilderNode: 'iquert-query-builder',
                    showQueryBuilder: function() {
                        layout.left.selectChild(layout.iquertTab.id);
                        layout.iquertTab.selectChild('iquert-query-builder-tab');
                    },
                    attributeTableContainer: layout.bottom,
                    showAttributeTable: function() {
                        layout.toggleRegion(layout.bottom, 'show');
                    }
                });
                //set layer container iquert
                this.overlayControlContainer.iquert = this.iquert;
                //this.featureContainer.iquert = this.iquert;

                //load overlay layers
                array.forEach(settings.overlays, function(overlay) {
                    this.overlayControlContainer.addLayer(overlay);
                }, this);

                //load vector layers
                array.forEach(settings.features, function(feature) {
                    this.vectorControlContainer.addLayer(feature);
                }, this);

                //geocoder
                var geocoder = new Geocoder({
                    map: map,
                    autoComplete: true,
                    arcgisGeocoder: {
                        sourceCountry: 'USA'
                    }
                }, 'geocoder');
                geocoder.startup();
                geocoder.hide();

                //measure
                var measure = new Measure({
                    map: map
                }, 'measure');
                measure.startup();

                //build toolbar
                var tb = layout.toolbar;
                //map toolbar
                tb.addItem(new DropDownButton({
                    toolbarGroup: 'map',
                    label: 'Basemaps',
                    showLabel: true,
                    iconClass: 'iconMap',
                    title: 'Select a basemap',
                    dropDown: map.basemaps.menu
                }));
                tb.addItem(new ToolbarSeparator({
                    toolbarGroup: 'map'
                }));
                tb.addItem(new Button({
                    label: 'Default Extent',
                    showLabel: false,
                    title: 'Default map extent',
                    iconClass: 'iconZoomExtent',
                    toolbarGroup: 'map',
                    onClick: function() {
                        if (settings.map.center && settings.map.zoom) {
                            map.centerAndZoom(settings.map.center, settings.map.zoom);
                        } else if (settings.map.extent) {
                            map.setExtent(settings.map.extent, true);
                        }
                    }
                }));
                tb.addItem(new Button({
                    label: 'Zoom Previous',
                    showLabel: false,
                    title: 'Zoom previous',
                    iconClass: 'iconZoomLast',
                    toolbarGroup: 'map',
                    onClick: function() {
                        map.navToolbar.zoomToPrevExtent();
                    }
                }));
                tb.addItem(new Button({
                    label: 'Zoom Next',
                    showLabel: false,
                    title: 'Zoom next',
                    iconClass: 'iconZoomNext',
                    toolbarGroup: 'map',
                    onClick: function() {
                        map.navToolbar.zoomToNextExtent();
                    }
                }));
                tb.addItem(new ToolbarSeparator({
                    toolbarGroup: 'map'
                }));
                
                
                //awaiting map save
                /*tb.addItem(new Button({
                    toolbarGroup: 'map',
                    label: 'Save',
                    showLabel: false,
                    iconClass: 'iconDisk',
                    title: 'Save a map',
                    onClick: function() {
                        map.alert('Sorry no map save...yet.');
                    }
                }));
                tb.addItem(new Button({
                    toolbarGroup: 'map',
                    label: 'Load',
                    showLabel: false,
                    iconClass: 'iconFolder',
                    title: 'Load a map',
                    onClick: function() {
                        map.alert('Sorry no map load...yet.');
                    }
                }));
                tb.addItem(new ToolbarSeparator({
                    toolbarGroup: 'map'
                }));*/
                
                
                tb.addItem(new Button({
                    toolbarGroup: 'map',
                    label: 'Measure',
                    showLabel: false,
                    iconClass: 'iconMeasure',
                    title: 'Measure location, distance and area',
                    onClick: function() {
                        layout.left.selectChild(layout.toolsTab.id);
                        layout.toolsTab.selectChild('measure-tab');
                    }
                }));
                tb.addItem(new Button({
                    toolbarGroup: 'map',
                    label: 'Print',
                    showLabel: false,
                    iconClass: 'iconPrint',
                    title: 'Print a PDF of the map',
                    onClick: function() {
                        layout.left.selectChild(layout.toolsTab.id);
                        layout.toolsTab.selectChild('print-tab');
                    }
                }));
                tb.addItem(new Button({
                    toolbarGroup: 'map',
                    label: 'Geocoder',
                    showLabel: false,
                    iconClass: 'iconSearchBox',
                    title: 'Show geocoder',
                    onClick: function() {
                        if (domStyle.get(geocoder.domNode, 'display') === 'block') {
                            geocoder.hide();
                            this.set('title', 'Show geocoder');
                        } else {
                            geocoder.show();
                            this.set('title', 'Hide geocoder');
                        }
                    }
                }));
                tb.addItem(new ToolbarSeparator({
                    toolbarGroup: 'map'
                }));
                
                //custom map toolbar items here

                //draw toolbar
                tb.addItem(new DropDownButton({
                    toolbarGroup: 'draw',
                    label: 'Projects',
                    showLabel: true,
                    title: 'Manage drawing projects',
                    dropDown: this.drawProjects.menu
                }));
                tb.addItem(new ToolbarSeparator({
                    toolbarGroup: 'draw'
                }));
                tb.addItem(new Button({
                    toolbarGroup: 'draw',
                    label: 'Undo',
                    showLabel: false,
                    iconClass: 'iconUndo',
                    title: 'Undo last draw operation',
                    onClick: function() {
                        draw.undo.undo();
                    }
                }));
                tb.addItem(new Button({
                    toolbarGroup: 'draw',
                    label: 'Redo',
                    showLabel: false,
                    iconClass: 'iconRedo',
                    title: 'Redo last draw operation',
                    onClick: function() {
                        draw.undo.redo();
                    }
                }));
                tb.addItem(new ToolbarSeparator({
                    toolbarGroup: 'draw'
                }));
                tb.addItem(new Button({
                    toolbarGroup: 'draw',
                    label: 'Point',
                    showLabel: false,
                    iconClass: 'iconPoint',
                    title: 'Add a point',
                    onClick: function() {
                        draw.draw('point');
                    }
                }));
                tb.addItem(new Button({
                    toolbarGroup: 'draw',
                    label: 'Polyline',
                    showLabel: false,
                    iconClass: 'iconPolyline',
                    title: 'Draw a polyline',
                    onClick: function() {
                        draw.draw('polyline');
                    }
                }));
                tb.addItem(new Button({
                    toolbarGroup: 'draw',
                    label: 'Polygon',
                    showLabel: false,
                    iconClass: 'iconPolygon',
                    title: 'Draw a polygon',
                    onClick: function() {
                        draw.draw('polygon');
                    }
                }));
                var freehandMenu = new Menu();
                freehandMenu.addChild(new MenuItem({
                    label: 'Polyline',
                    onClick: function() {
                        draw.draw('freehandpolyline');
                    }
                }));
                freehandMenu.addChild(new MenuItem({
                    label: 'Polygon',
                    onClick: function() {
                        draw.draw('freehandpolygon');
                    }
                }));
                freehandMenu.startup();
                tb.addItem(new DropDownButton({
                    toolbarGroup: 'draw',
                    label: 'Freehand',
                    showLabel: false,
                    iconClass: 'iconFreehand',
                    title: 'Draw freehand',
                    dropDown: freehandMenu
                }));
                var shapesMenu = new Menu();
                shapesMenu.addChild(new MenuItem({
                    label: 'Rectangle',
                    onClick: function() {
                        draw.draw('extent');
                    }
                }));
                shapesMenu.addChild(new MenuItem({
                    label: 'Circle',
                    onClick: function() {
                        draw.draw('circle');
                    }
                }));
                shapesMenu.startup();
                tb.addItem(new DropDownButton({
                    toolbarGroup: 'draw',
                    label: 'Shapes',
                    showLabel: false,
                    iconClass: 'iconShape',
                    title: 'Draw shapes',
                    dropDown: shapesMenu
                }));
                tb.addItem(new Button({
                    toolbarGroup: 'draw',
                    label: 'Text',
                    title: 'Add text',
                    showLabel: false,
                    iconClass: 'iconText',
                    onClick: function() {
                        draw.draw('point', 'text');
                    }
                }));
                tb.addItem(new ToolbarSeparator({
                    toolbarGroup: 'draw'
                }));
                tb.addItem(new DropDownButton({
                    toolbarGroup: 'draw',
                    label: 'Options',
                    showLabel: false,
                    iconClass: 'iconCog',
                    title: 'Draw options',
                    dropDown: this.draw.optionsMenu
                }));
                
                //add layer widgets
                this.addLayerWidgets = {}; //for easy debugging
                //add arcgis service
                this.addLayerWidgets.arcgisService = new AddArcGISService({
                    overlayControlContainer: this.overlayControlContainer,
                    vectorControlContainer: this.vectorControlContainer,
                    onOverlayComplete: function () {
                        layout.left.selectChild(layout.layersTab.id);
                        layout.layersTab.selectChild('layers-overlays-tab');
                    },
                    onVectorComplete: function () {
                        layout.left.selectChild(layout.layersTab.id);
                        layout.layersTab.selectChild('layers-features-tab');
                    }
                }, 'add-layers-arcgis');
                this.addLayerWidgets.arcgisService.startup();
                
                //add web tiled service
                this.addLayerWidgets.webTiledService = new AddWebTiledService({
                    overlayControlContainer: this.overlayControlContainer,
                    onOverlayComplete: function () {
                        layout.left.selectChild(layout.layersTab.id);
                        layout.layersTab.selectChild('layers-overlays-tab');
                    }
                }, 'add-layers-web-tiled');
                this.addLayerWidgets.webTiledService.startup();
                
                //fade out and destroy loading screen
                setTimeout(function() {
                    baseFx.fadeOut({
                        node: loadingNode,
                        duration: 1000,
                        onEnd: function() {
                            domConst.destroy(loadingNode);
                        }
                    }).play();
                }, 3000);
            }));
        }
    };
});
