/*
 * Copyright (c) 2014 Ben Fousek
 * https://github.com/btfou/hardcider
 */
define([
    'dojo/_base/declare',
    'dojo/_base/lang',
    'dojo/on',
    'dojo/number',
    'dijit/_WidgetBase',
    'dijit/_TemplatedMixin',
    'dijit/Menu',
    'dijit/RadioMenuItem',
    'dijit/PopupMenuItem',
    'esri/graphic',
    'esri/geometry/webMercatorUtils',
    'esri/geometry/geodesicUtils',
    'esri/symbols/jsonUtils',
    'esri/geometry/Polyline',
    'esri/units',
    'esri/lang'
], function(
    declare,
    lang,
    on,
    number,
    WidgetBase,
    TemplatedMixin,
    Menu,
    RadioMenuItem,
    PopupMenuItem,
    Graphic,
    webMercatorUtils,
    geodesicUtils,
    symbolJsonUtils,
    Polyline,
    Units,
    esriLang
) {
    //no go 'use strict';
    return declare([WidgetBase, TemplatedMixin], {
        templateString: '<div class="hardcider-dijit-measure"><span data-dojo-attach-event="click: location" class="hardcider-click" title="Location">Location</span>&nbsp;&nbsp;<span data-dojo-attach-event="click: distance" class="hardcider-click" title="Distance">Distance</span>&nbsp;&nbsp;<span data-dojo-attach-event="click: area" class="hardcider-click" title="Area">Area</span>&nbsp;&nbsp;|&nbsp;&nbsp;<span data-dojo-attach-point="unitsNode" class="hardcider-click" title="Change units">Units</span>&nbsp;&nbsp;<span data-dojo-attach-event="click: clear" class="hardcider-click" title="Clear measure">Clear</span><div class="hardcider-dijit-measure-results" data-dojo-attach-point="resultsNode"></div></div>',
        symPoint: {
            color: null,
            size: 18,
            type: 'esriSMS',
            style: 'esriSMSCross',
            outline: {
                color: [227, 66, 52, 255],
                width: 3,
                type: 'esriSLS',
                style: 'esriSLSSolid'
            }
        },
        symLine: {
            color: [227, 66, 52, 255],
            width: 3,
            type: 'esriSLS',
            style: 'esriSLSSolid'
        },
        _current: {
            type: null,
            locationUnit: 'dec',
            lat: null,
            lng: null,
            distanceUnit: Units.FEET,
            distance: null,
            areaUnit: Units.ACRES,
            area: null,
            perimeter: null
        },
        locationTemplate: 'Latitude: ${lat}<br>Longitude: ${lng}',
        distanceTemplate: 'Distance: ${distance} ${units}',
        areaTemplate: 'Area: ${area} ${units}<br>Perimeter: ${perimeter} ${pUnits}',
        constructor: function(options) {
            lang.mixin(this, options);
            if (!this.map.loaded) {
                on(this.map, 'load', lang.hitch(this, function() {
                    this.layer = this.map.graphics;
                }));
            } else {
                this.layer = this.map.graphics;
            }
        },
        postCreate: function() {
            this.inherited(arguments);
            this.unitsMenu = new Menu({
                contextMenuForWindow: false,
                leftClickToOpen: true
            });
            var locationMenu = new Menu();
            locationMenu.addChild(new RadioMenuItem({
                label: 'Decimal',
                group: 'hardcider-measure-location',
                checked: true,
                onChange: lang.hitch(this, function() {
                    this._locationUnits('dec');
                })
            }));
            locationMenu.addChild(new RadioMenuItem({
                label: 'DMS',
                group: 'hardcider-measure-location',
                checked: false,
                onChange: lang.hitch(this, function() {
                    this._locationUnits('dms');
                })
            }));
            locationMenu.startup();
            this.unitsMenu.addChild(new PopupMenuItem({
                label: 'Location',
                popup: locationMenu
            }));
            var distanceMenu = new Menu();
            distanceMenu.addChild(new RadioMenuItem({
                label: 'Feet',
                group: 'hardcider-measure-distance',
                checked: true,
                onChange: lang.hitch(this, function() {
                    this._distanceUnits(Units.FEET);
                })
            }));
            distanceMenu.addChild(new RadioMenuItem({
                label: 'Miles',
                group: 'hardcider-measure-distance',
                checked: false,
                onChange: lang.hitch(this, function() {
                    this._distanceUnits(Units.MILES);
                })
            }));
            distanceMenu.addChild(new RadioMenuItem({
                label: 'Meters',
                group: 'hardcider-measure-distance',
                checked: false,
                onChange: lang.hitch(this, function() {
                    this._distanceUnits(Units.METERS);
                })
            }));
            distanceMenu.addChild(new RadioMenuItem({
                label: 'Kilometers',
                group: 'hardcider-measure-distance',
                checked: false,
                onChange: lang.hitch(this, function() {
                    this._distanceUnits(Units.KILOMETERS);
                })
            }));
            distanceMenu.startup();
            this.unitsMenu.addChild(new PopupMenuItem({
                label: 'Distance',
                popup: distanceMenu
            }));
            var areaMenu = new Menu();
            areaMenu.addChild(new RadioMenuItem({
                label: 'Acres',
                group: 'hardcider-measure-area',
                checked: true,
                onChange: lang.hitch(this, function() {
                    this._areaUnits(Units.ACRES);
                })
            }));
            areaMenu.addChild(new RadioMenuItem({
                label: 'Square Feet',
                group: 'hardcider-measure-area',
                checked: false,
                onChange: lang.hitch(this, function() {
                    this._areaUnits(Units.SQUARE_FEET);
                })
            }));
            areaMenu.addChild(new RadioMenuItem({
                label: 'Square Miles',
                group: 'hardcider-measure-area',
                checked: false,
                onChange: lang.hitch(this, function() {
                    this._areaUnits(Units.SQUARE_MILES);
                })
            }));
            areaMenu.addChild(new RadioMenuItem({
                label: 'Square Meters',
                group: 'hardcider-measure-area',
                checked: false,
                onChange: lang.hitch(this, function() {
                    this._areaUnits(Units.SQUARE_METERS);
                })
            }));
            areaMenu.addChild(new RadioMenuItem({
                label: 'Square Kilometers',
                group: 'hardcider-measure-area',
                checked: false,
                onChange: lang.hitch(this, function() {
                    this._areaUnits(Units.SQUARE_KILOMETERS);
                })
            }));
            areaMenu.startup();
            this.unitsMenu.addChild(new PopupMenuItem({
                label: 'Area',
                popup: areaMenu
            }));
            this.unitsMenu.startup();
            this.unitsMenu.bindDomNode(this.unitsNode);
        },
        location: function() {
            this.layer.clear();
            this.map.eventBegin();
            this.map.setMapCursor('crosshair');
            this.resultsNode.innerHTML = 'Measure location';
            this.map.drawToolbar.activate('point');
            var move = on(this.map, 'mouse-move', lang.hitch(this, function(evt) {
                var lat, lng;
                if (this._current.locationUnit === 'dec') {
                    lat = number.round(evt.mapPoint.getLatitude(), 6);
                    lng = number.round(evt.mapPoint.getLongitude(), 6);
                } else {
                    lat = this.map.decToDMS(evt.mapPoint.getLatitude(), 'y');
                    lng = this.map.decToDMS(evt.mapPoint.getLongitude(), 'x');
                }
                this.map.setDrawTooltips({
                    addPoint: lat + '<br>' + lng
                });
                this.map.drawToolbar._setTooltipMessage();
                this.resultsNode.innerHTML = esriLang.substitute({
                    lat: lat,
                    lng: lng
                }, this.locationTemplate);
            }));
            var o = on.once(this.map.drawToolbar, 'draw-end', lang.hitch(this, function(result) {
                move.remove();
                this.map.eventEnd();
                this.map.drawToolbar.deactivate();
                this.layer.add(new Graphic(result.geometry, symbolJsonUtils.fromJson(this.symPoint)));
                this._current.lat = result.geometry.getLatitude();
                this._current.lng = result.geometry.getLongitude();
                this._current.type = 'location';
                this._location();
            }));
            this.map.eventAdd(o);
            this.map.eventAdd(move);
        },
        _location: function() {
            if (this._current.locationUnit === 'dec') {
                this.resultsNode.innerHTML = esriLang.substitute({
                    lat: number.round(this._current.lat, 8),
                    lng: number.round(this._current.lng, 8)
                }, this.locationTemplate);
            } else {
                var lat = this.map.decToDMS(this._current.lat, 'lat'),
                    lng = this.map.decToDMS(this._current.lng, 'lng');
                this.resultsNode.innerHTML = esriLang.substitute({
                    lat: lat,
                    lng: lng
                }, this.locationTemplate);
            }
        },
        _locationUnits: function(unit) {
            if (unit === this._current.locationUnit) {
                return;
            }
            this._current.locationUnit = unit;
            if (this._current.type === 'location') {
                this._location();
            }
        },
        distance: function() {
            this.layer.clear();
            this.map.eventBegin();
            this.map.setMapCursor('crosshair');
            this.resultsNode.innerHTML = 'Measure distance';
            this.map.setDrawTooltips(null, null, 'Click to start');
            this.map.drawToolbar.activate('polyline');
            var move = on(this.map, 'mouse-move', lang.hitch(this, function() {
                var units = this._current.distanceUnit.replace('esri', ''),
                    gDist = 0,
                    tDist = 0,
                    dist;
                units = units.toLowerCase();
                if (this.map.drawToolbar._graphic) {
                    gDist = this._getDistance(this.map.drawToolbar._graphic.geometry);
                }
                if (this.map.drawToolbar._tGraphic) {
                    tDist = this._getDistance(this.map.drawToolbar._tGraphic.geometry);
                }
                dist = number.round(gDist + tDist, 2);
                if (dist) {
                    var tip = dist + ' ' + units;
                    this.map.setDrawTooltips({
                        start: tip,
                        resume: tip,
                        complete: tip
                    });
                    this.map.drawToolbar._setTooltipMessage();
                    this.resultsNode.innerHTML = esriLang.substitute({
                        distance: dist,
                        units: units
                    }, this.distanceTemplate);
                }
            }));
            var o = on.once(this.map.drawToolbar, 'draw-end', lang.hitch(this, function(result) {
                move.remove();
                this.map.eventEnd();
                this.map.drawToolbar.deactivate();
                this.layer.add(new Graphic(result.geometry, symbolJsonUtils.fromJson(this.symLine)));
                this._current.distance = this._getDistance(result.geometry);
                this._current.type = 'distance';
                this._distance(false);
            }));
            this.map.eventAdd(o);
            this.map.eventAdd(move);
        },
        _getDistance: function(geometry) {
            return geodesicUtils.geodesicLengths([webMercatorUtils.webMercatorToGeographic(geometry)], this._current.distanceUnit)[0];
        },
        _distance: function(newUnit) {
            if (newUnit) {
                this._current.distance = this._getDistance(this.layer.graphics[0].geometry);
            }
            var units = this._current.distanceUnit.replace('esri', '');
            units = units.toLowerCase();
            this.resultsNode.innerHTML = esriLang.substitute({
                distance: number.round(this._current.distance, 2),
                units: units
            }, this.distanceTemplate);
        },
        _distanceUnits: function(unit) {
            if (unit === this._current.distanceUnit) {
                return;
            }
            this._current.distanceUnit = unit;
            if (this._current.type === 'distance') {
                this._distance(true);
            }
            if (this._current.type === 'area') {
                this._area(true);
            }
        },
        area: function() {
            this.layer.clear();
            this.map.eventBegin();
            this.map.setMapCursor('crosshair');
            this.resultsNode.innerHTML = 'Measure area';
            this.map.setDrawTooltips(null, null, 'Click to start');
            this.map.drawToolbar.activate('polygon');
            var click = on(this.map, 'click', lang.hitch(this, function() {
                var units = this._current.areaUnit.replace('esri', '');
                units = units.toLowerCase();
                units = units.replace('square', 'square ');
                var pUnits = this._current.distanceUnit.replace('esri', '');
                pUnits = pUnits.toLowerCase();
                var area = 0;
                if (this.map.drawToolbar._graphic) {
                    area = this._getArea(this.map.drawToolbar._graphic.geometry);
                }
                area = (area < 0) ? area * -1 : area;
                area = number.round(area, 2);
                var tip = area + ' ' + units;
                this.map.setDrawTooltips({
                    start: tip,
                    resume: tip,
                    complete: tip
                });
                this.map.drawToolbar._setTooltipMessage();
                this.resultsNode.innerHTML = esriLang.substitute({
                    area: area,
                    units: units,
                    perimeter: '?',
                    pUnits: pUnits
                }, this.areaTemplate);
            }));
            var o = on.once(this.map.drawToolbar, 'draw-end', lang.hitch(this, function(result) {
                click.remove();
                this.map.eventEnd();
                this.map.drawToolbar.deactivate();
                this.layer.add(new Graphic(result.geometry, symbolJsonUtils.fromJson(this.symLine)));
                this._current.area = this._getArea(result.geometry);
                this._current.perimeter = this._getPerimeter(result.geometry);
                this._current.type = 'area';
                this._area(false);
            }));
            this.map.eventAdd(o);
            this.map.eventAdd(click);
        },
        _getArea: function(geometry) {
            return geodesicUtils.geodesicAreas([webMercatorUtils.webMercatorToGeographic(geometry)], this._current.areaUnit)[0];
        },
        _getPerimeter: function(geometry) {
            return this._getDistance(new Polyline({
                'paths': geometry.rings,
                'spatialReference': {
                    'wkid': geometry.spatialReference.wkid
                }
            }));
        },
        _area: function(newUnit) {
            if (newUnit) {
                var geometry = this.layer.graphics[0].geometry;
                this._current.area = this._getArea(geometry);
                this._current.perimeter = this._getPerimeter(geometry);
            }
            var units = this._current.areaUnit.replace('esri', '');
            units = units.toLowerCase();
            units = units.replace('square', 'square ');
            var pUnits = this._current.distanceUnit.replace('esri', '');
            pUnits = pUnits.toLowerCase();
            this.resultsNode.innerHTML = esriLang.substitute({
                area: number.round(this._current.area, 2),
                units: units,
                perimeter: number.round(this._current.perimeter, 2),
                pUnits: pUnits
            }, this.areaTemplate);
        },
        _areaUnits: function(unit) {
            if (unit === this._current.areaUnit) {
                return;
            }
            this._current.areaUnit = unit;
            if (this._current.type === 'area') {
                this._area(true);
            }
        },
        clear: function() {
            this.map.eventReset();
            this.layer.clear();
            this._current.type = null;
            this._current.lat = null;
            this._current.lng = null;
            this._current.distance = null;
            this._current.area = null;
            this._current.perimeter = null;
            this.resultsNode.innerHTML = '';
        }
    });
});
