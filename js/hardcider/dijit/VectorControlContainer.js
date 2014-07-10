/*
 * Copyright (c) 2014 Ben Fousek
 * https://github.com/btfou/hardcider
 *
 * a container widget for vector layer controls
 */
define([
    'dojo/_base/declare',
    'dojo/_base/array',
    'dojo/_base/lang',
    'dojo/on',
    'dijit/_WidgetBase',
    'dijit/_Container',
    'dojo/Evented',
    'esri/tasks/ProjectParameters',
    'esri/config',
    'esri/layers/GraphicsLayer',
    'hardcider/dijit/FeatureLayerControl',
    'hardcider/dijit/GeoJsonLayerControl'
], function(
    declare,
    array,
    lang,
    on,
    WidgetBase,
    Container,
    Evented,
    ProjectParams,
    esriConfig,
    GraphicsLayer,
    FeatureLayerControl,
    GeoJsonLayerControl
) {
    return declare([WidgetBase, Container, Evented], {
        reorder: true, //allow layer reordering
        includeDrawLayers: true, //add draw layers
        map: null, //map reference
        applicationLayers: [], //application (keep on top) layers
        //the draw layers
        drawLayers: {
            polygon: null,
            polyline: null,
            point: null,
            text: null,
            temp: null
        },
        constructor: function(options) {
            options = options || {};
            if (!options.map) {
                console.log('VectorControlContainer error::map option is required');
                return;
            }
            lang.mixin(this, options);
        },
        postCreate: function() {
            this.inherited(arguments);
            //move the application layers back to the top
            this.map.on('layer-add', lang.hitch(this, this._reorderApplicationLayers));
            //add draw layers
            if (this.includeDrawLayers) {
                this._addDrawLayers();
            }
        },
        //adds the appropriate layer control
        //@param layerInfo {Object} params for the layer and control
        addLayer: function(layerInfo) {

            //use switch & push control to array

            if (layerInfo.type === 'application') {
                var li = lang.mixin({
                    visible: true,
                    print: false
                }, layerInfo);
                var layer = new GraphicsLayer({
                    id: li.id,
                    visible: li.visible
                });
                layer.print = li.print;
                layer.layerParams = li;
                this.map.addLayer(layer, 0);
                this.applicationLayers.push(layer);
                this.map.recycleEnableSnapping();
            } else if (layerInfo.type === 'feature') {
                var control = new FeatureLayerControl({
                    controlContainer: this,
                    layerInfo: layerInfo
                });
                this.addChild(control, 'first');
            }
        },
        //zoom to a layer
        //@param layer {Object} the layer to zoom to
        zoomToLayerExtent: function(layer) {
            var map = this.map;
            if (layer.spatialReference === map.spatialReference) {
                map.setExtent(layer.fullExtent, true);
            } else {
                var params = lang.mixin(new ProjectParams(), {
                    geometries: [layer.fullExtent],
                    outSR: map.spatialReference
                });
                if (esriConfig.defaults.geometryService) {
                    esriConfig.defaults.geometryService.project(params, lang.hitch(this, function(r) {
                        map.setExtent(r[0], true);
                    }), function(e) {
                        console.log(e);
                    });
                } else {
                    console.log('zoomToLayerExtent::esriConfig.defaults.geometryService is not set');
                }
            }
        },
        //reorder layer in map and control in this container
        //because ordering is controlled by the position
        // of the control there is no need to be concerned
        // with the application and draw layers being reordered
        moveUp: function(control) {
            if (control.getPreviousSibling()) {
                var id = control.layer.id,
                    index = array.indexOf(this.map.graphicsLayerIds, id),
                    node = control.domNode;
                this.map.reorderLayer(id, index + 1);
                this.containerNode.insertBefore(node, node.previousSibling);
            }
        },
        moveDown: function(control) {
            if (control.getNextSibling()) {
                var id = control.layer.id,
                    index = array.indexOf(this.map.graphicsLayerIds, id),
                    node = control.domNode;
                this.map.reorderLayer(id, index - 1);
                this.containerNode.insertBefore(node, node.nextSibling.nextSibling);
            }
        },
        //add draw layers to map
        _addDrawLayers: function() {
            var map = this.map,
                dl = this.drawLayers;
            dl.polygon = new GraphicsLayer({
                id: 'gl_draw_polygon'
            });
            dl.polygon.print = true;
            map.addLayer(dl.polygon, 0);
            dl.polyline = new GraphicsLayer({
                id: 'gl_draw_polyline'
            });
            dl.polyline.print = true;
            map.addLayer(dl.polyline, 1);
            dl.point = new GraphicsLayer({
                id: 'gl_draw_point'
            });
            dl.point.print = true;
            map.addLayer(dl.point, 2);
            dl.text = new GraphicsLayer({
                id: 'gl_draw_text'
            });
            dl.text.print = true;
            map.addLayer(dl.text, 3);
            dl.temp = new GraphicsLayer({
                id: 'gl_draw_temp'
            });
            dl.temp.print = false;
            map.addLayer(dl.temp, 4);
        },
        //reorders application layers to top on layer add
        _reorderApplicationLayers: function() {
            array.forEach(this.applicationLayers, function(appLayer) {
                this.map.reorderLayer(appLayer, this.map.graphicsLayerIds.length - 1);
            }, this);
        }
    });
});
