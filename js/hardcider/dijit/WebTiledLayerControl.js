/*
 * Copyright (c) 2014 Ben Fousek
 * https://github.com/btfou/hardcider
 */
define([
    'dojo/_base/declare',
    'dojo/_base/lang',
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
    'esri/layers/WebTiledLayer',
    'dojo/text!hardcider/dijit/templates/LayerControl.html'
], function(
    declare,
    lang,
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
    WebTiled,
    layerControlTemplate
) {
    //tiled layer control
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
                console.log('TiledLayerControl error::layerInfo option is required');
                this.destroy();
                return;
            }
            if (!this.controlContainer) {
                console.log('TiledLayerControl error::controlContainer option is required');
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
        //add web tiled layer and init control
        _addLayer: function(layerInfo, map) {
            var li = lang.mixin({
                visible: false,
                opacity: 1,
                subDomains: [],
                copyright: '',
                resampling: true
            }, layerInfo);
            this.layerInfo = li;
            this.layer = new WebTiled(li.template, {
                id: li.id || null,
                visible: li.visible,
                opacity: li.opacity,
                subDomains: li.subDomains,
                copyright: li.copyright,
                resampling: li.resampling
            });
            map.addLayer(this.layer);
            li.id = this.layer.id;
            this.layer.layerParams = li;
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
            this.layer.on('load', lang.hitch(this, function() {
                if (this.layer.minScale !== 0 || this.layer.maxScale !== 0) {
                    this._checkboxScaleRange();
                    map.on('zoom-end', lang.hitch(this, this._checkboxScaleRange));
                }
            }));
            this.layer.on('scale-range-change', lang.hitch(this, function() {
                if (this.layer.minScale !== 0 || this.layer.maxScale !== 0) {
                    this._checkboxScaleRange();
                    map.on('zoom-end', lang.hitch(this, this._checkboxScaleRange));
                } else {
                    this._checkboxScaleRange();
                }
            }));
            this._createLayerMenu();
            domClass.remove(this.expandIconNode, ['fa', 'fa-plus-square-o', 'hardcider-layer-icon']);
            domStyle.set(this.expandIconNode.parentNode, 'cursor', 'default');
            domConst.destroy(this.expandNode);
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
                    controlContainer.zoomToLayerExtent(layer);
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
