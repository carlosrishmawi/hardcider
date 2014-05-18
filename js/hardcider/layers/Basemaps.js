/*
 * Copyright (c) 2014 Ben Fousek
 * https://github.com/btfou/hardcider
 */
define([
    'dojo/_base/declare',
    'dojo/_base/array',
    'dojo/_base/lang',
    'esri/virtualearth/VETiledLayer',
    'esri/layers/ArcGISTiledMapServiceLayer',
    'esri/layers/WebTiledLayer',
    'dijit/Menu',
    'dijit/MenuItem',
    'dijit/PopupMenuItem'
], function(
    declare,
    array,
    lang,
    VE,
    Tiled,
    WebTiled,
    Menu,
    MenuItem,
    PopupMenuItem
) {
    'use strict';
    return declare(null, {
        abcdSubDomain: ['a', 'b', 'c', 'd'],
        abcSubDomain: ['a', 'b', 'c'],
        mqSubDomain: ['mtile01', 'mtile02', 'mtile03', 'mtile04'],
        basemaps: [],
        count: 0,
        map: null,
        bingMapsKey: null,
        mapboxMapId: null,
        defaultBasemap: 'bm_esriworldtopo',
        defaultBasemapType: null,
        constructor: function(options) {
            lang.mixin(this, options);
            //the basemap menu
            this.menu = new Menu({
                leftClickToOpen: true
            });
            //esri basemaps
            var esriMenu = new Menu();
            //world imagery
            var esriworldtopo = new Tiled('http://services.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer', {
                id: 'bm_esriworldtopo',
                visible: false,
                resampling: true
            });
            esriworldtopo.isBasemap = true;
            this.map.addLayer(esriworldtopo);
            this.basemaps.push(esriworldtopo);
            this.count = this.count + 1;
            esriMenu.addChild(new MenuItem({
                label: 'Topographic',
                onClick: lang.hitch(this, function() {
                    this.setBasemap('bm_esriworldtopo');
                })
            }));
            //esri street
            var esristreet = new Tiled('http://services.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer', {
                id: 'bm_esristreet',
                visible: false,
                resampling: true
            });
            esristreet.isBasemap = true;
            this.map.addLayer(esristreet);
            this.basemaps.push(esristreet);
            this.count = this.count + 1;
            esriMenu.addChild(new MenuItem({
                label: 'Street',
                onClick: lang.hitch(this, function() {
                    this.setBasemap('bm_esristreet');
                })
            }));
            //world imagery
            var esriworldimagery = new Tiled('http://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer', {
                id: 'bm_esriworldimagery',
                visible: false,
                resampling: true
            });
            esriworldimagery.isBasemap = true;
            this.map.addLayer(esriworldimagery);
            this.basemaps.push(esriworldimagery);
            this.count = this.count + 1;
            esriMenu.addChild(new MenuItem({
                label: 'Imagery',
                onClick: lang.hitch(this, function() {
                    this.setBasemap('bm_esriworldimagery');
                })
            }));
            //usa topo maps
            var topoquads = new Tiled('http://services.arcgisonline.com/ArcGIS/rest/services/USA_Topo_Maps/MapServer', {
                id: 'bm_usatopomaps',
                visible: false,
                resampling: true
            });
            topoquads.isBasemap = true;
            this.map.addLayer(topoquads);
            this.basemaps.push(topoquads);
            this.count = this.count + 1;
            esriMenu.addChild(new MenuItem({
                label: 'USA Topo Maps',
                onClick: lang.hitch(this, function() {
                    this.setBasemap('bm_usatopomaps');
                })
            }));
            //light gray canvas
            var lightgraycanvas = new Tiled('http://services.arcgisonline.com/arcgis/rest/services/Canvas/World_Light_Gray_Base/MapServer', {
                id: 'bm_lightgraycanvas',
                visible: false,
                resampling: true
            });
            lightgraycanvas.isBasemap = true;
            this.map.addLayer(lightgraycanvas);
            this.basemaps.push(lightgraycanvas);
            this.count = this.count + 1;
            esriMenu.addChild(new MenuItem({
                label: 'Light Gray Canvas',
                onClick: lang.hitch(this, function() {
                    this.setBasemap('bm_lightgraycanvas');
                })
            }));
            esriMenu.startup();
            var esriPopup = new PopupMenuItem({
                label: 'ESRI Maps',
                popup: esriMenu
            });
            esriPopup.startup();
            this.menu.addChild(esriPopup);
            //bing maps
            if (this.bingMapsKey) {
                var bingMenu = new Menu();
                var ve = new VE({
                    id: 'bm_virtualearth',
                    bingMapsKey: this.bingMapsKey,
                    mapStyle: 'road',
                    visible: false,
                    resampling: true
                });
                ve._mapType = 'bing';
                ve.isBasemap = true;
                this.map.addLayer(ve);
                this.basemaps.push(ve);
                this.count = this.count + 1;
                bingMenu.addChild(new MenuItem({
                    label: 'Road',
                    onClick: lang.hitch(this, function() {
                        this.setBasemap('bm_virtualearth', 'road');
                    })
                }));
                bingMenu.addChild(new MenuItem({
                    label: 'Satellite',
                    onClick: lang.hitch(this, function() {
                        this.setBasemap('bm_virtualearth', 'aerial');
                    })
                }));
                bingMenu.addChild(new MenuItem({
                    label: 'Hybrid',
                    onClick: lang.hitch(this, function() {
                        this.setBasemap('bm_virtualearth', 'aerialWithLabels');
                    })
                }));
                bingMenu.startup();
                var bingPopup = new PopupMenuItem({
                    label: 'Bing Maps',
                    popup: bingMenu
                });
                bingPopup.startup();
                this.menu.addChild(bingPopup);
            }
            //mapbox
            if (this.mapboxMapId) {
                var mapbox = new WebTiled('http://${subDomain}.tiles.mapbox.com/v3/' + this.mapboxMapId + '/${level}/${col}/${row}.png', {
                    id: 'bm_mapbox',
                    visible: false,
                    subDomains: this.abcdSubDomain,
                    copyright: 'Data &copy; OpenStreetMap contributors. Design &copy; MapBox',
                    resampling: true
                });
                mapbox.isBasemap = true;
                this.map.addLayer(mapbox);
                this.basemaps.push(mapbox);
                this.count = this.count + 1;
                this.menu.addChild(new MenuItem({
                    label: 'Mapbox',
                    onClick: lang.hitch(this, function() {
                        this.setBasemap('bm_mapbox');
                    })
                }));
            }
            //stamen maps
            var stamenMenu = new Menu();
            //stamen toner
            var toner = new WebTiled('http://${subDomain}.tile.stamen.com/toner/${level}/${col}/${row}.jpg', {
                id: 'bm_toner',
                visible: false,
                subDomains: this.abcdSubDomain,
                copyright: 'Map tiles by <a href="http://stamen.com">Stamen Design</a>, under <a href="http://creativecommons.org/licenses/by/3.0">CC BY 3.0</a>. Data by <a href="http://openstreetmap.org">OpenStreetMap</a>, under <a href="http://creativecommons.org/licenses/by-sa/3.0">CC BY SA</a>.',
                resampling: true
            });
            toner.isBasemap = true;
            this.map.addLayer(toner);
            this.basemaps.push(toner);
            this.count = this.count + 1;
            stamenMenu.addChild(new MenuItem({
                label: 'Toner',
                onClick: lang.hitch(this, function() {
                    this.setBasemap('bm_toner');
                })
            }));
            //stamen terrain
            var terrain = new WebTiled('http://${subDomain}.tile.stamen.com/terrain/${level}/${col}/${row}.jpg', {
                id: 'bm_terrain',
                visible: false,
                subDomains: this.abcdSubDomain,
                copyright: 'Map tiles by <a href="http://stamen.com">Stamen Design</a>, under <a href="http://creativecommons.org/licenses/by/3.0">CC BY 3.0</a>. Data by <a href="http://openstreetmap.org">OpenStreetMap</a>, under <a href="http://creativecommons.org/licenses/by-sa/3.0">CC BY SA</a>.',
                resampling: true
            });
            terrain.isBasemap = true;
            this.map.addLayer(terrain);
            this.basemaps.push(terrain);
            this.count = this.count + 1;
            stamenMenu.addChild(new MenuItem({
                label: 'Terrain',
                onClick: lang.hitch(this, function() {
                    this.setBasemap('bm_terrain');
                })
            }));
            //stamen watercolor
            var watercolor = new WebTiled('http://${subDomain}.tile.stamen.com/watercolor/${level}/${col}/${row}.jpg', {
                id: 'bm_watercolor',
                visible: false,
                subDomains: this.abcdSubDomain,
                copyright: 'Map tiles by <a href="http://stamen.com">Stamen Design</a>, under <a href="http://creativecommons.org/licenses/by/3.0">CC BY 3.0</a>. Data by <a href="http://openstreetmap.org">OpenStreetMap</a>, under <a href="http://creativecommons.org/licenses/by-sa/3.0">CC BY SA</a>.',
                resampling: true
            });
            watercolor.isBasemap = true;
            this.map.addLayer(watercolor);
            this.basemaps.push(watercolor);
            this.count = this.count + 1;
            stamenMenu.addChild(new MenuItem({
                label: 'Watercolor',
                onClick: lang.hitch(this, function() {
                    this.setBasemap('bm_watercolor');
                })
            }));
            stamenMenu.startup();
            var stamenPopup = new PopupMenuItem({
                label: 'Stamen Maps',
                popup: stamenMenu
            });
            stamenPopup.startup();
            this.menu.addChild(stamenPopup);
            //no basemap
            this.menu.addChild(new MenuItem({
                label: 'No Basemap',
                onClick: lang.hitch(this, function() {
                    this.setBasemap('none');
                })
            }));
            this.menu.startup();
            //set initial basemap
            this.setBasemap(this.defaultBasemap, this.defaultBasemapType);
        },
        setBasemap: function(layer, type) {
            array.forEach(this.basemaps, function(m) {
                if (layer === 'none') {
                    m.hide();
                } else {
                    if (m.id !== layer) {
                        m.hide();
                    } else {
                        m.show();
                    }
                    if (m._mapType === 'bing') {
                        m.setMapStyle(type);
                    }
                }
            }, this);
        }
    });
});
