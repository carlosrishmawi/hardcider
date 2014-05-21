/*
 * Copyright (c) 2014 Ben Fousek
 * https://github.com/btfou/hardcider
 */
define([
    'dojo/_base/declare',
    'dojo/_base/lang',
    'dojo/on',
    'dojo/dom',
    'dojo/number',
    'dijit/_WidgetBase',
    'dijit/_TemplatedMixin',
    'dijit/Menu',
    'dijit/MenuItem',
    'dijit/Dialog',
    'esri/geometry/webMercatorUtils'
], function(
    declare,
    lang,
    on,
    dom,
    number,
    WidgetBase,
    TemplatedMixin,
    Menu,
    MenuItem,
    Dialog,
    webMercatorUtils
) {
    return declare([WidgetBase, TemplatedMixin], {
        templateString: '<div class="hardcider-map-info" title="${title}">1:<span data-dojo-attach-point="scaleNode"></span>&nbsp;&nbsp;Z:<span data-dojo-attach-point="zoomNode"></span>&nbsp;&nbsp;<span data-dojo-attach-point="latNode"></span>&nbsp;&nbsp;<span data-dojo-attach-point="lngNode"></span></div>',
        cursorFormat: 'dec',
        centerFormat: 'dec',
        constructor: function(options) {
            lang.mixin(this, options);
        },
        postCreate: function() {
            this.inherited(arguments);
            this.map.on('mouse-move', lang.hitch(this, this.setCoords));
            this.map.on('mouse-drag', lang.hitch(this, this.setCoords));
            this.map.on('zoom-end, pan-end', lang.hitch(this, this.setScaleZoom));
            if (this.map.loaded) {
                this.scaleNode.innerHTML = number.format(number.round(this.map.getScale(), 0));
                this.zoomNode.innerHTML = this.map.getLevel();
            } else {
                this.map.on('load', lang.hitch(this, function() {
                    this.scaleNode.innerHTML = number.format(number.round(this.map.getScale(), 0));
                    this.zoomNode.innerHTML = this.map.getLevel();
                }));
            }
            this.menu = new Menu({
                targetNodeIds: [this.id],
                contextMenuForWindow: false,
                leftClickToOpen: true
            });
            this.menu.addChild(new MenuItem({
                label: 'Web Mercator Map Extent',
                onClick: lang.hitch(this, function() {
                    this.mapExtent('mercator');
                })
            }));
            this.menu.addChild(new MenuItem({
                label: 'Geographic Map Extent',
                onClick: lang.hitch(this, function() {
                    this.mapExtent('geographic');
                })
            }));
            this.menu.addChild(new MenuItem({
                label: 'Geographic Map Center',
                onClick: lang.hitch(this, function() {
                    this.mapExtent('center');
                })
            }));
            this.menu.startup();
        },
        setCoords: function(evt) {
            var point = evt.mapPoint;
            if (this.cursorFormat === 'dec') {
                this.latNode.innerHTML = number.round(point.getLatitude(), 6);
                this.lngNode.innerHTML = number.round(point.getLongitude(), 6);
            } else {
                this.latNode.innerHTML = this.map.decToDMS(point.getLatitude(), 'y');
                this.lngNode.innerHTML = this.map.decToDMS(point.getLongitude(), 'x');
            }
        },
        setScaleZoom: function() {
            this.scaleNode.innerHTML = number.format(number.round(this.map.getScale(), 0));
            this.zoomNode.innerHTML = this.map.getLevel();
        },
        mapExtent: function(type) {
            var dialog = new Dialog({
                title: 'Map Extent',
                onHide: function() {
                    this.destroy();
                }
            });
            var extent = this.map.extent;
            switch (type) {
                case 'mercator':
                    dialog.set('title', 'Web Mercator Map Extent');
                    dialog.set('content', '<pre class="hardcider-json-pre">' + JSON.stringify(extent.toJson(), null, '  ') + '</pre><div class="hardcider-dialog-close"><span class="hardcider-click" id="' + dialog.id + '_dialog-close">Close</span></div>');
                    break;
                case 'geographic':
                    dialog.set('title', 'Geographic Map Extent');
                    dialog.set('content', '<pre class="hardcider-json-pre">' + JSON.stringify(webMercatorUtils.webMercatorToGeographic(extent).toJson(), null, '  ') + '</pre><div class="hardcider-dialog-close"><span class="hardcider-click" id="' + dialog.id + '_dialog-close">Close</span></div>');
                    break;
                case 'center':
                    dialog.set('title', 'Geographic Map Center');
                    dialog.set('content', 'Latitude: ' + number.round(extent.getCenter().getLatitude(), 6) + '<br>Longitude: ' + number.round(extent.getCenter().getLongitude(), 6) + '<div class="hardcider-dialog-close"><span class="hardcider-click" id="' + dialog.id + '_dialog-close">Close</span></div>');
                    break;
                default:
                    dialog.set('title', 'Geographic Map Center');
                    dialog.set('content', 'Latitude: ' + number.round(extent.getCenter().getLatitude(), 6) + '<br>Longitude: ' + number.round(extent.getCenter().getLongitude(), 6) + '<div class="hardcider-dialog-close"><span class="hardcider-click" id="' + dialog.id + '_dialog-close">Close</span></div>');
                    break;
            }
            dialog.show();
            on(dom.byId(dialog.id + '_dialog-close'), 'click', function() {
                dialog.hide();
            });
        }
    });
});
