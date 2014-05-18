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
    'hardcider/layers/Overlay'
], function(
    declare,
    array,
    lang,
    on,
    WidgetBase,
    Container,
    Evented,
    Overlay
) {
    return declare([WidgetBase, Container, Evented], {
        map: null,
        iquert: null,
        reorder: true,
        basemapCount: 0,
        constructor: function(options) {
            lang.mixin(this, options);
        },
        postCreate: function() {
            this.inherited(arguments);
        },
        addLayer: function(layerInfo) {
            var overlay = new Overlay({
                map: this.map,
                container: this,
                layerInfo: layerInfo
            });
            on(overlay, 'control-loaded', lang.hitch(this, function(r) {
                this.emit('control-loaded', r);
            }));
            overlay.startup();
        },
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
        identify: function(layer, type, layerId) {
            if (this.iquert) {
                this.iquert.identify(layer, type, layerId);
            } else {
                this.map.alert('This application is not configured for identifying.', 'Error');
            }
        },
        query: function(layer, layerId) {
            if (this.iquert) {
                this.iquert.query(layer, layerId);
            } else {
                this.map.alert('This application is not configured for querying.', 'Error');
            }
        },
        queryBuilder: function(layer, layerId) {
            if (this.iquert) {
                this.iquert.queryBuilder(layer, layerId);
            } else {
                this.map.alert('This application is not configured for query building.', 'Error');
            }
        }
    });
});
