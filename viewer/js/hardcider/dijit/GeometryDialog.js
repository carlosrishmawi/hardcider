/*
 * Copyright (c) 2014 Ben Fousek
 * https://github.com/btfou/hardcider
 */
define([
    'dojo/_base/declare',
    'dojo/_base/lang',
    'dojo/dom-attr',
    'dojo/number',
    'dijit/Menu',
    'dijit/MenuItem',
    'dijit/Dialog',
    'esri/geometry/webMercatorUtils',
    'esri/geometry/geodesicUtils',
    'esri/units',
    'dojo/text!hardcider/dijit/templates/GeometryDialog.html'
], function(
    declare,
    lang,
    domAttr,
    number,
    Menu,
    MenuItem,
    Dialog,
    webMercatorUtils,
    geodesicUtils,
    Units,
    template
) {
    return declare(Dialog, {
        templateString: template,
        _current: {
            type: null,
            pointUnit: 'dec',
            polylineUnit: Units.FEET,
            polygonUnit: Units.ACRES
        },
        constructor: function(options) {
            lang.mixin(this, options);
        },
        postCreate: function() {
            this.inherited(arguments);
            this.pointMenu = new Menu({
                contextMenuForWindow: false,
                leftClickToOpen: true
            });
            this.pointMenu.addChild(new MenuItem({
                label: 'Decimal',
                onClick: lang.hitch(this, function() {
                    this.point('dec');
                })
            }));
            this.pointMenu.addChild(new MenuItem({
                label: 'DMS',
                onClick: lang.hitch(this, function() {
                    this.point('dms');
                })
            }));
            this.pointMenu.startup();
            this.polylineMenu = new Menu({
                contextMenuForWindow: false,
                leftClickToOpen: true
            });
            this.polylineMenu.addChild(new MenuItem({
                label: 'Feet',
                onClick: lang.hitch(this, function() {
                    this.polyline(Units.FEET);
                })
            }));
            this.polylineMenu.addChild(new MenuItem({
                label: 'Miles',
                onClick: lang.hitch(this, function() {
                    this.polyline(Units.MILES);
                })
            }));
            this.polylineMenu.addChild(new MenuItem({
                label: 'Meters',
                onClick: lang.hitch(this, function() {
                    this.polyline(Units.METERS);
                })
            }));
            this.polylineMenu.addChild(new MenuItem({
                label: 'Kilometers',
                onClick: lang.hitch(this, function() {
                    this.polyline(Units.KILOMETERS);
                })
            }));
            this.polylineMenu.startup();
            this.polygonMenu = new Menu({
                contextMenuForWindow: false,
                leftClickToOpen: true
            });
            this.polygonMenu.addChild(new MenuItem({
                label: 'Acres',
                onClick: lang.hitch(this, function() {
                    this.polygon(Units.ACRES);
                })
            }));
            this.polygonMenu.addChild(new MenuItem({
                label: 'Square Feet',
                onClick: lang.hitch(this, function() {
                    this.polygon(Units.SQUARE_FEET);
                })
            }));
            this.polygonMenu.addChild(new MenuItem({
                label: 'Square Miles',
                onClick: lang.hitch(this, function() {
                    this.polygon(Units.SQUARE_MILES);
                })
            }));
            this.polygonMenu.addChild(new MenuItem({
                label: 'Square Meters',
                onClick: lang.hitch(this, function() {
                    this.polygon(Units.SQUARE_METERS);
                })
            }));
            this.polygonMenu.addChild(new MenuItem({
                label: 'Square Kilometers',
                onClick: lang.hitch(this, function() {
                    this.polygon(Units.SQUARE_KILOMETERS);
                })
            }));
            this.polygonMenu.startup();
            this.on('hide', lang.hitch(this, function() {
                domAttr.set(this.convertNode, 'data-type', 'json');
                this.convertNode.innerHTML = 'View as GeoJSON';
            }));
        },
        geometryInfo: function(geom) {
            if (geom.spatialReference.isWebMercator()) {
                geom = webMercatorUtils.webMercatorToGeographic(geom);
            }
            this.geometry = geom;
            this._current.type = geom.type;
            this.geomTypeNode.innerHTML = geom.type.charAt(0).toUpperCase() + geom.type.substring(1);
            this.jsonNode.innerHTML = JSON.stringify(geom.toJson(), null, '  ');
            switch (geom.type) {
                case 'point':
                    this.polylineMenu.unBindDomNode(this.unitsNode);
                    this.polygonMenu.unBindDomNode(this.unitsNode);
                    this.pointMenu.bindDomNode(this.unitsNode);
                    if (this._current.pointUnit === 'dec') {
                        this.infoNode.innerHTML = 'Latitude: ' + number.round(geom.getLatitude(), 6) + '<br>Longitude: ' + number.round(geom.getLongitude(), 6);
                    } else {
                        this.infoNode.innerHTML = 'Latitude: ' + this.map.decToDMS(geom.getLatitude(), 'y') + '<br>Longitude: ' + this.map.decToDMS(geom.getLongitude(), 'x');
                    }
                    break;
                case 'polyline':
                    this.pointMenu.unBindDomNode(this.unitsNode);
                    this.polygonMenu.unBindDomNode(this.unitsNode);
                    this.polylineMenu.bindDomNode(this.unitsNode);
                    this.infoNode.innerHTML = 'Length: ' + number.round(geodesicUtils.geodesicLengths([geom], this._current.polylineUnit)[0], 2) + ' ' + this._current.polylineUnit.replace('esri', '');
                    break;
                case 'polygon':
                    this.pointMenu.unBindDomNode(this.unitsNode);
                    this.polylineMenu.unBindDomNode(this.unitsNode);
                    this.polygonMenu.bindDomNode(this.unitsNode);
                    this.infoNode.innerHTML = 'Area: ' + number.round(geodesicUtils.geodesicAreas([geom], this._current.polygonUnit)[0], 2) + ' ' + this._current.polygonUnit.replace('esri', '').replace('Square', 'Square ');
                    break;
            }
            this.show();
        },
        point: function(unit) {
            if (unit === this._current.pointUnit || this._current.type !== 'point') {
                return;
            }
            this._current.pointUnit = unit;
            var geom = this.geometry;
            if (this._current.pointUnit === 'dec') {
                this.infoNode.innerHTML = 'Latitude: ' + number.round(geom.getLatitude(), 6) + '<br>Longitude: ' + number.round(geom.getLongitude(), 6);
            } else {
                this.infoNode.innerHTML = 'Latitude: ' + this.map.decToDMS(geom.getLatitude(), 'y') + '<br>Longitude: ' + this.map.decToDMS(geom.getLongitude(), 'x');
            }
        },
        polyline: function(unit) {
            if (unit === this._current.polylineUnit || this._current.type !== 'polyline') {
                return;
            }
            this._current.polylineUnit = unit;
            this.infoNode.innerHTML = 'Length: ' + number.round(geodesicUtils.geodesicLengths([this.geometry], this._current.polylineUnit)[0], 2) + ' ' + this._current.polylineUnit.replace('esri', '');
        },
        polygon: function(unit) {
            if (unit === this._current.polygonUnit || this._current.type !== 'polygon') {
                return;
            }
            this._current.polygonUnit = unit;
            this.infoNode.innerHTML = 'Area: ' + number.round(geodesicUtils.geodesicAreas([this.geometry], this._current.polygonUnit)[0], 2) + ' ' + this._current.polygonUnit.replace('esri', '').replace('Square', 'Square ');
        },
        convertJson: function() {
            var type = domAttr.get(this.convertNode, 'data-type');
            if (type === 'json') {
                if (window.Terraformer) {
                    this.jsonNode.innerHTML = JSON.stringify(window.Terraformer.ArcGIS.parse(this.geometry), null, '  ');
                } else {
                    this.jsonNode.innerHTML = 'Terraformer is not loaded';
                }
                domAttr.set(this.convertNode, 'data-type', 'geojson');
                this.convertNode.innerHTML = 'View as JSON';
            } else {
                this.jsonNode.innerHTML = JSON.stringify(this.geometry.toJson(), null, '  ');
                domAttr.set(this.convertNode, 'data-type', 'json');
                this.convertNode.innerHTML = 'View as GeoJSON';
            }
        },
        selectJson: function() {
            var range;
            if (document.selection) {
                range = document.body.createTextRange();
                range.moveToElementText(this.jsonNode);
                range.select();
            } else if (window.getSelection) {
                range = document.createRange();
                range.selectNode(this.jsonNode);
                window.getSelection().addRange(range);
            }
        }
    });
});
