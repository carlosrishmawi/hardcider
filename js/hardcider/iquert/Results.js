/*
 * Copyright (c) 2014 Ben Fousek
 * https://github.com/btfou/hardcider
 */
define([
    'dojo/_base/declare',
    'dojo/_base/lang',
    'dojo/_base/array',
    'dojo/on',
    'dojo/dom-construct',
    'dojo/Evented',
    'dojo/promise/all',
    'dojo/date/locale',
    'dojo/json',
    'dijit/_WidgetBase',
    'dijit/_TemplatedMixin',
    //'dijit/_WidgetsInTemplateMixin',
    'dijit/layout/StackContainer',
    'dijit/layout/BorderContainer',
    'dijit/Toolbar',
    'dijit/layout/ContentPane',
    'dijit/form/Button',
    //'dijit/form/DropDownButton',
    'dijit/Menu',
    'dijit/MenuItem',
    'dijit/CheckedMenuItem',
    'dijit/MenuSeparator',
    //'dijit/Dialog',
    'dojo/text!hardcider/iquert/templates/Results.html',
    'dojo/text!hardcider/iquert/templates/ResultContent.html',
    'esri/symbols/jsonUtils',
    'esri/graphicsUtils',
    'esri/geometry/webMercatorUtils',
    'hardcider/utility/esri-rest',
    'dgrid/Grid',
    'dojo/store/Memory',
    'dgrid/OnDemandGrid',
    'dgrid/Selection',
    //'dgrid/selector',
    'dgrid/Keyboard',
    'dgrid/extensions/ColumnResizer'
], function(
    declare,
    lang,
    array,
    on,
    domConst,
    Evented,
    all,
    locale,
    JSON,
    WidgetBase,
    TemplatedMixin,
    //WidgetsInTemplateMixin,
    StackContainer,
    BorderContainer,
    Toolbar,
    ContentPane,
    Button,
    //DropDownButton,
    Menu,
    MenuItem,
    CheckedMenuItem,
    MenuSeparator,
    //Dialog,
    resultsTemplate,
    resultContentTemplate,
    jsonUtils,
    graphicsUtils,
    webMercatorUtils,
    esriRest,
    Grid,
    Memory,
    OnDemandGrid,
    Selection,
    //selector,
    Keyboard,
    ColumnResizer
) {
    var ResultContent = declare([WidgetBase, TemplatedMixin], {
        templateString: resultContentTemplate,
        constructor: function(options) {
            lang.mixin(this, options);
        },
        postCreate: function() {
            this.inherited(arguments);
        }
    });

    return declare([WidgetBase, TemplatedMixin, Evented], {
        templateString: resultsTemplate,
        iquert: null,
        map: null,
        layer: null,
        _features: [],
        _current: {},
        resultSymbols: {
            fill: {
                color: [0, 158, 206, 64],
                outline: {
                    color: [0, 158, 206, 255],
                    width: 1,
                    type: 'esriSLS',
                    style: 'esriSLSSolid'
                },
                type: 'esriSFS',
                style: 'esriSFSSolid'
            },
            line: {
                color: [0, 158, 206, 255],
                width: 3,
                type: 'esriSLS',
                style: 'esriSLSSolid'
            },
            marker: {
                color: [0, 158, 206, 164],
                size: 13,
                type: 'esriSMS',
                style: 'esriSMSCircle',
                outline: {
                    color: [0, 158, 206, 255],
                    width: 1,
                    type: 'esriSLS',
                    style: 'esriSLSSolid'
                }
            }
        },
        highlightSymbols: {
            fill: {
                color: [247, 215, 8, 64],
                outline: {
                    color: [247, 215, 8, 255],
                    width: 3,
                    type: 'esriSLS',
                    style: 'esriSLSSolid'
                },
                type: 'esriSFS',
                style: 'esriSFSSolid'
            },
            line: {
                color: [247, 215, 8, 225],
                width: 4.5,
                type: 'esriSLS',
                style: 'esriSLSSolid'
            },
            marker: {
                color: [247, 215, 8, 164],
                size: 13,
                type: 'esriSMS',
                style: 'esriSMSCircle',
                outline: {
                    color: [247, 215, 8, 255],
                    width: 2.25,
                    type: 'esriSLS',
                    style: 'esriSLSSolid'
                }
            }
        },
        constructor: function(options) {
            lang.mixin(this, options);
            this.layer.on('click', lang.hitch(this, this.selectGraphic));
            this.map.on('extent-change', lang.hitch(this, function() {
                if (this.selectedFeature) {
                    if (this.selectedFeature.getDojoShape() !== null) {
                        this.selectedFeature.getDojoShape().moveToFront();
                    }
                }
            }));
        },
        postCreate: function() {
            this.inherited(arguments);
            this.stack = new StackContainer({
                doLayout: false
            }, this.stackNode);
            this.stack.startup();
            this.optionsMenu = new Menu({
                contextMenuForWindow: false,
                targetNodeIds: [this.optionsNode],
                leftClickToOpen: true
            });
            this.optionsMenu.addChild(this.zoomPage = new CheckedMenuItem({
                label: 'Zoom on Page'
            }));
            this.optionsMenu.addChild(new MenuItem({
                label: 'Repeat Last Identify',
                onClick: lang.hitch(this, function() {
                    this.iquert.repeatIdentify();
                })
            }));
            this.optionsMenu.addChild(new MenuSeparator());
            this.optionsMenu.addChild(new MenuItem({
                label: 'Selected Geometry Info',
                onClick: lang.hitch(this, function() {
                    this.geometryInfo();
                })
            }));
            this.optionsMenu.addChild(new MenuSeparator());
            if (this.iquert.attributeTableContainer) {
                this.optionsMenu.addChild(new MenuItem({
                    label: 'Attribute Table',
                    onClick: lang.hitch(this, function() {
                        this.attributeTable();
                    })
                }));
            }
            this.optionsMenu.addChild(new MenuItem({
                label: 'Export GeoJSON',
                onClick: lang.hitch(this, function() {
                    this.exportGeoJson();
                })
            }));
            this.optionsMenu.addChild(new MenuItem({
                label: 'Export CSV',
                onClick: lang.hitch(this, function() {
                    this.exportCsv();
                })
            }));
            //todo: export options
            //1) include or not coords for points
            //2) coord fields
            /*this.optionsMenu.addChild(new MenuItem({
                label: 'Export Options',
                onClick: lang.hitch(this, function () {
                    this.exportCsv();
                })
            }));*/
            this.optionsMenu.addChild(new MenuSeparator());
            this.optionsMenu.addChild(new MenuItem({
                label: 'Add Selected to Draw',
                onClick: lang.hitch(this, function() {
                    this.addToDraw(false);
                })
            }));
            this.optionsMenu.addChild(new MenuItem({
                label: 'Add All to Draw',
                onClick: lang.hitch(this, function() {
                    this.addToDraw(true);
                })
            }));
            this.optionsMenu.startup();
        },
        next: function() {
            if (!this.layer.graphics.length) {
                return;
            }
            this.stack.forward();
            this.page();
        },
        previous: function() {
            if (!this.layer.graphics.length) {
                return;
            }
            this.stack.back();
            this.page();
        },
        page: function() {
            var index = this.stack.getIndexOfChild(this.stack.selectedChildWidget);
            this.countNode.innerHTML = index + 1;
            this.selectedFeature = this.layer.graphics[index];
            this.highlightFeature(this.selectedFeature);
            if (this.zoomPage.checked) {
                this.zoomTo(this.selectedFeature);
            }
        },
        selectGraphic: function(e) {
            var id, feature;
            if (e.graphic) {
                id = e.graphic.resultId;
                feature = e.graphic;
            } else {
                id = e;
                array.forEach(this.layer.graphics, function(graphic) {
                    if (graphic.resultId === id) {
                        feature = graphic;
                        return;
                    }
                }, this);
            }
            this.countNode.innerHTML = id + 1;
            this.stack.selectChild('iquert-results-content-' + id);
            this.selectedFeature = this.layer.graphics[id];
            this.highlightFeature(feature);
            if (this.zoomPage.checked) {
                this.zoomTo(this.selectedFeature);
            }
        },
        highlightFeature: function(feature) {
            if (feature) {
                array.forEach(this.layer.graphics, function(graphic) {
                    if (graphic.highlighted) {
                        switch (graphic.geometry.type) {
                            case 'polygon':
                                graphic.setSymbol(jsonUtils.fromJson(this.resultSymbols.fill));
                                break;
                            case 'polyline':
                                graphic.setSymbol(jsonUtils.fromJson(this.resultSymbols.line));
                                break;
                            case 'point':
                                graphic.setSymbol(jsonUtils.fromJson(this.resultSymbols.marker));
                                break;
                        }
                        graphic.highlighted = false;
                        return;
                    }
                }, this);
            }
            feature = feature || this.layer.graphics[0];
            switch (feature.geometry.type) {
                case 'polygon':
                    feature.setSymbol(jsonUtils.fromJson(this.highlightSymbols.fill));
                    break;
                case 'polyline':
                    feature.setSymbol(jsonUtils.fromJson(this.highlightSymbols.line));
                    break;
                case 'point':
                    feature.setSymbol(jsonUtils.fromJson(this.highlightSymbols.marker));
                    break;
            }
            feature.highlighted = true;
            if (feature.getDojoShape() !== null) {
                feature.getDojoShape().moveToFront();
            }
        },
        zoomToAll: function() {
            if (this.layer.graphics.length) {
                if (this.layer.graphics.length === 1 && this.layer.graphics[0].geometry.type === 'point') {
                    this.map.centerAndZoom(this.layer.graphics[0].geometry, this.map.__tileInfo.lods.length - 5);
                } else {
                    this.map.setExtent(graphicsUtils.graphicsExtent(this.layer.graphics), true);
                }
            }
        },
        zoomTo: function() {
            var feature = this.selectedFeature;
            if (feature) {
                if (feature.geometry.type === 'point') {
                    this.map.centerAndZoom(feature.geometry, this.map.__tileInfo.lods.length - 5);
                } else {
                    this.map.setExtent(graphicsUtils.graphicsExtent([feature]), true);
                }
            }
        },
        addToDraw: function(all) {
            if (all && this._features.length) {
                var geoms = [];
                array.forEach(this._features, function(f) {
                    geoms.push(f.geometry);
                }, this);
                this.iquert.draw.addGeometry(geoms);
                this.map.notify('Added results to draw.');
            } else {
                if (this.selectedFeature) {
                    this.iquert.draw.addGeometry([this.selectedFeature.geometry]);
                    this.map.notify('Added result to draw.');
                }
            }
        },
        geometryInfo: function() {
            if (this.selectedFeature) {
                this.map.geometryInfo(this.selectedFeature.geometry);
            }
        },
        exportJson: function() {
            if (!this._features.length) {
                return;
            }
            var json = {
                features: []
            };
            array.forEach(this._features, function(feature) {
                var feat = {};
                feat.attributes = feature.attributes;
                json.features.push(feat);
            }, this);
            var stringified = JSON.stringify(json);
            if (window.saveAs) {
                window.saveAs(new window.Blob([stringified], {
                    type: 'text/plain;charset=' + document.characterSet
                }), 'results.json');
            } else {
                this.map.alert('Your browser does not support this operation.', 'Error');
            }
        },
        exportGeoJson: function() {
            if (!this._features.length) {
                return;
            }
            var geojson = {
                type: 'FeatureCollection',
                features: []
            };
            array.forEach(this._features, function(feature, index) {
                var feat = window.Terraformer.ArcGIS.parse(feature);
                feat.id = index;
                geojson.features.push(feat);
            }, this);
            var stringified = JSON.stringify(geojson);
            if (window.saveAs) {
                window.saveAs(new window.Blob([stringified], {
                    type: 'text/plain;charset=' + document.characterSet
                }), 'results.geojson');
            } else {
                this.map.alert('Your browser does not support this operation.', 'Error');
            }
        },
        //convert json to csv
        jsonToCsv: function(objArray) {
            var array = typeof objArray != 'object' ? JSON.parse(objArray) : objArray,
                str = '',
                line = '',
                head = array[0],
                value;
            for (var hIndex in head) {
                if (head.hasOwnProperty(hIndex)) {
                    value = hIndex + '';
                    line += '"' + value.replace(/"/g, '""') + '",';
                }
            }
            line = line.slice(0, -1);
            str += line + '\r\n';
            for (var i = 0; i < array.length; i++) {
                line = '';
                for (var bIndex in array[i]) {
                    if (array[i].hasOwnProperty(bIndex)) {
                        value = array[i][bIndex] + '';
                        line += '"' + value.replace(/"/g, '""') + '",';
                    }
                }
                line = line.slice(0, -1);
                str += line + '\r\n';
            }
            return str;
        },
        exportCsv: function() {
            if (!this._features.length) {
                return;
            }
            if (this._resultLayerIds.length > 1) {
                this.map.alert('Export CSV is not available with results from multiple layers.', 'Export CSV');
                return;
            }
            var json;
            if (this._features[0].geometry.type === 'point') {
                json = array.map(this._features, function(feat) {
                    return lang.mixin(feat.attributes, {
                        _LAT_Y: feat.geometry.y,
                        _LNG_X: feat.geometry.x
                    });
                });
            } else {
                json = array.map(this._features, function(feat) {
                    return feat.attributes;
                });
            }
            if (window.saveAs) {
                window.saveAs(new window.Blob([this.jsonToCsv(json)], {
                    type: 'text/plain;charset=' + document.characterSet
                }), 'results.csv');
            } else {
                this.map.alert('Your browser does not support this operation.', 'Error');
            }
        },
        attributeTable: function() {
            if (!this._features.length) {
                return;
            }
            if (this._resultLayerIds.length > 1) {
                this.map.alert('Attribute Table is not available with results from multiple layers.', 'Attribute Table');
                return;
            }
            //build layout
            if (!this._attributeTableContainer) {
                this._attributeTableContainer = new BorderContainer({
                    title: 'No Results',
                    design: 'sidebar',
                    gutters: false,
                    liveSplitters: false
                }, domConst.create('div'));
                this._attributeTableContainer.startup();

                //toolbar
                /*this._attributeTableToolbar = new Toolbar({
                    region: 'top'
                });
                this._attributeTableToolbar.addChild(new Button({
                    label: 'Test'
                }));
                this._attributeTableToolbar.addChild(new Button({
                    label: 'Beer'
                }));
                this._attributeTableToolbar.addChild(new Button({
                    label: 'Whiskey'
                }));
                this._attributeTableContainer.addChild(this._attributeTableToolbar);*/

                var attsContent = new ContentPane({
                    region: 'center',
                    style: 'padding:0;'
                });
                this._attributeTableContainer.addChild(attsContent);
                this.iquert.attributeTableContainer.addChild(this._attributeTableContainer);
                //grid
                this._attributeTableGrid = declare([OnDemandGrid, Selection, Keyboard, ColumnResizer])({
                    className: 'hardcider-iquert-attribute-grid',
                    bufferRows: Infinity,
                    selectionMode: 'single',
                    columns: [{
                        field: null,
                        label: 'No Results'
                    }],
                    minWidth: 60,
                    adjustLastColumn: true
                }, attsContent.containerNode);
                on(this._attributeTableGrid, '.dgrid-row:click', lang.hitch(this, this._attributeTableGridRowClick));
            }
            var info = this._current.layer.layerInfos[this._current.layerId].info;
            this._attributeTableContainer.set('title', 'Results: ' + info.name);
            this._attributeTableGrid.set('store', null);
            this._attributeTableGrid.set('columns', null);
            //grid columns
            var columns = [];
            array.forEach(info.fields, function(field) {
                if (field.type !== 'esriFieldTypeGeometry' && field.type !== 'esriFieldTypeBlob' && field.type !== 'esriFieldTypeRaster' && field.type !== 'esriFieldTypeGUID' && field.type !== 'esriFieldTypeGlobalID' && field.type !== 'esriFieldTypeXML') {
                    var column;
                    if (field.type === 'esriFieldTypeDate') {
                        column = {
                            field: field.name,
                            label: field.alias,
                            formatter: function(value) {
                                var date = new Date(value);
                                if (!isNaN(date)) {
                                    value = locale.format(date, {
                                        selector: 'date',
                                        datePattern: 'M/d/y'
                                    });
                                }
                                return value;
                            }
                        };
                    } else if (field.type === 'esriFieldTypeString') {
                        column = {
                            field: field.name,
                            label: field.alias,
                            formatter: function(value) {
                                var urlExp = new RegExp(/(ftp|http|https):\/\/(\w+:{0,1}\w*@)?(\S+)(:[0-9]+)?(\/|\/([\w#!:.?+=&%@!\-\/]))?/);
                                if (urlExp.test(value)) {
                                    return '<a href="' + value + '" title="' + value + '" target="_blank">Hyperlink</a>';
                                } else {
                                    return value;
                                    //chain value formatters by adding to next else if and 'return value;' in last else
                                }
                            }
                        };
                    } else {
                        column = {
                            field: field.name,
                            label: field.alias
                        };
                    }
                    columns.push(column);
                }
            }, this);
            this._attributeTableGrid.set('columns', columns);
            var data = array.map(this._features, function(feature) {
                return feature.attributes;
            });
            var oid = array.filter(info.fields, function(field) {
                return field.type === 'esriFieldTypeOID';
            });
            this.oidField = oid[0].name;
            var store = new Memory({
                data: data,
                idProperty: this.oidField
            });
            this._attributeTableGrid.set('store', store);
            this.iquert.attributeTableContainer.selectChild(this._attributeTableContainer.id);
            if (this.iquert.showAttributeTable) {
                this.iquert.showAttributeTable();
            }
            this._attributeTableContainer.resize();
        },
        _attributeTableGridRowClick: function(evt) {
            var row = this._attributeTableGrid.row(evt);
            array.forEach(this._features, function(feature) {
                if (feature.attributes[this.oidField] === row.id) {
                    this.selectGraphic(feature.resultId);
                    return;
                }
            }, this);
        },
        clear: function() {
            this.infoNode.innerHTML = 'No Results';
            this.countNode.innerHTML = '0';
            this.totalNode.innerHTML = '0';
            this.stack.destroyDescendants();
            this.layer.clear();
            this.selectedFeature = null;
            this._features = [];
            this._resultLayerIds = [];
            if (this._attributeTableContainer) {
                this._attributeTableGrid.set('store', null);
                this._attributeTableGrid.set('columns', [{
                    field: null,
                    label: 'No Results'
                }]);
                this._attributeTableContainer.set('title', 'No Results');
            }
        },
        _getLayerInfos: function(layer, layerIds, callback) {
            var promises = [];
            array.forEach(layerIds, function(lid) {
                promises.push(esriRest.getLayerInfo(layer, lid, true));
            });
            all(promises).then(lang.hitch(this, callback), function(e) {
                console.log(e);
                //some indication to user of failure
            });
        },
        _identifyResults: function(results, layer, layerId) {
            this._current.type = 'identify';
            this._current.layer = layer;
            this._current.layerId = layerId;
            this._current.results = results;
            var layerIds = [];
            array.forEach(results, function(result) {
                if (!layer.layerInfos[result.layerId].info) {
                    if (array.indexOf(layerIds, result.layerId) === -1) {
                        layerIds.push(result.layerId);
                    }
                }
            }, this);
            if (!layerIds.length) {
                this._processIdentifyResults(results, layer);
            } else {
                this._getLayerInfos(layer, layerIds, lang.hitch(this, this._returnToIdentify));
            }
        },
        _returnToIdentify: function() {
            var c = this._current;
            this._processIdentifyResults(c.results, c.layer);
        },
        _processIdentifyResults: function(results, layer) {
            this._resultLayerIds = [];
            var length = results.length,
                resultId = 0;
            if (!length) {
                this.infoNode.innerHTML = 'Identify returned 0 results';
                return;
            }
            this.infoNode.innerHTML = 'Identify returned ' + length + ' results';
            this.countNode.innerHTML = '1';
            this.totalNode.innerHTML = length;
            array.forEach(results, function(result) {
                if (array.indexOf(this._resultLayerIds, result.layerId) === -1) {
                    this._resultLayerIds.push(result.layerId);
                }
                var feature = result.feature;
                if (feature.geometry.spatialReference.isWebMercator()) {
                    feature.geometry = webMercatorUtils.webMercatorToGeographic(feature.geometry);
                }
                switch (feature.geometry.type) {
                    case 'polygon':
                        feature.setSymbol(jsonUtils.fromJson(this.resultSymbols.fill));
                        break;
                    case 'polyline':
                        feature.setSymbol(jsonUtils.fromJson(this.resultSymbols.line));
                        break;
                    case 'point':
                        feature.setSymbol(jsonUtils.fromJson(this.resultSymbols.marker));
                        break;
                }
                feature.resultId = resultId;
                this.stack.addChild(this._createAttributeGrid(resultId, feature, layer, result.layerId));
                resultId++;
                this.layer.add(feature);
                this._features.push(feature);
            }, this);
            this.selectedFeature = this.layer.graphics[0];
            this.highlightFeature();
        },
        _queryResults: function(results, layer, layerId) {
            this._current.type = 'query';
            this._current.layer = layer;
            this._current.layerId = layerId;
            this._resultLayerIds = [layerId];
            this._current.results = results;
            var length = results.features.length,
                resultId = 0;
            if (!length) {
                this.infoNode.innerHTML = 'Query returned 0 results';
                return;
            }
            this.infoNode.innerHTML = 'Query returned ' + length + ' results';
            this.countNode.innerHTML = '1';
            this.totalNode.innerHTML = length;
            array.forEach(results.features, function(feature) {
                if (feature.geometry.spatialReference.isWebMercator()) {
                    feature.geometry = webMercatorUtils.webMercatorToGeographic(feature.geometry);
                }
                switch (feature.geometry.type) {
                    case 'polygon':
                        feature.setSymbol(jsonUtils.fromJson(this.resultSymbols.fill));
                        break;
                    case 'polyline':
                        feature.setSymbol(jsonUtils.fromJson(this.resultSymbols.line));
                        break;
                    case 'point':
                        feature.setSymbol(jsonUtils.fromJson(this.resultSymbols.marker));
                        break;
                }
                feature.resultId = resultId;
                this.stack.addChild(this._createAttributeGrid(resultId, feature, layer, layerId));
                resultId++;
                this.layer.add(feature);
                this._features.push(feature);
            }, this);
            this.selectedFeature = this.layer.graphics[0];
            this.highlightFeature();
        },
        _createAttributeGrid: function(resultId, feature, layer, layerId) {
            var cp = new ContentPane({
                    id: 'iquert-results-content-' + resultId,
                    doLayout: false,
                    style: 'padding:4px 0 0;'
                }),
                layerInfo = layer.layerInfos[layerId],
                resultContent = new ResultContent({}),
                data = [],
                attributes = feature.attributes;
            resultContent.startup();
            resultContent.serviceNode.innerHTML = layer.layerParams.name;
            resultContent.layerNode.innerHTML = layerInfo.name;

            function aliasFilter() {
                var fieldInfo = array.filter(layerInfo.info.fields, function(f) {
                    return f.alias === i;
                });
                return fieldInfo;
            }

            function nameFilter() {
                var fieldInfo = array.filter(layerInfo.info.fields, function(f) {
                    return f.name === i;
                });
                return fieldInfo;
            }
            for (var i in attributes) {
                if (attributes.hasOwnProperty(i)) {
                    var field = i,
                        value = attributes[i],
                        fieldInfo = aliasFilter();
                    //if service layer fields have 'compound' field names, e.g. joined_table.SOME_FIELD, 'return f.alias == i;' will return nothing
                    if (fieldInfo === undefined) {
                        fieldInfo = nameFilter();
                        fieldInfo = fieldInfo[0];
                        field = fieldInfo.alias;
                    }
                    if (fieldInfo.type !== 'esriFieldTypeOID' && fieldInfo.type !== 'esriFieldTypeGeometry' && fieldInfo.type !== 'esriFieldTypeBlob' && fieldInfo.type !== 'esriFieldTypeRaster' && fieldInfo.type !== 'esriFieldTypeGUID' && fieldInfo.type !== 'esriFieldTypeGlobalID' && fieldInfo.type !== 'esriFieldTypeXML') {
                        if (fieldInfo.type === 'esriFieldTypeDate') {
                            var date = new Date(value);
                            if (!isNaN(date)) {
                                value = locale.format(date, {
                                    selector: 'date',
                                    datePattern: 'M/d/y'
                                });
                            }
                        }
                        var dataItem = {
                            field: field,
                            value: value
                        };
                        data.push(dataItem);
                    }
                }
            }
            var attsGrid = new Grid({
                className: 'iquert-results-atts-grid',
                columns: {
                    field: 'Field',
                    value: {
                        label: 'Value',
                        formatter: function(value) {
                            var urlExp = new RegExp(/(ftp|http|https):\/\/(\w+:{0,1}\w*@)?(\S+)(:[0-9]+)?(\/|\/([\w#!:.?+=&%@!\-\/]))?/);
                            if (urlExp.test(value)) {
                                return '<a href="' + value + '" title="' + value + '" target="_blank">Hyperlink</a>';
                            } else {
                                return value;
                                //chain value formatters by adding to next else if and 'return value;' in last else
                            }
                        }
                    }
                }
            }, resultContent.gridNode);
            attsGrid.renderArray(data);
            cp.setContent(resultContent.domNode);
            return cp;
        }
    });
});
