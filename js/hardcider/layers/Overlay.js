/*
 * Copyright (c) 2014 Ben Fousek
 * https://github.com/btfou/hardcider
 */
define([
    'dojo/_base/declare',
    'dojo/_base/lang',
    'dojo/_base/array',
    'dojo/Evented',
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
    //'dijit/Dialog',
    'dijit/form/CheckBox',
    'dijit/form/HorizontalSlider',
    'dijit/form/HorizontalRuleLabels',
    'esri/layers/ImageParameters',
    'esri/layers/ArcGISDynamicMapServiceLayer',
    'esri/layers/ArcGISTiledMapServiceLayer',
    'esri/layers/WebTiledLayer',
    'esri/tasks/ProjectParameters',
    'esri/config',
    'hardcider/utility/esri-rest',
    'dojo/text!hardcider/layers/templates/OverlayFolder.html',
    'dojo/text!hardcider/layers/templates/OverlaySublayer.html',
    'dojo/text!hardcider/layers/templates/Overlay.html'
], function(
    declare,
    lang,
    array,
    Evented,
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
    //Dialog,
    CheckBox,
    HorizontalSlider,
    HorizontalRuleLabels,
    ImageParams,
    Dynamic,
    Tiled,
    WebTiled,
    ProjectParams,
    esriConfig,
    esriRest,
    folderTemplate,
    sublayerTemplate,
    overlayTemplate
) {
    //folder class
    var Folder = declare([WidgetBase, TemplatedMixin], {
        templateString: folderTemplate,
        constructor: function(options) {
            lang.mixin(this, options);
        },
        postCreate: function() {
            this.inherited(arguments);
            this.checkbox = new CheckBox({
                checked: this.info.defaultVisibility,
                onChange: lang.hitch(this, function() {
                    this.control.setVisibleLayers();
                    this._checkboxScaleRange();
                })
            }, this.checkboxNode);
            this.labelNode.innerHTML = this.info.name;
            on(this.expandClickNode, 'click', lang.hitch(this, function() {
                var subNode = this.sublayerNode;
                var expNode = this.expandNode;
                if (domStyle.get(subNode, 'display') === 'none') {
                    domClass.remove(subNode, 'hardcider-layer-none');
                    domClass.remove(expNode, 'fa-folder-o');
                    domClass.add(expNode, 'fa-folder-open-o');
                } else {
                    domClass.add(subNode, 'hardcider-layer-none');
                    domClass.remove(expNode, 'fa-folder-open-o');
                    domClass.add(expNode, 'fa-folder-o');
                }
            }));
            if (this.info.minScale !== 0 || this.info.maxScale !== 0) {
                this._checkboxScaleRange();
                on(this.control.map, 'zoom-end', lang.hitch(this, this._checkboxScaleRange));
            }
            domAttr.set(this.checkbox.focusNode, 'data-layer-id', this.info.id);
            domClass.add(this.checkbox.focusNode, this.control.layer.id + '-layer-checkbox');
        },
        _checkboxScaleRange: function() {
            var node = this.checkbox.domNode,
                checked = this.checkbox.checked,
                scale = this.control.map.getScale(),
                min = this.info.minScale,
                max = this.info.maxScale,
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
    //sublayer class
    var Sublayer = declare([WidgetBase, TemplatedMixin], {
        templateString: sublayerTemplate,
        constructor: function(options) {
            lang.mixin(this, options);
        },
        postCreate: function() {
            this.inherited(arguments);
            this.checkbox = new CheckBox({
                checked: this.info.defaultVisibility,
                onChange: lang.hitch(this, function() {
                    this.control.setVisibleLayers();
                    this._checkboxScaleRange();
                })
            }, this.checkboxNode);
            this.labelNode.innerHTML = this.info.name;
            on(this.expandClickNode, 'click', lang.hitch(this, function() {
                var subNode = this.sublayerNode;
                var expNode = this.expandNode;
                if (domStyle.get(subNode, 'display') === 'none') {
                    domClass.remove(subNode, 'hardcider-layer-none');
                    domClass.remove(expNode, 'fa-plus-square-o');
                    domClass.add(expNode, 'fa-minus-square-o');
                } else {
                    domClass.add(subNode, 'hardcider-layer-none');
                    domClass.remove(expNode, 'fa-minus-square-o');
                    domClass.add(expNode, 'fa-plus-square-o');
                }
            }));
            if (this.info.minScale !== 0 || this.info.maxScale !== 0) {
                this._checkboxScaleRange();
                on(this.control.map, 'zoom-end', lang.hitch(this, this._checkboxScaleRange));
            }
            domAttr.set(this.checkbox.focusNode, 'data-layer-id', this.info.id);
            domClass.add(this.checkbox.focusNode, this.control.layer.id + '-layer-checkbox');
            this._createLayerMenu();
        },
        _checkboxScaleRange: function() {
            var node = this.checkbox.domNode,
                checked = this.checkbox.checked,
                scale = this.control.map.getScale(),
                min = this.info.minScale,
                max = this.info.maxScale,
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
            var li = this.control.layerInfo;
            this.menu = new Menu({
                contextMenuForWindow: false,
                targetNodeIds: [this.labelNode],
                leftClickToOpen: true
            });
            if (li.identify) {
                var idMenu = new Menu();
                idMenu.addChild(new MenuItem({
                    label: 'Point',
                    onClick: lang.hitch(this, function() {
                        this.control.container.identify(this.control.layer, 'point', this.info.id);
                    })
                }));
                idMenu.addChild(new MenuItem({
                    label: 'Extent',
                    onClick: lang.hitch(this, function() {
                        this.control.container.identify(this.control.layer, 'extent', this.info.id);
                    })
                }));
                idMenu.addChild(new MenuItem({
                    label: 'Polygon',
                    onClick: lang.hitch(this, function() {
                        this.control.container.identify(this.control.layer, 'polygon', this.info.id);
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
                        this.control.container.query(this.control.layer, this.info.id);
                    })
                }));
                this.menu.addChild(new MenuItem({
                    label: 'Query Builder',
                    onClick: lang.hitch(this, function() {
                        this.control.container.queryBuilder(this.control.layer, this.info.id);
                    })
                }));
            }
            this.menu.startup();
        }
    });
    //the layer control
    return declare([WidgetBase, TemplatedMixin, Contained, Evented], {
        templateString: overlayTemplate,
        map: null,
        container: null,
        layerInfo: null,
        constructor: function(options) {
            lang.mixin(this, options);
        },
        postCreate: function() {
            this.inherited(arguments);
            switch (this.layerInfo.type) {
                case 'dynamic':
                    this._addDynamic(this.layerInfo);
                    break;
                case 'tiled':
                    this._addTiled(this.layerInfo);
                    break;
                case 'webTiled':
                    this._addWebTiled(this.layerInfo);
                    break;
                default:
                    this.destroy();
                    break;
            }
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
        zoomLayerExtent: function() {
            if (this.layer.spatialReference === this.map.spatialReference) {
                this.map.setExtent(this.layer.fullExtent, true);
            } else {
                var params = new ProjectParams();
                params.geometries = [this.layer.fullExtent];
                params.outSR = this.map.spatialReference;
                if (esriConfig.defaults.geometryService) {
                    esriConfig.defaults.geometryService.project(params, lang.hitch(this, function(r) {
                        this.map.setExtent(r[0], true);
                    }), function(e) {
                        console.log(e);
                    });
                } else {
                    console.log('zoomLayerExtent::esriConfig.defaults.geometryService is not set');
                }
            }
        },
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
        //add ags dynamic layer
        _addDynamic: function(layerInfo) {
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
            var ip = new ImageParams();
            ip.format = li.imageFormat;
            ip.dpi = li.dpi;
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
            this.map.addLayer(this.layer);
            this.checkbox = new CheckBox({
                checked: li.visible,
                onChange: lang.hitch(this, this.toggleLayer)
            }, this.checkboxNode);
            this.labelNode.innerHTML = li.name;
            this.layer.on('update-start', lang.hitch(this, function() {
                domClass.remove(this.layerUpdateNode, 'hardcider-layer-none');
            }));
            this.layer.on('update-end', lang.hitch(this, function() {
                domClass.add(this.layerUpdateNode, 'hardcider-layer-none');
            }));
            on(this.layer, 'load', lang.hitch(this, function() {
                this.emit('control-loaded', this);
                if (this.layer.minScale !== 0 || this.layer.maxScale !== 0) {
                    this._checkboxScaleRange();
                    on(this.map, 'zoom-end', lang.hitch(this, this._checkboxScaleRange));
                }
            }));
            on(this.layer, 'scale-range-change', lang.hitch(this, function() {
                if (this.layer.minScale !== 0 || this.layer.maxScale !== 0) {
                    this._checkboxScaleRange();
                    on(this.map, 'zoom-end', lang.hitch(this, this._checkboxScaleRange));
                } else {
                    this._checkboxScaleRange();
                }
            }));
            if (li.sublayers) {
                on(this.expandClickNode, 'click', lang.hitch(this, function() {
                    var subNode = this.sublayerNode;
                    var expNode = this.expandNode;
                    if (domStyle.get(subNode, 'display') === 'none') {
                        domClass.remove(subNode, 'hardcider-layer-none');
                        domClass.remove(expNode, 'fa-plus-square-o');
                        domClass.add(expNode, 'fa-minus-square-o');
                    } else {
                        domClass.add(subNode, 'hardcider-layer-none');
                        domClass.remove(expNode, 'fa-minus-square-o');
                        domClass.add(expNode, 'fa-plus-square-o');
                    }
                }));
                on(this.layer, 'load', lang.hitch(this, function() {
                    this._addSublayers();
                }));
            } else {
                domClass.remove(this.expandNode, ['fa', 'fa-plus-square-o', 'hardcider-layer-icon']);
                domStyle.set(this.expandNode, 'cursor', 'default');
                domConst.destroy(this.sublayersNode);
            }
            this._createLayerMenu();
            this.container.addChild(this, 'first');
        },
        _addSublayers: function() {
            array.forEach(this.layer.layerInfos, lang.hitch(this, function(info) {
                var pid = info.parentLayerId,
                    slids = info.subLayerIds,
                    control;
                if (pid === -1 && slids === null) {
                    //it's a top level sublayer
                    control = new Sublayer({
                        id: this.layer.id + '-' + info.id + '-sublayer-control',
                        control: this,
                        info: info
                    });
                    domConst.place(control.domNode, this.sublayerNode, 'last');
                } else if (pid === -1 && slids !== null) {
                    //it's a top level folder
                    control = new Folder({
                        id: this.layer.id + '-' + info.id + '-sublayer-control',
                        control: this,
                        info: info
                    });
                    domConst.place(control.domNode, this.sublayerNode, 'last');
                } else if (pid !== -1 && slids !== null) {
                    //it's a nested folder
                    control = new Folder({
                        id: this.layer.id + '-' + info.id + '-sublayer-control',
                        control: this,
                        info: info
                    });
                    domConst.place(control.domNode, registry.byId(this.layer.id + '-' + info.parentLayerId + '-sublayer-control').sublayerNode, 'last');
                } else if (pid !== -1 && slids === null) {
                    //it's a nested sublayer
                    control = new Sublayer({
                        id: this.layer.id + '-' + info.id + '-sublayer-control',
                        control: this,
                        info: info
                    });
                    domConst.place(control.domNode, registry.byId(this.layer.id + '-' + info.parentLayerId + '-sublayer-control').sublayerNode, 'last');
                }
            }));
            if (this.layer.version >= 10.01) {
                esriRest.getLegend(this.layer).then(lang.hitch(this, this._createLegends));
            }
        },
        _createLegends: function(r) {
            array.forEach(r.layers, function(layer) {
                var legendContent = '<table class="' + this.layer.id + '-' + layer.layerId + '-legend hardcider-layer-legend">';
                array.forEach(layer.legend, function(legend) {
                    var label = legend.label || '&nbsp;';
                    legendContent += '<tr><td><img class="' + this.layer.id + '-legend-image hardcider-layer-legend-image" style="width:' + legend.width + ';height:' + legend.height + ';" src="data:' + legend.contentType + ';base64,' + legend.imageData + '" alt="' + label + '" /></td><td class="hardcider-layer-legend-label">' + label + '</td></tr>';
                }, this);
                legendContent += '</table>';
                registry.byId(this.layer.id + '-' + layer.layerId + '-sublayer-control').sublayerNode.innerHTML = legendContent;
            }, this);
            array.forEach(query('.' + this.layer.id + '-legend-image'), function(img) {
                domStyle.set(img, 'opacity', this.layer.opacity);
            }, this);
        },
        //add ags tiled layer
        _addTiled: function(layerInfo) {
            var li = lang.mixin({
                secured: false,
                token: null,
                visible: false,
                opacity: 1,
                resampling: true
            }, layerInfo);
            this.layerInfo = li;
            this.layer = new Tiled((li.secured) ? li.url + '?token=' + li.token : li.url, {
                id: li.id,
                visible: li.visible,
                opacity: li.opacity,
                resampling: li.resampling
            });
            this.layer.layerParams = li;
            if (li.secured) {
                this.layer.url = li.url;
            }
            this.map.addLayer(this.layer);
            this.checkbox = new CheckBox({
                checked: li.visible,
                onChange: lang.hitch(this, this.toggleLayer)
            }, this.checkboxNode);
            this.labelNode.innerHTML = li.name;
            this.layer.on('update-start', lang.hitch(this, function() {
                domClass.remove(this.layerUpdateNode, 'hardcider-layer-none');
            }));
            this.layer.on('update-end', lang.hitch(this, function() {
                domClass.add(this.layerUpdateNode, 'hardcider-layer-none');
            }));
            on(this.layer, 'load', lang.hitch(this, function() {
                this.emit('control-loaded', this);
                if (this.layer.minScale !== 0 || this.layer.maxScale !== 0) {
                    this._checkboxScaleRange();
                    on(this.map, 'zoom-end', lang.hitch(this, this._checkboxScaleRange));
                }
            }));
            on(this.layer, 'scale-range-change', lang.hitch(this, function() {
                if (this.layer.minScale !== 0 || this.layer.maxScale !== 0) {
                    this._checkboxScaleRange();
                    on(this.map, 'zoom-end', lang.hitch(this, this._checkboxScaleRange));
                } else {
                    this._checkboxScaleRange();
                }
            }));
            this._createLayerMenu();
            domClass.remove(this.expandNode, ['fa', 'fa-plus-square-o', 'hardcider-layer-icon']);
            domStyle.set(this.expandNode.parentNode, 'cursor', 'default');
            domConst.destroy(this.sublayersNode);
            this.container.addChild(this, 'first');
        },
        //add web tiled layer
        _addWebTiled: function(layerInfo) {
            var li = lang.mixin({
                visible: false,
                opacity: 1,
                subDomains: [],
                copyright: '',
                resampling: true
            }, layerInfo);
            this.layerInfo = li;
            this.layer = new WebTiled(li.template, {
                id: li.id,
                visible: li.visible,
                opacity: li.opacity,
                subDomains: li.subDomains,
                copyright: li.copyright,
                resampling: li.resampling
            });
            this.layer.layerParams = li;
            this.map.addLayer(this.layer);
            this.checkbox = new CheckBox({
                checked: li.visible,
                onChange: lang.hitch(this, this.toggleLayer)
            }, this.checkboxNode);
            this.labelNode.innerHTML = li.name;
            this.layer.on('update-start', lang.hitch(this, function() {
                domClass.remove(this.layerUpdateNode, 'hardcider-layer-none');
            }));
            this.layer.on('update-end', lang.hitch(this, function() {
                domClass.add(this.layerUpdateNode, 'hardcider-layer-none');
            }));
            this._createLayerMenu();
            domClass.remove(this.expandNode, ['fa', 'fa-plus-square-o', 'hardcider-layer-icon']);
            domStyle.set(this.expandNode.parentNode, 'cursor', 'default');
            domConst.destroy(this.sublayersNode);
            this.container.addChild(this, 'first');
            this.emit('control-loaded', this);
        },
        _checkboxScaleRange: function() {
            var node = this.checkbox.domNode,
                checked = this.checkbox.checked,
                scale = this.map.getScale(),
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
        _createLayerMenu: function() {
            var li = this.layerInfo;
            this.menu = new Menu({
                contextMenuForWindow: false,
                targetNodeIds: [this.labelNode],
                leftClickToOpen: true
            });
            if (li.identify) {
                this.menu.addChild(new MenuItem({
                    label: 'Identify ' + li.name,
                    onClick: lang.hitch(this, function() {
                        this.container.identify(this.layer);
                    })
                }));
                this.menu.addChild(new MenuSeparator());
            }
            if (this.container.reorder) {
                this.menu.addChild(new MenuItem({
                    label: 'Move Layer Up',
                    onClick: lang.hitch(this, function() {
                        this.container.moveUp(this);
                    })
                }));
                this.menu.addChild(new MenuItem({
                    label: 'Move Layer Down',
                    onClick: lang.hitch(this, function() {
                        this.container.moveDown(this);
                    })
                }));
                this.menu.addChild(new MenuSeparator());
            }
            this.menu.addChild(new MenuItem({
                label: 'Zoom to Layer Extent',
                onClick: lang.hitch(this, this.zoomLayerExtent)
            }));
            this.opacitySlider = new HorizontalSlider({
                id: li.id + '_opacity_slider',
                value: li.opacity || 1,
                minimum: 0,
                maximum: 1,
                discreteValues: 11,
                showButtons: false,
                onChange: lang.hitch(this, function(value) {
                    this.layer.setOpacity(value);
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
            this.menu.addChild(new PopupMenuItem({
                label: 'Layer Opacity',
                popup: opacityTooltip
            }));
            var swipeMenu = new Menu();
            swipeMenu.addChild(new MenuItem({
                label: 'Horizontal',
                onClick: lang.hitch(this, function() {
                    this.map.swipeLayer(this.layer, 'horizontal');
                })
            }));
            swipeMenu.addChild(new MenuItem({
                label: 'Vertical',
                onClick: lang.hitch(this, function() {
                    this.map.swipeLayer(this.layer, 'vertical');
                })
            }));
            this.menu.addChild(new PopupMenuItem({
                label: 'Layer Swipe',
                popup: swipeMenu
            }));
            if (li.info) {
                this.menu.addChild(new MenuItem({
                    label: 'Service Info',
                    onClick: lang.hitch(this, function() {
                        var d = this.infoDialog;
                        d.set('title', li.name);
                        d.setHref(li.info.href);
                        d.show();
                    })
                }));
            }
            this.menu.startup();
        }
    });
});
