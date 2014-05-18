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
    'esri/layers/FeatureLayer',
    'esri/layers/GraphicsLayer',
    'esri/InfoTemplate',
    'esri/tasks/ProjectParameters',
    'esri/config',
    'hardcider/utility/esri-rest',
    'dojo/text!hardcider/layers/templates/Overlay.html' //uses the same template as overlay
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
    Feature,
    Graphics,
    InfoTemplate,
    ProjectParams,
    esriConfig,
    esriRest,
    overlayTemplate
) {
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
                case 'feature':
                    this._addFeature(this.layerInfo);
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
        //add ags feature layer
        _addFeature: function(layerInfo) {
            var li = lang.mixin({
                secured: false,
                token: null,
                visible: false,
                opacity: 1,
                mode: 1,
                outFields: ['*'],
                infoTemplate: {
                    type: 'default',
                    title: '',
                    content: ''
                }
            }, layerInfo);
            this.layerInfo = li;
            this.layer = new Feature((li.secured) ? li.url + '?token=' + li.token : li.url, {
                id: li.id,
                mode: li.mode,
                outFields: li.outFields,
                visible: li.visible,
                opacity: li.opacity
            });
            this.layer.layerParams = li;
            this.layer.featureType = 'feature';
            if (li.secured) {
                this.layer.url = li.url;
            }
            switch (li.infoTemplate.type) {
                case 'default':
                    this.layer.setInfoTemplate(new InfoTemplate());
                    break;
                case 'custom':
                    this.layer.setInfoTemplate(new InfoTemplate(li.infoTemplate.title, li.infoTemplate.content));
                    break;
                default:
                    break;
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
                if (this.layer.version >= 10.01) {
                    esriRest.getLegend(this.layer).then(lang.hitch(this, this._createLegends));
                } else {
                    this.sublayerNode.innerHTML = 'No Legend';
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
            this._createLayerMenu();
            this.container.addChild(this, 'first');
            this.map.recycleEnableSnapping();
        },
        _createLegends: function(r) {
            var legendContent = '<table class="' + this.layer.id + '-' + this.layer.layerId + '-legend hardcider-layer-legend">';
            array.forEach(r.layers[this.layer.layerId].legend, function(legend) {
                var label = legend.label || '&nbsp;';
                legendContent += '<tr><td><img class="' + this.layer.id + '-legend-image hardcider-layer-legend-image" style="width:' + legend.width + ';height:' + legend.height + ';" src="data:' + legend.contentType + ';base64,' + legend.imageData + '" alt="' + label + '" /></td><td class="hardcider-layer-legend-label">' + label + '</td></tr>';
            }, this);
            legendContent += '</table>';
            this.sublayerNode.innerHTML = legendContent;
            array.forEach(query('.' + this.layer.id + '-legend-image'), function(img) {
                domStyle.set(img, 'opacity', this.layer.opacity);
            }, this);
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
