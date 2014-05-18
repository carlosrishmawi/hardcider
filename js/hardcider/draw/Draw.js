/*
 * Copyright (c) 2014 Ben Fousek
 * https://github.com/btfou/hardcider
 */
define([
    'dojo/_base/declare',
    'dojo/_base/lang',
    'dojo/_base/array',
    'dojo/on',
    'dojo/dom',
    'dojo/dom-geometry',
    'dojo/_base/Color',
    'dijit/_TemplatedMixin',
    'dijit/_WidgetsInTemplateMixin',
    'dijit/TooltipDialog',
    'dijit/popup',
    'dojo/keys',
    'esri/geometry/Polygon',
    'esri/symbols/jsonUtils',
    'esri/graphic',
    'esri/geometry/screenUtils',
    'esri/geometry/webMercatorUtils',
    'esri/undoManager',
    'esri/OperationBase',
    'esri/graphicsUtils',
    'dijit/Menu',
    'dijit/MenuItem',
    'dijit/PopupMenuItem',
    'dijit/MenuSeparator',
    'dijit/Dialog',
    'dojo/text!hardcider/draw/templates/EditPointSymbolDialog.html',
    'dojo/text!hardcider/draw/templates/EditTextSymbolDialog.html',
    'dojo/text!hardcider/draw/templates/EditPolylineSymbolDialog.html',
    'dojo/text!hardcider/draw/templates/EditPolygonSymbolDialog.html',
    'dijit/form/Select',
    'dijit/ColorPalette',
    'dijit/form/HorizontalSlider',
    'dijit/form/HorizontalRule',
    'dijit/form/HorizontalRuleLabels',
    'dijit/form/DropDownButton'
], function(
    declare,
    lang,
    array,
    on,
    dom,
    domGeom,
    Color,
    TemplatedMixin,
    WidgetsInTemplateMixin,
    TooltipDialog,
    popup,
    keys,
    Polygon,
    symbolJsonUtils,
    Graphic,
    screenUtils,
    webMercatorUtils,
    UndoManager,
    OperationBase,
    graphicsUtils,
    Menu,
    MenuItem,
    PopupMenuItem,
    MenuSeparator,
    Dialog,
    PointSymTemplate,
    TextSymTemplate,
    PolylineSymTemplate,
    PolygonSymTemplate
) {
    //undo manager operations
    var AddGraphicOp = declare(OperationBase, {
        label: 'Add graphic',
        constructor: function(options) {
            lang.mixin(this, options);
        },
        performUndo: function() {
            this.layer.remove(this.graphic);
        },
        performRedo: function() {
            this.layer.add(this.graphic);
        }
    });
    var DeleteGraphicOp = declare(OperationBase, {
        label: 'Delete graphic',
        constructor: function(options) {
            lang.mixin(this, options);
        },
        performUndo: function() {
            this.layer.add(this.graphic);
        },
        performRedo: function() {
            this.layer.remove(this.graphic);
        }
    });
    var DeleteAllGraphicsOp = declare(OperationBase, {
        label: 'Delete all graphics',
        constructor: function(options) {
            lang.mixin(this, options);
        },
        performUndo: function() {
            array.forEach(this.layers, function(l) {
                array.forEach(l.graphics, function(g) {
                    l.layer.add(g);
                }, this);
            }, this);
        },
        performRedo: function() {
            array.forEach(this.layers, function(l) {
                array.forEach(l.graphics, function(g) {
                    l.layer.remove(g);
                }, this);
            }, this);
        }
    });
    var EditGraphicOp = declare(OperationBase, {
        label: 'Edit graphic',
        constructor: function(options) {
            lang.mixin(this, options);
        },
        performUndo: function() {
            this.graphic.setGeometry(this.startGeom);
        },
        performRedo: function() {
            this.graphic.setGeometry(this.endGeom);
        }
    });
    var EditSymbolOp = declare(OperationBase, {
        label: 'Edit symbol',
        constructor: function(options) {
            lang.mixin(this, options);
        },
        performUndo: function() {
            this.graphic.setSymbol(symbolJsonUtils.fromJson(this.orginalSymbol));
        },
        performRedo: function() {
            this.graphic.setSymbol(symbolJsonUtils.fromJson(this.symbol));
        }
    });
    var EditTextOp = declare(OperationBase, {
        label: 'Edit text',
        constructor: function(options) {
            lang.mixin(this, options);
        },
        performUndo: function() {
            var symbol = this.graphic.symbol.toJson();
            symbol.text = this.originalText;
            this.graphic.setSymbol(symbolJsonUtils.fromJson(symbol));
        },
        performRedo: function() {
            var symbol = this.graphic.symbol.toJson();
            symbol.text = this.newText;
            this.graphic.setSymbol(symbolJsonUtils.fromJson(symbol));
        }
    });

    //text tooltip dialog
    var TextTooltipDialog = declare([TooltipDialog, TemplatedMixin, WidgetsInTemplateMixin], {
        templateString: '<div role="alertdialog" tabIndex="-1"><div class="dijitTooltipContainer" role="presentation"><div class="dijitTooltipContents dijitTooltipFocusNode" data-dojo-attach-point="containerNode"><table><tr><td><input data-dojo-attach-point="textNode" data-dojo-type="dijit/form/TextBox" data-dojo-props="intermediateChanges:true, placeholder:\'Add text\', style:\'width:160px;\'" /></td></tr><tr><td align="center"><span data-dojo-attach-event="click: addText" class="hardcider-click">OK</span>&nbsp;&nbsp;&nbsp;&nbsp;<span data-dojo-attach-event="click: cancelText" class="hardcider-click">Cancel</span></td></tr></table></div></div><div class="dijitTooltipConnector" role="presentation" data-dojo-attach-point="connectorNode"></div></div>',
        isNewText: true,
        originalText: 'New Text',
        constructor: function(options) {
            lang.mixin(this, options);
        },
        postCreate: function() {
            this.inherited(arguments);
            on(this, 'show', lang.hitch(this, function() {
                this.originalText = this.graphic.symbol.toJson().text;
            }));
            //textbox's intermediateChanges property must be set true
            on(this.textNode, 'change', lang.hitch(this, this.onTextChange));
            this.textNode.on('keypress', lang.hitch(this, function(e) {
                if (e.keyCode === keys.ENTER) {
                    this.addText();
                }
            }));
        },
        onTextChange: function(value) {
            var symbol = this.graphic.symbol.toJson();
            if (value !== '') {
                symbol.text = value;
            } else {
                symbol.text = 'New Text';
            }
            this.graphic.setSymbol(symbolJsonUtils.fromJson(symbol));
        },
        addText: function() {
            popup.close();
            var value = this.textNode.get('value'),
                symbol = this.graphic.symbol.toJson(),
                newText;
            if (value !== '') {
                newText = symbol.text = value;
            } else {
                newText = symbol.text = 'New Text';
            }
            this.graphic.setSymbol(symbolJsonUtils.fromJson(symbol));
            this.undo.add(new EditTextOp({
                graphic: this.graphic,
                newText: newText,
                originalText: this.originalText
            }));
            this.isNewText = false;
        },
        cancelText: function() {
            popup.close();
            if (this.isNewText) {
                this.graphic.getLayer().remove(this.graphic);
                this.destroy();
            }
        }
    });

    //edit point style dialog
    var EditPointSymbol = declare([Dialog, WidgetsInTemplateMixin], {
        templateString: PointSymTemplate,
        constructor: function(options) {
            lang.mixin(this, options);
        },
        postCreate: function() {
            this.inherited(arguments);
            this.colorNode.on('change', lang.hitch(this, function(value) {
                this._setColor(value);
            }));
        },
        edit: function(graphic) {
            this._graphic = graphic;
            this._symbol = graphic.symbol.toJson();
            this._orginalSymbol = graphic.symbol.toJson();
            this.styleNode.set('value', this._symbol.style);
            this.sizeNode.set('value', this._symbol.size);
            var color = new Color(this._symbol.color).toHex();
            this._setColor(color);
            this.colorNode.set('value', color);
            this.show();
        },
        update: function() {
            this._updateSymbol();
            this.hide();
        },
        _updateSymbol: function() {
            this._symbol.style = this.styleNode.get('value');
            this._symbol.size = parseFloat(this.sizeNode.get('value'));
            this._symbol.color = new Color(this.colorNode.get('value'));
            this._graphic.setSymbol(symbolJsonUtils.fromJson(this._symbol));
            this.undo.add(new EditSymbolOp({
                graphic: this._graphic,
                symbol: this._symbol,
                orginalSymbol: this._orginalSymbol
            }));
        },
        _setColor: function(color) {
            this.colorDropDownNode.containerNode.innerHTML = '<i class="fa fa-square" style="color:' + color + '"></i>&nbsp;Color';
        }
    });

    //edit text style dialog
    var EditTextSymbol = declare([Dialog, WidgetsInTemplateMixin], {
        templateString: TextSymTemplate,
        constructor: function(options) {
            lang.mixin(this, options);
        },
        postCreate: function() {
            this.inherited(arguments);
            this.colorNode.on('change', lang.hitch(this, function(value) {
                this._setColor(value);
            }));
        },
        edit: function(graphic) {
            this._graphic = graphic;
            this._symbol = graphic.symbol.toJson();
            this._orginalSymbol = graphic.symbol.toJson();
            this.sizeNode.set('value', this._symbol.font.size);
            this.weightNode.set('value', this._symbol.font.weight);
            this.styleNode.set('value', this._symbol.font.style);
            var color = new Color(this._symbol.color).toHex();
            this._setColor(color);
            this.colorNode.set('value', color);
            this.show();
        },
        update: function() {
            this._updateSymbol();
            this.hide();
        },
        _updateSymbol: function() {
            this._symbol.font.size = parseInt(this.sizeNode.get('value'), 10);
            this._symbol.font.weight = this.weightNode.get('value');
            this._symbol.font.style = this.styleNode.get('value');
            this._symbol.color = new Color(this.colorNode.get('value'));
            this._graphic.setSymbol(symbolJsonUtils.fromJson(this._symbol));
            this.undo.add(new EditSymbolOp({
                graphic: this._graphic,
                symbol: this._symbol,
                orginalSymbol: this._orginalSymbol
            }));
        },
        _setColor: function(color) {
            this.colorDropDownNode.containerNode.innerHTML = '<i class="fa fa-square" style="color:' + color + '"></i>&nbsp;Color';
        }
    });

    //edit polyline style dialog
    var EditPolylineSymbol = declare([Dialog, WidgetsInTemplateMixin], {
        templateString: PolylineSymTemplate,
        constructor: function(options) {
            lang.mixin(this, options);
        },
        postCreate: function() {
            this.inherited(arguments);
            this.colorNode.on('change', lang.hitch(this, function(value) {
                this._setColor(value);
            }));
        },
        edit: function(graphic) {
            this._graphic = graphic;
            this._symbol = graphic.symbol.toJson();
            this._orginalSymbol = graphic.symbol.toJson();
            this.styleNode.set('value', this._symbol.style);
            this.widthNode.set('value', this._symbol.width);
            var color = new Color(this._symbol.color).toHex();
            this._setColor(color);
            this.colorNode.set('value', color);
            this.show();
        },
        update: function() {
            this._updateSymbol();
            this.hide();
        },
        _updateSymbol: function() {
            this._symbol.style = this.styleNode.get('value');
            this._symbol.width = parseFloat(this.widthNode.get('value'));
            this._symbol.color = new Color(this.colorNode.get('value'));
            this._graphic.setSymbol(symbolJsonUtils.fromJson(this._symbol));
            this.undo.add(new EditSymbolOp({
                graphic: this._graphic,
                symbol: this._symbol,
                orginalSymbol: this._orginalSymbol
            }));
        },
        _setColor: function(color) {
            this.colorDropDownNode.containerNode.innerHTML = '<i class="fa fa-square" style="color:' + color + '"></i>&nbsp;Color';
        }
    });

    //edit polygon style dialog
    var EditPolygonSymbol = declare([Dialog, WidgetsInTemplateMixin], {
        templateString: PolygonSymTemplate,
        constructor: function(options) {
            lang.mixin(this, options);
        },
        postCreate: function() {
            this.inherited(arguments);
            this.colorNode.on('change', lang.hitch(this, function(value) {
                this._setColor(value);
            }));
            this.fillNode.on('change', lang.hitch(this, function(value) {
                this._setFill(value);
            }));
        },
        edit: function(graphic) {
            this._graphic = graphic;
            this._symbol = graphic.symbol.toJson();
            this._orginalSymbol = graphic.symbol.toJson();
            this.styleNode.set('value', this._symbol.outline.style);
            this.widthNode.set('value', this._symbol.outline.width);
            var color = new Color(this._symbol.outline.color).toHex();
            this._setColor(color);
            this.colorNode.set('value', color);
            var fill = new Color(this._symbol.color).toHex();
            this._setFill(fill);
            this.fillNode.set('value', fill);
            this.opacityNode.set('value', this._symbol.color[3] / 256);
            this.show();
        },
        update: function() {
            this._updateSymbol();
            this.hide();
        },
        _updateSymbol: function() {
            this._symbol.outline.style = this.styleNode.get('value');
            this._symbol.outline.width = parseFloat(this.widthNode.get('value'));
            this._symbol.outline.color = new Color(this.colorNode.get('value'));
            var fill = new Color(this.fillNode.get('value'));
            fill.a = this.opacityNode.get('value');
            this._symbol.color = fill;
            this._graphic.setSymbol(symbolJsonUtils.fromJson(this._symbol));
            this.undo.add(new EditSymbolOp({
                graphic: this._graphic,
                symbol: this._symbol,
                orginalSymbol: this._orginalSymbol
            }));
        },
        _setColor: function(color) {
            this.colorDropDownNode.containerNode.innerHTML = '<i class="fa fa-square" style="color:' + color + '"></i>&nbsp;Color';
        },
        _setFill: function(color) {
            this.fillDropDownNode.containerNode.innerHTML = '<i class="fa fa-square" style="color:' + color + ';"></i>&nbsp;Fill';
        }
    });

    return declare(null, {
        map: null,
        drawLayers: null,
        symPolygon: {
            color: [255, 0, 0, 32],
            outline: {
                color: [255, 0, 0, 255],
                width: 3,
                type: 'esriSLS',
                style: 'esriSLSSolid'
            },
            type: 'esriSFS',
            style: 'esriSFSSolid'
        },
        symPolyline: {
            color: [0, 0, 255, 255],
            width: 3,
            type: 'esriSLS',
            style: 'esriSLSSolid'
        },
        symPoint: {
            color: [50, 205, 50, 255],
            size: 10.5,
            type: 'esriSMS',
            style: 'esriSMSCircle',
            outline: {
                color: [0, 0, 0, 255],
                width: 0.75,
                type: 'esriSLS',
                style: 'esriSLSSolid'
            }
        },
        symText: {
            color: [0, 0, 0, 255],
            type: 'esriTS',
            verticalAlignment: 'middle',
            horizontalAlignment: 'center',
            text: 'New Text',
            rotated: false,
            kerning: true,
            font: {
                size: 12,
                style: 'normal',
                variant: 'normal',
                weight: 'bold',
                family: 'sans-serif'
            }
        },
        symId: {
            color: [255, 255, 255, 192],
            type: 'esriSFS',
            style: 'esriSFSSolid'
        },
        textTooltipDialogOffset: {
            x: -12,
            y: 0
        },
        editOptions: {
            allowAddVertices: true,
            allowDeleteVertices: true,
            uniformScaling: false
        },
        constructor: function(options) {
            lang.mixin(this, options);
            this.menu = new Menu();
            var m = this.menu;
            m.addChild(new MenuItem({
                label: 'Point',
                onClick: lang.hitch(this, function() {
                    this.draw('point');
                })
            }));
            m.addChild(new MenuItem({
                label: 'Polyline',
                onClick: lang.hitch(this, function() {
                    this.draw('polyline');
                })
            }));
            m.addChild(new MenuItem({
                label: 'Polygon',
                onClick: lang.hitch(this, function() {
                    this.draw('polygon');
                })
            }));
            var freehand = new Menu();
            freehand.addChild(new MenuItem({
                label: 'Polyline',
                onClick: lang.hitch(this, function() {
                    this.draw('freehandpolyline');
                })
            }));
            freehand.addChild(new MenuItem({
                label: 'Polygon',
                onClick: lang.hitch(this, function() {
                    this.draw('freehandpolygon');
                })
            }));
            freehand.startup();
            m.addChild(new PopupMenuItem({
                label: 'Freehand',
                popup: freehand
            }));
            var shapes = new Menu();
            shapes.addChild(new MenuItem({
                label: 'Rectangle',
                onClick: lang.hitch(this, function() {
                    this.draw('extent');
                })
            }));
            shapes.addChild(new MenuItem({
                label: 'Circle',
                onClick: lang.hitch(this, function() {
                    this.draw('circle');
                })
            }));
            shapes.startup();
            m.addChild(new PopupMenuItem({
                label: 'Shapes',
                popup: shapes
            }));
            m.addChild(new MenuItem({
                label: 'Text',
                onClick: lang.hitch(this, function() {
                    this.draw('point', 'text');
                })
            }));
            m.startup();
            this.map.contextMenu.addChild(new PopupMenuItem({
                label: 'Draw',
                popup: m
            }));
            for (var i in this.drawLayers) {
                if (this.drawLayers.hasOwnProperty(i) && i !== 'temp') {
                    this._setLayerEvents(this.drawLayers[i]);
                }
            }
            //options menu
            this.optionsMenu = new Menu();
            var om = this.optionsMenu;
            om.addChild(new MenuItem({
                label: 'Zoom To All',
                onClick: lang.hitch(this, function() {
                    this.zoomAll();
                })
            }));
            om.addChild(new MenuItem({
                label: 'Delete All',
                onClick: lang.hitch(this, function() {
                    this.deleteAll();
                })
            }));
            om.addChild(new MenuSeparator());
            om.addChild(new MenuItem({
                label: 'Export GeoJSON',
                onClick: lang.hitch(this, function() {
                    this.exportGeoJson();
                })
            }));
            om.startup();
            this.undo = new UndoManager({
                maxOperations: -1
            });
            this.editPointSymbol = new EditPointSymbol({
                title: 'Edit Point Symbol',
                undo: this.undo
            });
            this.editTextSymbol = new EditTextSymbol({
                title: 'Edit Text Symbol',
                undo: this.undo
            });
            this.editPolylineSymbol = new EditPolylineSymbol({
                title: 'Edit Polyline Symbol',
                undo: this.undo
            });
            this.editPolygonSymbol = new EditPolygonSymbol({
                title: 'Edit Polygon Symbol',
                undo: this.undo
            });
        },
        exportGeoJson: function() {
            var graphics = this._getGraphics();
            if (!graphics.length) {
                return;
            }
            var geojson = {
                type: 'FeatureCollection',
                features: []
            };
            array.forEach(graphics, function(feature, index) {
                var feat = window.Terraformer.ArcGIS.parse(feature);
                feat.id = index;
                geojson.features.push(feat);
            }, this);
            var stringified = JSON.stringify(geojson);
            if (window.saveAs) {
                window.saveAs(new window.Blob([stringified], {
                    type: 'text/plain;charset=' + document.characterSet
                }), 'drawToGeoJson.geojson');
            } else {
                this.map.alert('Your browser does not support this operation.', 'Error');
            }
        },
        _getGraphics: function() {
            var graphics = [];

            function getGraphics(layer) {
                array.forEach(layer.graphics, function(g) {
                    graphics.push(g);
                });
            }
            for (var i in this.drawLayers) {
                if (this.drawLayers.hasOwnProperty(i) && i !== 'temp') {
                    getGraphics(this.drawLayers[i]);
                }
            }
            return graphics;
        },
        _setLayerEvents: function(layer) {
            on(layer, 'mouse-over', function(evt) {
                evt.graphic.menu.bindDomNode(evt.graphic.getDojoShape().getNode());
            });
            on(layer, 'mouse-out', function(evt) {
                evt.graphic.menu.unBindDomNode(evt.graphic.getDojoShape().getNode());
            });
            on(layer, 'graphic-add', lang.hitch(this, function(add) {
                this._addGraphicMenu(add);
            }));
        },
        loadGraphics: function(graphics, zoom) {
            if (!graphics.length) {
                return;
            }
            array.forEach(graphics, function(graphic) {
                var g = new Graphic(graphic);
                switch (g.geometry.type) {
                    case 'point':
                        if (g.attributes.type === 'text') {
                            this.drawLayers.text.add(g);
                        } else {
                            this.drawLayers.point.add(g);
                        }
                        break;
                    case 'polyline':
                        this.drawLayers.polyline.add(g);
                        break;
                    case 'polygon':
                        this.drawLayers.polygon.add(g);
                        break;
                    default:
                        break;
                }
            }, this);
            if (zoom) {
                this.zoomAll();
            }
        },
        addGeometry: function(geoms) {
            //TODO: single undo operation for addGeometry
            array.forEach(geoms, function(geom) {
                if (geom.spatialReference.isWebMercator()) {
                    geom = webMercatorUtils.webMercatorToGeographic(geom);
                }
                var graphic = new Graphic(geom, null, {
                    id: new Date().getTime(),
                    type: null
                });
                switch (graphic.geometry.type) {
                    case 'polygon':
                        graphic.attributes.type = 'polygon';
                        graphic.setSymbol(symbolJsonUtils.fromJson(this.symPolygon));
                        this.undo.add(new AddGraphicOp({
                            layer: this.drawLayers.polygon,
                            graphic: graphic
                        }));
                        this.drawLayers.polygon.add(graphic);
                        break;
                    case 'polyline':
                        graphic.attributes.type = 'polyline';
                        graphic.setSymbol(symbolJsonUtils.fromJson(this.symPolyline));
                        this.undo.add(new AddGraphicOp({
                            layer: this.drawLayers.polyline,
                            graphic: graphic
                        }));
                        this.drawLayers.polyline.add(graphic);
                        break;
                    case 'point':
                        graphic.attributes.type = 'point';
                        graphic.setSymbol(symbolJsonUtils.fromJson(this.symPoint));
                        this.undo.add(new AddGraphicOp({
                            layer: this.drawLayers.point,
                            graphic: graphic
                        }));
                        this.drawLayers.point.add(graphic);
                        break;
                }
            }, this);
        },
        deleteAll: function() {
            this.map.confirm('Delete all draw graphics?', 'Delete All');
            on.once(this.map, 'confirmed', lang.hitch(this, function(r) {
                if (r.confirmed) {
                    this._deleteAll();
                }
            }));
        },
        _deleteAll: function() {
            var layers = [];
            var deleteUndo = function(layer) {
                var graphics = [];
                array.forEach(layer.graphics, function(g) {
                    graphics.push(g);
                });
                layers.push({
                    layer: layer,
                    graphics: graphics
                });
            };
            for (var i in this.drawLayers) {
                if (this.drawLayers.hasOwnProperty(i) && i !== 'temp') {
                    deleteUndo(this.drawLayers[i]);
                }
            }
            this.undo.add(new DeleteAllGraphicsOp({
                layers: layers
            }));
            for (var j in this.drawLayers) {
                if (this.drawLayers.hasOwnProperty(j) && j !== 'temp') {
                    this.drawLayers[j].clear();
                }
            }
        },
        zoomAll: function() {
            var graphics = [],
                getGraphics = function(layer) {
                    array.forEach(layer.graphics, function(g) {
                        graphics.push(g);
                    });
                };
            for (var i in this.drawLayers) {
                if (this.drawLayers.hasOwnProperty(i) && i !== 'temp') {
                    getGraphics(this.drawLayers[i]);
                }
            }
            if (!graphics.length) {
                return;
            } else if (graphics.length === 1 && graphics[0].geometry.type === 'point') {
                this.map.centerAt(graphics[0].geometry);
            } else {
                this.map.setExtent(graphicsUtils.graphicsExtent(graphics), true);
            }
        },
        draw: function(type, pointType) {
            this.map.eventBegin();
            this.map.setMapCursor('crosshair');
            this.map.drawToolbar.activate(type);
            var onDrawEnd = this.map.drawToolbar.on('draw-complete', lang.hitch(this, function(result) {
                onDrawEnd.remove();
                this.map.drawToolbar.deactivate();
                this.map.eventEnd();
                var graphic, geometry = result.geographicGeometry;
                if (geometry.type !== 'extent') {
                    graphic = new Graphic(geometry);
                } else {
                    graphic = this._extentToPolygon(geometry);
                }
                graphic.setAttributes({
                    id: new Date().getTime(),
                    type: null
                });
                if (!pointType) {
                    switch (graphic.geometry.type) {
                        case 'polygon':
                            graphic.attributes.type = 'polygon';
                            graphic.setSymbol(symbolJsonUtils.fromJson(this.symPolygon));
                            this.undo.add(new AddGraphicOp({
                                layer: this.drawLayers.polygon,
                                graphic: graphic
                            }));
                            this.drawLayers.polygon.add(graphic);
                            break;
                        case 'polyline':
                            graphic.attributes.type = 'polyline';
                            graphic.setSymbol(symbolJsonUtils.fromJson(this.symPolyline));
                            this.undo.add(new AddGraphicOp({
                                layer: this.drawLayers.polyline,
                                graphic: graphic
                            }));
                            this.drawLayers.polyline.add(graphic);
                            break;
                        case 'point':
                            graphic.attributes.type = 'point';
                            graphic.setSymbol(symbolJsonUtils.fromJson(this.symPoint));
                            this.undo.add(new AddGraphicOp({
                                layer: this.drawLayers.point,
                                graphic: graphic
                            }));
                            this.drawLayers.point.add(graphic);
                            break;
                    }
                } else if (pointType === 'text') {
                    graphic.attributes.type = 'text';
                    graphic.setSymbol(symbolJsonUtils.fromJson(this.symText));
                    this.undo.add(new AddGraphicOp({
                        layer: this.drawLayers.text,
                        graphic: graphic
                    }));
                    this.drawLayers.text.add(graphic);
                    graphic._textTooltip = new TextTooltipDialog({
                        graphic: graphic,
                        undo: this.undo
                    });
                    var sp = screenUtils.toScreenGeometry(this.map.extent, this.map.width, this.map.height, result.geometry);
                    var mp = domGeom.position(dom.byId(this.map.id), false);
                    popup.open({
                        popup: graphic._textTooltip,
                        x: sp.x + mp.x + this.textTooltipDialogOffset.x,
                        y: sp.y + mp.y + this.textTooltipDialogOffset.y
                    });
                    graphic._textTooltip.textNode.focus();
                }
            }));
            this.map.eventAdd(onDrawEnd);
        },
        _extentToPolygon: function(geom) {
            var polygon = new Polygon(geom.spatialReference);
            polygon.addRing([
                [geom.xmin, geom.ymax],
                [geom.xmax, geom.ymax],
                [geom.xmax, geom.ymin],
                [geom.xmin, geom.ymin],
                [geom.xmin, geom.ymax]
            ]);
            var graphic = new Graphic(polygon);
            return graphic;
        },
        _addGraphicMenu: function(add) {
            var graphic = add.graphic,
                type = graphic.attributes.type;
            graphic.menu = new Menu({
                contextMenuForWindow: false,
                leftClickToOpen: false
            });
            if (type === 'text') {
                if (!graphic._textTooltip) {
                    graphic._textTooltip = new TextTooltipDialog({
                        graphic: graphic,
                        undo: this.undo
                    });
                    graphic._textTooltip.textNode.set('value', graphic.symbol.text);
                }
                graphic.menu.addChild(new MenuItem({
                    label: 'Edit Text',
                    onClick: lang.hitch(this, function() {
                        var sp = screenUtils.toScreenGeometry(this.map.extent, this.map.width, this.map.height, webMercatorUtils.geographicToWebMercator(graphic.geometry));
                        var mp = domGeom.position(dom.byId(this.map.id), false);
                        popup.open({
                            popup: graphic._textTooltip,
                            x: sp.x + mp.x + this.textTooltipDialogOffset.x,
                            y: sp.y + mp.y + this.textTooltipDialogOffset.y
                        });
                        graphic._textTooltip.textNode.focus();
                    })
                }));
            }
            graphic.menu.addChild(new MenuItem({
                label: 'Edit Symbol',
                onClick: lang.hitch(this, function() {
                    this._editSymbol(graphic);
                })
            }));
            var editMenu = new Menu();
            var Edit = this.map.editToolbar.constructor;
            editMenu.addChild(new MenuItem({
                label: 'Move',
                onClick: lang.hitch(this, function() {
                    this._editGraphic(graphic, Edit.MOVE);
                })
            }));
            if (type === 'polyline' || type === 'polygon') {
                editMenu.addChild(new MenuItem({
                    label: 'Edit Vertices',
                    onClick: lang.hitch(this, function() {
                        this._editGraphic(graphic, Edit.EDIT_VERTICES);
                    })
                }));
                var scaleMenu = new Menu();
                scaleMenu.addChild(new MenuItem({
                    label: 'Uniform Scale',
                    onClick: lang.hitch(this, function() {
                        this._editGraphic(graphic, Edit.SCALE, true);
                    })
                }));
                scaleMenu.addChild(new MenuItem({
                    label: 'Freeform Scale',
                    onClick: lang.hitch(this, function() {
                        this._editGraphic(graphic, Edit.SCALE, false);
                    })
                }));
                scaleMenu.startup();
                editMenu.addChild(new PopupMenuItem({
                    label: 'Scale',
                    popup: scaleMenu
                }));
                editMenu.addChild(new MenuItem({
                    label: 'Rotate',
                    onClick: lang.hitch(this, function() {
                        this._editGraphic(graphic, Edit.ROTATE);
                    })
                }));
            }
            editMenu.addChild(new MenuItem({
                label: 'Delete',
                onClick: lang.hitch(this, function() {
                    this.undo.add(new DeleteGraphicOp({
                        layer: graphic.getLayer(),
                        graphic: graphic
                    }));
                    graphic.getLayer().remove(graphic);
                })
            }));
            editMenu.startup();
            graphic.menu.addChild(new PopupMenuItem({
                label: 'Edit Geometry',
                popup: editMenu
            }));
            graphic.menu.addChild(new MenuItem({
                label: 'Move to Front',
                onClick: function() {
                    graphic.getDojoShape().moveToFront();
                }
            }));
            graphic.menu.addChild(new MenuItem({
                label: 'Move to Back',
                onClick: function() {
                    graphic.getDojoShape().moveToBack();
                }
            }));
            graphic.menu.addChild(new MenuItem({
                label: 'Geometry Info',
                onClick: lang.hitch(this, function() {
                    this.map.geometryInfo(graphic.geometry);
                })
            }));
            graphic.menu.startup();
            graphic.menu.on('focus', lang.hitch(this, function() {
                this._idGraphic(graphic);
            }));
        },
        _idGraphic: function(graphic) {
            var layer = this.drawLayers.temp;
            layer.clear();
            layer.add(new Graphic(this.map.extent, symbolJsonUtils.fromJson(this.symId)));
            layer.add(new Graphic(graphic.geometry, graphic.symbol));
            setTimeout(function() {
                layer.clear();
            }, 1000);
        },
        _editSymbol: function(graphic) {
            if (graphic.attributes.type === 'text') {
                this.editTextSymbol.edit(graphic);
            } else {
                switch (graphic.geometry.type) {
                    case 'point':
                        this.editPointSymbol.edit(graphic);
                        break;
                    case 'polyline':
                        this.editPolylineSymbol.edit(graphic);
                        break;
                    case 'polygon':
                        this.editPolygonSymbol.edit(graphic);
                        break;
                }
            }
        },
        _editGraphic: function(graphic, tool, uniformScaling) {
            var options = this.editOptions,
                startGeom = lang.clone(graphic.geometry);
            options.uniformScaling = (uniformScaling !== undefined) ? uniformScaling : options.uniformScaling;
            this.map.editToolbar.activate(tool, graphic, options);
            on.once(this.map, 'click', lang.hitch(this, function() {
                if (this.map.editToolbar.getCurrentState().isModified) {
                    this.undo.add(new EditGraphicOp({
                        graphic: graphic,
                        startGeom: startGeom,
                        endGeom: this.map.editToolbar.getCurrentState().graphic.geometry
                    }));
                }
                this.map.editToolbar.deactivate();
            }));
        }
    });
});
