/*
 * Copyright (c) 2014 Ben Fousek
 * https://github.com/btfou/hardcider
 *
 * a container widget for overlay layer controls
 */
define([
    'dojo/_base/declare',
    'dojo/_base/array',
    'dojo/_base/lang',
    'dojo/on',
    'dijit/_WidgetBase',
    'dijit/_Container',
    'esri/tasks/ProjectParameters',
    'esri/config',
    'hardcider/dijit/DynamicLayerControl',
    'hardcider/dijit/TiledLayerControl',
    'hardcider/dijit/WebTiledLayerControl'
], function(
    declare,
    array,
    lang,
    on,
    WidgetBase,
    Container,
    ProjectParams,
    esriConfig,
    DynamicLayerControl,
    TiledLayerControl,
    WebTiledLayerControl
) {
    return declare([WidgetBase, Container], {
        reorder: true, //allow layer reordering
        basemapCount: 0, //number of basemaps at bottom of layer stack
        map: null, //map reference
        iquert: null, //instance of IQueRT for identify and query
        controls: [], //an array of controls
        constructor: function(options) {
            options = options || {};
            if (!options.map) {
                console.log('OverlayControlContainer error::map option is required');
                return;
            }
            lang.mixin(this, options);
        },
        postCreate: function() {
            this.inherited(arguments);
        },
        //adds the appropriate layer control
        //@param layerInfo {Object} params for the layer and control
        addLayer: function(layerInfo) {
            var control = null;
            switch (layerInfo.type) {
                case 'dynamic':
                    control = new DynamicLayerControl({
                        controlContainer: this,
                        layerInfo: layerInfo
                    });
                    break;
                case 'tiled':
                    control = new TiledLayerControl({
                        controlContainer: this,
                        layerInfo: layerInfo
                    });
                    break;
                case 'webTiled':
                    control = new WebTiledLayerControl({
                        controlContainer: this,
                        layerInfo: layerInfo
                    });
                    break;
                default:
                    console.log('OverlayControlContainer error::the layer type provided is not valid');
                    break;
            }
            if (control) {
                this.addChild(control, 'first');
                this.controls.push(control);
            }
        },
        //zoom to a layer
        //@param layer {Object} the layer to zoom to
        zoomToLayerExtent: function(layer) {
            var map = this.map;
            if (layer.spatialReference === map.spatialReference) {
                map.setExtent(layer.fullExtent, true);
            } else {
                var params = new ProjectParams();
                params.geometries = [layer.fullExtent];
                params.outSR = map.spatialReference;
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
        //@param control {Object} the layer control/layer to move up
        moveUp: function(control) {
            var count = this.map.layerIds.length,
                id = control.layer.id,
                index = array.indexOf(this.map.layerIds, id),
                node = control.domNode;
            if (index < count - 1) {
                this.map.reorderLayer(id, index + 1);
                this.containerNode.insertBefore(node, node.previousSibling);
            }
        },
        //reorder layer in map and control in this container
        //will not move below basemap layers
        //@param control {Object} the layer control/layer to move down
        moveDown: function(control) {
            var id = control.layer.id,
                index = array.indexOf(this.map.layerIds, id),
                node = control.domNode;
            if (index > this.basemapCount) {
                this.map.reorderLayer(id, index - 1);
                if (node.nextSibling !== null) {
                    this.containerNode.insertBefore(node, node.nextSibling.nextSibling);
                }
            }
        },
        //init identify via IQueRT
        //@param layer {Object} the layer to identify
        //@param type {String} the geometry type to identify with: 'point', 'extent' or 'polygon'
        //@param layerId {Number) the service layer id to identify
        identify: function(layer, type, layerId) {
            if (this.iquert) {
                this.iquert.identify(layer, type, layerId);
            } else {
                this.map.alert('This application is not configured for identifying.', 'Error');
            }
        },
        //init query via IQueRT
        //@param layer {Object} the layer to identify
        //@param layerId {Number) the service layer id to identify
        query: function(layer, layerId) {
            if (this.iquert) {
                this.iquert.query(layer, layerId);
            } else {
                this.map.alert('This application is not configured for querying.', 'Error');
            }
        },
        //init query builder via IQueRT
        //@param layer {Object} the layer to identify
        //@param layerId {Number) the service layer id to identify
        queryBuilder: function(layer, layerId) {
            if (this.iquert) {
                this.iquert.queryBuilder(layer, layerId);
            } else {
                this.map.alert('This application is not configured for query building.', 'Error');
            }
        }
    });
});
