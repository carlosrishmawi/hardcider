/*
 * Copyright (c) 2014 Ben Fousek
 * https://github.com/btfou/hardcider
 *
 * requires fgdb.min.js
 * https://github.com/calvinmetcalf/fileGDB.js
 */
define([
    'dojo/_base/declare',
    'dojo/_base/lang',
    'dojo/_base/array',
    'dojo/on',
    'dojo/dom-construct',
    'dojo/dom-class',
    'dijit/_WidgetBase',
    'dijit/_TemplatedMixin',
    'dijit/_WidgetsInTemplateMixin',
    'dojo/text!hardcider/dijit/templates/AddGDB.html'
], function(
    declare,
    lang,
    array,
    on,
    domConst,
    domClass,
    WidgetBase,
    TemplatedMixin,
    WidgetsInTemplateMixin,
    template
) {
    return declare([WidgetBase, TemplatedMixin, WidgetsInTemplateMixin], {
        templateString: template,
        _collections: null,
        constructor: function(options) {
            options = options || {};
            lang.mixin(this, options);
        },
        postCreate: function() {
            this.inherited(arguments);
            on(this.zipNode, 'change', lang.hitch(this, function(evt) {
                this._getLayers(this.zipNode);
            }));
            on(this.filesNode, 'change', lang.hitch(this, function(evt) {
                this._getLayers(this.filesNode);
            }));
        },
        _getLayers: function(node) {
            this._collections = null;
            this.layersNode.innerHTML = '<div class="hardcider-add-layer-gdb-layer"><i class="fa fa-spinner fa-spin"></i> Getting layers...</div>';
            window.fgdb(node.files).then(lang.hitch(this, this._displayLayers), lang.hitch(this, function(e) {
                console.log(e);
                this.layersNode.innerHTML = '<div class="hardcider-add-layer-gdb-layer">No Layers</div>';
                this.map.alert('The zip file or files uploaded are not valid.', 'Geodatabase Error');
            }));
        },
        _displayLayers: function(r) {
            this.layersNode.innerHTML = '';
            this._collections = r;
            for (var i in r) {
                if (r.hasOwnProperty(i)) {
                    this._addLayerItem(i, r[i].features[0].geometry.type || 'Unknown Type', r[i].features.length);
                }
            }
        },
        _addLayerItem: function(name, type, count) {
            var div = domConst.create('div', {
                innerHTML: name + '&nbsp;&nbsp;(Type: ' + type + ', Count: ' + count + ')'
            }, this.layersNode, 'last');
            domClass.add(div, ['hardcider-click', 'hardcider-add-layer-gdb-layer']);
            on.once(div, 'click', lang.hitch(this, function() {
                this._addLayer(div, name);
            }));
        },
        _addLayer: function(node, name) {
            domConst.destroy(node);
            if (!this.layersNode.innerHTML) {
                this.layersNode.innerHTML = '<div class="hardcider-add-layer-gdb-layer">No Layers</div>';
            }

            console.log(name);
        },
        _zipUpload: function() {
            this.zipNode.click();
        },
        _filesUpload: function() {
            this.filesNode.click();
        }
    });
});
