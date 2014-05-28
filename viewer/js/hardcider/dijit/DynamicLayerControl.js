/*
 * Copyright (c) 2014 Ben Fousek
 * https://github.com/btfou/hardcider
 */
define([
    'dojo/_base/declare',
    'dojo/_base/lang',
    'dojo/_base/array',
    'dojo/on',
    'dojo/query',
    'dojo/dom-class',
    'dojo/dom-style',
    'dojo/dom-construct',
    'dojo/dom-attr',
    'dijit/registry',
    'dijit/_WidgetBase',
    'dijit/_TemplatedMixin',
    'dijit/_Contained',
    'dijit/Menu',
    'dijit/MenuItem',
    'dijit/PopupMenuItem',
    'dijit/MenuSeparator',
    'dijit/TooltipDialog',
    'dijit/form/CheckBox',
    'dijit/form/HorizontalSlider',
    'dijit/form/HorizontalRuleLabels',
    'esri/layers/ImageParameters',
    'esri/layers/ArcGISDynamicMapServiceLayer',
    'hardcider/utility/esri-rest',
    'dojo/text!hardcider/dijit/templates/LayerControl.html',
    'dojo/text!hardcider/dijit/templates/DynamicFolderControl.html',
    'dojo/text!hardcider/dijit/templates/DynamicSublayerControl.html'
], function(
    declare,
    lang,
    array,
    on,
    query,
    domClass,
    domStyle,
    domConst,
    domAttr,
    registry,
    WidgetBase,
    TemplatedMixin,
    Contained,
    Menu,
    MenuItem,
    PopupMenuItem,
    MenuSeparator,
    TooltipDialog,
    CheckBox,
    HorizontalSlider,
    HorizontalRuleLabels,
    ImageParams,
    Dynamic,
    esriRest,
    layerControlTemplate,
    dynamicFolderControlTemplate,
    dynamicSublayerControlTemplate
) {
    //folder (layer group) control widget
    var FolderControl = declare([WidgetBase, TemplatedMixin], {
        templateString: dynamicFolderControlTemplate,
        controller: null, //dynamic layer control
        folderInfo: null, //esri rest layer info for folder (layer group)
        constructor: function(options) {
            options = options || {};
            lang.mixin(this, options);
        },
        postCreate: function() {
            this.inherited(arguments);
            //create the checkbox and init control
            this.checkbox = new CheckBox({
                checked: this.folderInfo.defaultVisibility,
                onChange: lang.hitch(this, function() {
                    this.controller.setVisibleLayers();
                    this._checkboxScaleRange();
                })
            }, this.checkboxNode);
            this.labelNode.innerHTML = this.folderInfo.name;
            on(this.expandClickNode, 'click', lang.hitch(this, function() {
                var expandNode = this.expandNode,
                    iconNode = this.expandIconNode;
                if (domStyle.get(expandNode, 'display') === 'none') {
                    domClass.remove(expandNode, 'hardcider-display-none');
                    domClass.remove(iconNode, 'fa-folder-o');
                    domClass.add(iconNode, 'fa-folder-open-o');
                } else {
                    domClass.add(expandNode, 'hardcider-display-none');
                    domClass.remove(iconNode, 'fa-folder-open-o');
                    domClass.add(iconNode, 'fa-folder-o');
                }
            }));
            if (this.folderInfo.minScale !== 0 || this.folderInfo.maxScale !== 0) {
                this._checkboxScaleRange();
                this.controller.controlContainer.map.on('zoom-end', lang.hitch(this, this._checkboxScaleRange));
            }
            domAttr.set(this.checkbox.focusNode, 'data-layer-id', this.folderInfo.id);
            domClass.add(this.checkbox.focusNode, this.controller.layer.id + '-layer-checkbox');
        },
        //check scales and add/remove disabled classes from checkbox
        _checkboxScaleRange: function() {
            var node = this.checkbox.domNode,
                checked = this.checkbox.checked,
                scale = this.controller.controlContainer.map.getScale(),
                min = this.folderInfo.minScale,
                max = this.folderInfo.maxScale,
                x = 'dijitCheckBoxDisabled',
                y = 'dijitCheckBoxCheckedDisabled';
            domClass.remove(node, [x, y]);
            if (min !== 0 && scale > min) {
                if (checked) {
                    domClass.add(node, y);
                } else {
                    domClass.add(node, x);
                }
            }
            if (max !== 0 && scale < max) {
                if (checked) {
                    domClass.add(node, y);
                } else {
                    domClass.add(node, x);
                }
            }
        }
    });

    //sublayer control widget
    var SublayerControl = declare([WidgetBase, TemplatedMixin], {
        templateString: dynamicSublayerControlTemplate,
        controller: null, //dynamic layer control
        sublayerInfo: null, //esri rest layer info for sublayer
        constructor: function(options) {
            options = options || {};
            lang.mixin(this, options);
        },
        postCreate: function() {
            this.inherited(arguments);
            //create the checkbox and init control
            this.checkbox = new CheckBox({
                checked: this.sublayerInfo.defaultVisibility,
                onChange: lang.hitch(this, function() {
                    this.controller.setVisibleLayers();
                    this._checkboxScaleRange();
                })
            }, this.checkboxNode);
            this.labelNode.innerHTML = this.sublayerInfo.name;
            on(this.expandClickNode, 'click', lang.hitch(this, function() {
                var expandNode = this.expandNode,
                    iconNode = this.expandIconNode;
                if (domStyle.get(expandNode, 'display') === 'none') {
                    domClass.remove(expandNode, 'hardcider-display-none');
                    domClass.remove(iconNode, 'fa-plus-square-o');
                    domClass.add(iconNode, 'fa-minus-square-o');
                } else {
                    domClass.add(expandNode, 'hardcider-display-none');
                    domClass.remove(iconNode, 'fa-minus-square-o');
                    domClass.add(iconNode, 'fa-plus-square-o');
                }
            }));
            if (this.sublayerInfo.minScale !== 0 || this.sublayerInfo.maxScale !== 0) {
                this._checkboxScaleRange();
                this.controller.controlContainer.map.on('zoom-end', lang.hitch(this, this._checkboxScaleRange));
            }
            domAttr.set(this.checkbox.focusNode, 'data-layer-id', this.sublayerInfo.id);
            domClass.add(this.checkbox.focusNode, this.controller.layer.id + '-layer-checkbox');
            this._createLayerMenu();
        },
        //check scales and add/remove disabled classes from checkbox
        _checkboxScaleRange: function() {
            var node = this.checkbox.domNode,
                checked = this.checkbox.checked,
                scale = this.controller.controlContainer.map.getScale(),
                min = this.sublayerInfo.minScale,
                max = this.sublayerInfo.maxScale,
                x = 'dijitCheckBoxDisabled',
                y = 'dijitCheckBoxCheckedDisabled';
            domClass.remove(node, [x, y]);
            if (min !== 0 && scale > min) {
                if (checked) {
                    domClass.add(node, y);
                } else {
                    domClass.add(node, x);
                }
            }
            if (max !== 0 && scale < max) {
                if (checked) {
                    domClass.add(node, y);
                } else {
                    domClass.add(node, x);
                }
            }
        },
        _createLayerMenu: function() {
            this.menu = new Menu({
                contextMenuForWindow: false,
                targetNodeIds: [this.labelNode],
                leftClickToOpen: true
            });
            var li = this.controller.layerInfo,
                controlContainer = this.controller.controlContainer;
            if (li.identify) {
                var idMenu = new Menu();
                idMenu.addChild(new MenuItem({
                    label: 'Point',
                    onClick: lang.hitch(this, function() {
                        controlContainer.identify(this.controller.layer, 'point', this.sublayerInfo.id);
                    })
                }));
                idMenu.addChild(new MenuItem({
                    label: 'Extent',
                    onClick: lang.hitch(this, function() {
                        controlContainer.identify(this.controller.layer, 'extent', this.sublayerInfo.id);
                    })
                }));
                idMenu.addChild(new MenuItem({
                    label: 'Polygon',
                    onClick: lang.hitch(this, function() {
                        controlContainer.identify(this.controller.layer, 'polygon', this.sublayerInfo.id);
                    })
                }));
                idMenu.startup();
                this.menu.addChild(new PopupMenuItem({
                    label: 'Identify',
                    popup: idMenu
                }));
            }
            if (li.query) {
                this.menu.addChild(new MenuItem({
                    label: 'Query',
                    onClick: lang.hitch(this, function() {
                        controlContainer.query(this.controller.layer, this.sublayerInfo.id);
                    })
                }));
                this.menu.addChild(new MenuItem({
                    label: 'Query Builder',
                    onClick: lang.hitch(this, function() {
                        controlContainer.queryBuilder(this.controller.layer, this.sublayerInfo.id);
                    })
                }));
            }
            this.menu.startup();
        }
    });

    //dynamic layer control
    return declare([WidgetBase, TemplatedMixin, Contained], {
        templateString: layerControlTemplate,
        controlContainer: null,
        layerInfo: null,
        constructor: function(options) {
            options = options || {};
            lang.mixin(this, options);
        },
        postCreate: function() {
            this.inherited(arguments);
            if (!this.layerInfo) {
                console.log('DynamicLayerControl error::layerInfo option is required');
                this.destroy();
                return;
            }
            if (!this.controlContainer) {
                console.log('DynamicLayerControl error::controlContainer option is required');
                this.destroy();
                return;
            }
            this._addLayer(this.layerInfo, this.controlContainer.map);
        },

        toggleLayer: function() {
            var l = this.layer;
            if (l.visible) {
                l.hide();
            } else {
                l.show();
            }
            if (l.minScale !== 0 || l.maxScale !== 0) {
                this._checkboxScaleRange();
            }
        },
        //set dynamic layer visible layers
        //perhaps should be private
        setVisibleLayers: function() {
            var setLayers = [];
            array.forEach(query('.' + this.layer.id + '-layer-checkbox'), function(i) {
                if (i.checked) {
                    setLayers.push(parseInt(domAttr.get(i, 'data-layer-id'), 10));
                }
            }, this);
            array.forEach(this.layer.layerInfos, function(info) {
                if (info.subLayerIds !== null && array.indexOf(setLayers, info.id) === -1) {
                    array.forEach(info.subLayerIds, function(sub) {
                        if (array.indexOf(setLayers, sub) !== -1) {
                            setLayers.splice(array.indexOf(setLayers, sub), 1);
                        }
                    });
                } else if (info.subLayerIds !== null && array.indexOf(setLayers, info.id) !== -1) {
                    setLayers.splice(array.indexOf(setLayers, info.id), 1);
                }
            }, this);
            if (setLayers.length !== 0) {
                this.layer.setVisibleLayers(setLayers);
                this.layer.refresh();
            } else {
                this.layer.setVisibleLayers([-1]);
                this.layer.refresh();
            }
        },
        //add ags dynamic layer and init control
        _addLayer: function(layerInfo, map) {
            var li = lang.mixin({
                secured: false,
                token: null,
                visible: false,
                opacity: 1,
                imageFormat: 'png32',
                dpi: 96,
                sublayers: true,
                identify: true,
                query: true
            }, layerInfo);
            this.layerInfo = li;
            var ip = lang.mixin(new ImageParams(), {
                format: li.imageFormat,
                dpi: li.dpi
            });
            this.layer = new Dynamic((li.secured) ? li.url + '?token=' + li.token : li.url, {
                id: li.id,
                imageParameters: ip,
                visible: li.visible,
                opacity: li.opacity
            });
            this.layer.layerParams = li;
            if (li.secured) {
                this.layer.url = li.url;
            }
            map.addLayer(this.layer);
            this.checkbox = new CheckBox({
                checked: li.visible,
                onChange: lang.hitch(this, this.toggleLayer)
            }, this.checkboxNode);
            this.labelNode.innerHTML = li.name;
            this.layer.on('update-start', lang.hitch(this, function() {
                domClass.remove(this.layerUpdateNode, 'hardcider-display-none');
            }));
            this.layer.on('update-end', lang.hitch(this, function() {
                domClass.add(this.layerUpdateNode, 'hardcider-display-none');
            }));
            on(this.layer, 'load', lang.hitch(this, function() {
                if (this.layer.minScale !== 0 || this.layer.maxScale !== 0) {
                    this._checkboxScaleRange();
                    map.on('zoom-end', lang.hitch(this, this._checkboxScaleRange));
                }
            }));
            on(this.layer, 'scale-range-change', lang.hitch(this, function() {
                if (this.layer.minScale !== 0 || this.layer.maxScale !== 0) {
                    this._checkboxScaleRange();
                    map.on('zoom-end', lang.hitch(this, this._checkboxScaleRange));
                } else {
                    this._checkboxScaleRange();
                }
            }));
            if (li.sublayers) {
                on(this.expandClickNode, 'click', lang.hitch(this, function() {
                    var expandNode = this.expandNode,
                        iconNode = this.expandIconNode;
                    if (domStyle.get(expandNode, 'display') === 'none') {
                        domClass.remove(expandNode, 'hardcider-display-none');
                        domClass.remove(iconNode, 'fa-plus-square-o');
                        domClass.add(iconNode, 'fa-minus-square-o');
                    } else {
                        domClass.add(expandNode, 'hardcider-display-none');
                        domClass.remove(iconNode, 'fa-minus-square-o');
                        domClass.add(iconNode, 'fa-plus-square-o');
                    }
                }));
                on(this.layer, 'load', lang.hitch(this, function() {
                    this._addSublayers();
                }));
            } else {
                domClass.remove(this.expandIconNode, ['fa', 'fa-plus-square-o', 'hardcider-layer-icon']);
                domStyle.set(this.expandIconNode, 'cursor', 'default');
                domConst.destroy(this.expandNode);
            }
            this._createLayerMenu();
        },
        _addSublayers: function() {
            array.forEach(this.layer.layerInfos, lang.hitch(this, function(info) {
                var pid = info.parentLayerId,
                    slids = info.subLayerIds,
                    control;
                if (pid === -1 && slids === null) {
                    //it's a top level sublayer
                    control = new SublayerControl({
                        id: this.layer.id + '-' + info.id + '-sublayer-control',
                        controller: this,
                        sublayerInfo: info
                    });
                    domConst.place(control.domNode, this.expandNode, 'last');
                } else if (pid === -1 && slids !== null) {
                    //it's a top level folder
                    control = new FolderControl({
                        id: this.layer.id + '-' + info.id + '-sublayer-control',
                        controller: this,
                        folderInfo: info
                    });
                    domConst.place(control.domNode, this.expandNode, 'last');
                } else if (pid !== -1 && slids !== null) {
                    //it's a nested folder
                    control = new FolderControl({
                        id: this.layer.id + '-' + info.id + '-sublayer-control',
                        controller: this,
                        folderInfo: info
                    });
                    domConst.place(control.domNode, registry.byId(this.layer.id + '-' + info.parentLayerId + '-sublayer-control').expandNode, 'last');
                } else if (pid !== -1 && slids === null) {
                    //it's a nested sublayer
                    control = new SublayerControl({
                        id: this.layer.id + '-' + info.id + '-sublayer-control',
                        controller: this,
                        sublayerInfo: info
                    });
                    domConst.place(control.domNode, registry.byId(this.layer.id + '-' + info.parentLayerId + '-sublayer-control').expandNode, 'last');
                }
            }));
            if (this.layer.version >= 10.01) {
                esriRest.getLegend(this.layer).then(lang.hitch(this, this._createLegends));
            }
        },
        //create legends for each sublayer and place in sublayer control's expand node
        _createLegends: function(r) {
            array.forEach(r.layers, function(layer) {
                var legendContent = '<table class="' + this.layer.id + '-' + layer.layerId + '-legend hardcider-layer-legend">';
                array.forEach(layer.legend, function(legend) {
                    var label = legend.label || '&nbsp;';
                    legendContent += '<tr><td><img class="' + this.layer.id + '-legend-image hardcider-layer-legend-image" style="width:' + legend.width + ';height:' + legend.height + ';" src="data:' + legend.contentType + ';base64,' + legend.imageData + '" alt="' + label + '" /></td><td class="hardcider-layer-legend-label">' + label + '</td></tr>';
                }, this);
                legendContent += '</table>';
                registry.byId(this.layer.id + '-' + layer.layerId + '-sublayer-control').expandNode.innerHTML = legendContent;
            }, this);
            array.forEach(query('.' + this.layer.id + '-legend-image'), function(img) {
                domStyle.set(img, 'opacity', this.layer.opacity);
            }, this);
        },
        //check scales and add/remove disabled classes from checkbox
        _checkboxScaleRange: function() {
            var node = this.checkbox.domNode,
                checked = this.checkbox.checked,
                scale = this.controlContainer.map.getScale(),
                min = this.layer.minScale,
                max = this.layer.maxScale,
                x = 'dijitCheckBoxDisabled',
                y = 'dijitCheckBoxCheckedDisabled';
            domClass.remove(node, [x, y]);
            if (min !== 0 && scale > min) {
                if (checked) {
                    domClass.add(node, y);
                } else {
                    domClass.add(node, x);
                }
            }
            if (max !== 0 && scale < max) {
                if (checked) {
                    domClass.add(node, y);
                } else {
                    domClass.add(node, x);
                }
            }
        },
        //create the layer control menu
        _createLayerMenu: function() {
            this.menu = new Menu({
                contextMenuForWindow: false,
                targetNodeIds: [this.labelNode],
                leftClickToOpen: true
            });
            var menu = this.menu,
                li = this.layerInfo,
                layer = this.layer,
                controlContainer = this.controlContainer;
            //not sure about this any more
            /*if (li.identify) {
                this.menu.addChild(new MenuItem({
                    label: 'Identify ' + li.name,
                    onClick: lang.hitch(this, function() {
                        controlContainer.identify(this.layer);
                    })
                }));
                this.menu.addChild(new MenuSeparator());
            }*/
            if (this.controlContainer.reorder) {
                menu.addChild(new MenuItem({
                    label: 'Move Layer Up',
                    onClick: lang.hitch(this, function() {
                        controlContainer.moveUp(this);
                    })
                }));
                menu.addChild(new MenuItem({
                    label: 'Move Layer Down',
                    onClick: lang.hitch(this, function() {
                        controlContainer.moveDown(this);
                    })
                }));
                menu.addChild(new MenuSeparator());
            }
            menu.addChild(new MenuItem({
                label: 'Zoom to Layer Extent',
                onClick: lang.hitch(this, function() {
                    this.controlContainer.zoomToLayerExtent(layer);
                })
            }));
            this.opacitySlider = new HorizontalSlider({
                id: li.id + '_opacity_slider',
                value: li.opacity || 1,
                minimum: 0,
                maximum: 1,
                discreteValues: 11,
                showButtons: false,
                onChange: lang.hitch(this, function(value) {
                    layer.setOpacity(value);
                    array.forEach(query('.' + li.id + '-legend-image'), function(img) {
                        domStyle.set(img, 'opacity', value);
                    });
                })
            });
            var rule = new HorizontalRuleLabels({
                style: 'height:1em;font-size:75%;color:gray;'
            }, this.opacitySlider.bottomDecoration);
            rule.startup();
            var opacityTooltip = new TooltipDialog({
                style: 'width:200px;',
                content: this.opacitySlider
            });
            domStyle.set(opacityTooltip.connectorNode, 'display', 'none');
            menu.addChild(new PopupMenuItem({
                label: 'Layer Opacity',
                popup: opacityTooltip
            }));
            var swipeMenu = new Menu();
            swipeMenu.addChild(new MenuItem({
                label: 'Horizontal',
                onClick: lang.hitch(this, function() {
                    controlContainer.map.swipeLayer(layer, 'horizontal');
                })
            }));
            swipeMenu.addChild(new MenuItem({
                label: 'Vertical',
                onClick: lang.hitch(this, function() {
                    controlContainer.map.swipeLayer(layer, 'vertical');
                })
            }));
            menu.addChild(new PopupMenuItem({
                label: 'Layer Swipe',
                popup: swipeMenu
            }));
            menu.startup();
        }
    });
});
