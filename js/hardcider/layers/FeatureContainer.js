/*
 * Copyright (c) 2014 Ben Fousek
 * https://github.com/btfou/hardcider
 */
define([
    'dojo/_base/declare',
    'dojo/_base/array',
    'dojo/_base/lang',
    'dojo/on',
    'dijit/_WidgetBase',
    'dijit/_Container',
    'dojo/Evented',
    'hardcider/layers/Feature',
    'esri/layers/GraphicsLayer'
], function(
    declare,
    array,
    lang,
    on,
    WidgetBase,
    Container,
    Evented,
    Feature,
    Graphics
) {
    //no go 'use strict';
    return declare([WidgetBase, Container, Evented], {
        reorder: true,
        map: null,
        iquert: null,
        applicationLayers: [],
        drawLayers: {
            polygon: null,
            polyline: null,
            point: null,
            text: null,
            temp: null
        },
        constructor: function(options) {
            lang.mixin(this, options);
        },
        postCreate: function() {
            this.inherited(arguments);
            this.map.on('layer-add', lang.hitch(this, this.reorderApplicationLayers));
            this.addDrawLayers();
        },
        addLayer: function(layerInfo) {
            if (layerInfo.type === 'application') {
                this.addApplicationLayer(layerInfo);
            } else {
                var feature = new Feature({
                    map: this.map,
                    container: this,
                    layerInfo: layerInfo
                });
                on(feature, 'control-loaded', lang.hitch(this, function(r) {
                    this.emit('control-loaded', r);
                }));
                feature.startup();
            }
        },
        addApplicationLayer: function(layerInfo) {
            var li = lang.mixin({
                visible: true,
                print: false
            }, layerInfo);
            var layer = new Graphics({
                id: li.id,
                visible: li.visible
            });
            layer.print = li.print;
            layer.layerParams = li;
            layer.featureType = 'application';
            this.map.addLayer(layer);
            this.applicationLayers.push(layer);
            this.map.recycleEnableSnapping();
        },
        addDrawLayers: function() {
            this.drawLayers.polygon = new Graphics({
                id: 'gl_draw_polygon'
            });
            this.drawLayers.polygon.print = true;
            this.map.addLayer(this.drawLayers.polygon, 0);
            this.drawLayers.polyline = new Graphics({
                id: 'gl_draw_polyline'
            });
            this.drawLayers.polyline.print = true;
            this.map.addLayer(this.drawLayers.polyline, 1);
            this.drawLayers.point = new Graphics({
                id: 'gl_draw_point'
            });
            this.drawLayers.point.print = true;
            this.map.addLayer(this.drawLayers.point, 2);
            this.drawLayers.text = new Graphics({
                id: 'gl_draw_text'
            });
            this.drawLayers.text.print = true;
            this.map.addLayer(this.drawLayers.text, 3);
            this.drawLayers.temp = new Graphics({
                id: 'gl_draw_temp'
            });
            this.drawLayers.temp.print = false;
            this.map.addLayer(this.drawLayers.temp, 4);
        },
        reorderApplicationLayers: function() {
            array.forEach(this.applicationLayers, function(al) {
                this.map.reorderLayer(al, this.map.graphicsLayerIds.length - 1);
            }, this);
        },
        moveUp: function(control) {
            if (control.getPreviousSibling()) {
                var id = control.layer.id,
                    index = array.indexOf(control.map.graphicsLayerIds, id),
                    node = control.domNode;
                control.map.reorderLayer(id, index + 1);
                this.containerNode.insertBefore(node, node.previousSibling);
            }
        },
        moveDown: function(control) {
            if (control.getNextSibling()) {
                var id = control.layer.id,
                    index = array.indexOf(control.map.graphicsLayerIds, id),
                    node = control.domNode;
                control.map.reorderLayer(id, index - 1);
                this.containerNode.insertBefore(node, node.nextSibling.nextSibling);
            }
        }
    });
});
