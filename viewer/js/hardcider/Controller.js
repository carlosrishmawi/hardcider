/*
 * Copyright (c) 2014 Ben Fousek
 * https://github.com/btfou/hardcider
 */
define([
    'dojo/_base/array',
    'dojo/_base/lang',
    'dojo/_base/fx',
    'dojo/dom-construct',
    'dojo/dom-style',
    'hardcider/settings',
    'hardcider/Layout',
    'hardcider/Map',
    'hardcider/iquert/IQueRT',
    'hardcider/draw/Draw',
    'hardcider/draw/DrawProjects',
    'hardcider/dijit/OverlayControlContainer',
    'hardcider/dijit/VectorControlContainer',
    'hardcider/dijit/Measure',
    'dijit/form/Button',
    'dijit/form/DropDownButton',
    'dijit/ToolbarSeparator',
    'dijit/Menu',
    'dijit/MenuItem',
    'esri/geometry/Extent',
    'esri/dijit/Geocoder'
], function(
    array,
    lang,
    baseFx,
    domConst,
    domStyle,
    settings,
    Layout,
    Map,
    IQueRT,
    Draw,
    DrawProjects,
    OverlayControlContainer,
    VectorControlContainer,
    Measure,
    Button,
    DropDownButton,
    ToolbarSeparator,
    Menu,
    MenuItem,
    Extent,
    Geocoder
) {
    'use strict';
    return {
        build: function(loadingNode, applicationNode) {
            if (!loadingNode || !applicationNode) {
                console.log('fermenter error::loadingNode and applicationNode are required');
                return;
            }
            //build layout
            this.layout = new Layout(applicationNode);
            this.layout.press();

            //the map
            this.map = new Map('map-panel', settings.map);

            //let's do the rest after map loads
            //so many classes require a loaded map
            //this prevents all map not loaded errors 
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

                //iquert
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
                var tb = this.layout.toolbar;
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
                tb.addItem(new Button({
                    toolbarGroup: 'map',
                    label: 'Print',
                    showLabel: false,
                    iconClass: 'iconPrint',
                    title: 'Print a PDF of the map',
                    onClick: function() {
                        map.alert('Sorry no print...<br>I\'ve always used custom print tasks. Not sure if I should add a generic print task here or not.');
                    }
                }));
                tb.addItem(new Button({
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
                }));

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
