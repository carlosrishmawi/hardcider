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
    'esri/layers/FeatureLayer',
    'esri/InfoTemplate',
    'hardcider/utility/esri-rest',
    'dojo/text!hardcider/dijit/templates/LayerControl.html'
], function(
    declare,
    lang,
    array,
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
    CheckBox,
    HorizontalSlider,
    HorizontalRuleLabels,
    FeatureLayer,
    InfoTemplate,
    esriRest,
    layerControlTemplate
) {
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
                console.log('FeatureLayerControl error::layerInfo option is required');
                this.destroy();
                return;
            }
            if (!this.controlContainer) {
                console.log('FeatureLayerControl error::controlContainer option is required');
                this.destroy();
                return;
            }
            this._addLayer(this.layerInfo, this.controlContainer.map);
        },
        //toggle layer visibility
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
        //add ags feature layer and init control
        _addLayer: function(layerInfo, map) {
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
            this.layer = new FeatureLayer((li.secured) ? li.url + '?token=' + li.token : li.url, {
                id: li.id,
                mode: li.mode,
                outFields: li.outFields,
                visible: li.visible,
                opacity: li.opacity
            });
            this.layer.layerInfo = li;
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
                if (this.layer.version >= 10.01) {
                    esriRest.getLegend(this.layer).then(lang.hitch(this, this._createLegends));
                } else {
                    this.expandNode.innerHTML = 'No Legend';
                }
            }));
            on(this.layer, 'scale-range-change', lang.hitch(this, function() {
                if (this.layer.minScale !== 0 || this.layer.maxScale !== 0) {
                    this._checkboxScaleRange();
                    on(map, 'zoom-end', lang.hitch(this, this._checkboxScaleRange));
                } else {
                    this._checkboxScaleRange();
                }
            }));
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
            this._createLayerMenu();
            map.recycleEnableSnapping();
        },
        _createLegends: function(r) {
            var legendContent = '<table class="' + this.layer.id + '-' + this.layer.layerId + '-legend hardcider-layer-legend">';
            array.forEach(r.layers[this.layer.layerId].legend, function(legend) {
                var label = legend.label || '&nbsp;';
                legendContent += '<tr><td><img class="' + this.layer.id + '-legend-image hardcider-layer-legend-image" style="width:' + legend.width + ';height:' + legend.height + ';" src="data:' + legend.contentType + ';base64,' + legend.imageData + '" alt="' + label + '" /></td><td class="hardcider-layer-legend-label">' + label + '</td></tr>';
            }, this);
            legendContent += '</table>';
            this.expandNode.innerHTML = legendContent;
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
            this.menu = new Menu({
                contextMenuForWindow: false,
                targetNodeIds: [this.labelNode],
                leftClickToOpen: true
            });
            var menu = this.menu,
                li = this.layerInfo,
                layer = this.layer,
                controlContainer = this.controlContainer;
            if (controlContainer.reorder) {
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
            var opacitySlider = new HorizontalSlider({
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
            }, opacitySlider.bottomDecoration);
            rule.startup();
            var opacityTooltip = new TooltipDialog({
                style: 'width:200px;',
                content: opacitySlider
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
