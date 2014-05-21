/*
 * Copyright (c) 2014 Ben Fousek
 * https://github.com/btfou/hardcider
 */
define([
    'dojo/_base/declare',
    'dijit/_WidgetBase',
    'dijit/_TemplatedMixin',
    'dijit/_WidgetsInTemplateMixin',
    'dojo/_base/array',
    'dojo/_base/lang',
    'dojo/on',
    'dojo/json',
    'dgrid/List',
    'dgrid/Selection',
    'dgrid/Keyboard',
    'dijit/Menu',
    'dijit/MenuItem',
    'hardcider/utility/esri-rest',
    'esri/graphic',
    'esri/request',
    'dojo/text!hardcider/iquert/templates/QueryBuilder.html',
    'dijit/form/Button',
    'dijit/form/RadioButton',
    'dijit/form/Textarea'
], function(
    declare,
    WidgetBase,
    TemplatedMixin,
    WidgetsInTemplateMixin,
    array,
    lang,
    on,
    JSON,
    List,
    Selection,
    Keyboard,
    Menu,
    MenuItem,
    esriRest,
    Graphic,
    esriRequest,
    queryBuilderTemplate
) {
    return declare([WidgetBase, TemplatedMixin, WidgetsInTemplateMixin], {
        templateString: queryBuilderTemplate,
        uniqueValueLimit: 20000,
        constructor: function(options) {
            lang.mixin(this, options);
        },
        postCreate: function() {
            this.inherited(arguments);
            var ListSK = declare([List, Selection, Keyboard]);
            //field list
            this.fieldList = new ListSK({
                selectionMode: 'single',
                showHeader: false
            }, this.fieldListNode);
            this.fieldList.on('.dgrid-row:dblclick', lang.hitch(this, this._addField));
            this.fieldList.on('.dgrid-row:click', lang.hitch(this, function(evt) {
                var data = this.fieldList.row(evt).data;
                this._fieldListFieldType = array.filter(this._layerInfo.fields, function(field) {
                    return field.name === data;
                }, this)[0].type;
                if (this._fieldListField !== data) {
                    this.valueList.refresh();
                }
                this._fieldListField = data;
            }));
            //value list
            this.valueList = new ListSK({
                selectionMode: 'single',
                showHeader: false
            }, this.valueListNode);
            this.valueList.on('.dgrid-row:dblclick', lang.hitch(this, this._addValue));
            this.querySelectHandler = on.pausable(this.querySelectNode, 'change', lang.hitch(this, function(value) {
                var v = value.split(',');
                this.setQuery(this.iquert.map.getLayer(v[0]), parseInt(v[1], 10));
            }));
            //whereNode blur and focus cursor position
            var node = this.whereNode;
            node.on('blur', lang.hitch(this, function() {
                node.set('cursorPosition', [node.textbox.selectionStart, node.textbox.selectionEnd]);
            }));
            node.on('focus', lang.hitch(this, function() {
                var position = node.get('cursorPosition');
                if (position) {
                    node.textbox.setSelectionRange(position[0], position[1]);
                }
            }));
            //spatial filter menu
            this.spatialFilterMenu = new Menu({
                contextMenuForWindow: false,
                targetNodeIds: [this.spatialFilterMenuNode],
                leftClickToOpen: true
            });
            this.spatialFilterMenu.addChild(new MenuItem({
                label: 'Set By Extent',
                onClick: lang.hitch(this, function() {
                    this._setCustomSpatialFilter('extent');
                })
            }));
            this.spatialFilterMenu.addChild(new MenuItem({
                label: 'Set By Polygon',
                onClick: lang.hitch(this, function() {
                    this._setCustomSpatialFilter('polygon');
                })
            }));
            this.spatialFilterMenu.addChild(new MenuItem({
                label: 'Show Custom Spatial Filter',
                onClick: lang.hitch(this, this._showCustomSpatialFilter)
            }));
            this.spatialFilterMenu.startup();
        },
        _getLayerInfo: function(layer, layerId) {
            esriRest.getLayerInfo(layer, layerId, true).then(lang.hitch(this, function() {
                this.setQuery(layer, layerId);
            }), lang.hitch(this, function(e) {
                console.log(e);
                this.iquert.map.alert('An error occurred retrieving layer info.', 'Error');
            }));
        },
        setQuery: function(layer, layerId) {
            var layerInfo = layer.layerInfos[layerId].info,
                qsn = this.querySelectNode,
                value,
                fields = [];
            if (!layerInfo) {
                this._getLayerInfo(layer, layerId);
                return;
            }
            this.infoNode.innerHTML = '';
            this._layer = layer;
            this._layerId = layerId;
            this._layerInfo = layerInfo;
            value = this._layer.id + ',' + this._layerId;
            if (!array.filter(qsn.getOptions(), function(opt) {
                return opt.value === value;
            }).length) {
                qsn.addOption({
                    label: this._layerInfo.name,
                    value: value
                });
            }
            this.querySelectHandler.pause();
            qsn.set('value', value);
            this.querySelectHandler.resume();
            array.forEach(this._layerInfo.fields, function(field) {
                if (field.type === 'esriFieldTypeOID') {
                    this._oidField = field.name;
                    return;
                }
            }, this);
            this.whereNode.reset();
            this.valueList.refresh();
            array.forEach(this._layerInfo.fields, function(field) {
                if (field.type !== 'esriFieldTypeGeometry' && field.type !== 'esriFieldTypeBlob' && field.type !== 'esriFieldTypeRaster' && field.type !== 'esriFieldTypeGUID' && field.type !== 'esriFieldTypeGlobalID' && field.type !== 'esriFieldTypeXML') {
                    fields.push(field.name);
                }
            }, this);
            this.fieldList.refresh();
            this.fieldList.renderArray(fields);
            this.fieldList.scrollTo({
                x: 0,
                y: 0
            });
        },
        _addField: function(evt) {
            var data = this.fieldList.row(evt).data;
            var node = this.whereNode;
            var value = node.get('value');
            if (value !== '') {
                node.focus();
                var position = node.get('cursorPosition');
                var add;
                if (position[0] === 0 || value.substr(position[0] + 1, 1) !== ' ') {
                    add = data + ' ';
                    var prevChar = value.substr(position[0] - 1, 1);
                    if (prevChar !== ' ' && prevChar !== '(') {
                        add = ' ' + add;
                    }
                } else {
                    add = ' ' + data;
                }
                value = value.substr(0, position[0]) + add + value.substr(position[1]);
                node.set('value', value);
                var pos = position[0] + add.length;
                node.textbox.setSelectionRange(pos, pos);
            } else {
                node.set('value', data);
                node.focus();
                node.textbox.setSelectionRange(data.length, data.length);
            }
        },
        _addOperator: function(evt) {
            var data = evt.target.value,
                node = this.whereNode,
                value = node.get('value');
            if (value !== '') {
                node.focus();
                var position = node.get('cursorPosition');
                var add;
                if (data === '_' || data === '%') {
                    add = data;
                } else if (position[0] === 0 || value.substr(position[0] + 1, 1) !== ' ') {
                    add = data + ' ';
                    var prevChar = value.substr(position[0] - 1, 1);
                    if (prevChar !== ' ' && prevChar != '(') {
                        add = ' ' + add;
                    }
                } else {
                    add = ' ' + data;
                }
                value = value.substr(0, position[0]) + add + value.substr(position[1]);
                node.set('value', value);
                var pos = position[0] + add.length;
                if (data === '()') {
                    pos = pos - 1;
                }
                node.textbox.setSelectionRange(pos, pos);
            } else {
                node.set('value', data);
                node.focus();
                if (data === '()') {
                    node.textbox.setSelectionRange(1, 1);
                } else {
                    node.textbox.setSelectionRange(data.length, data.length);
                }
            }
        },
        _addValue: function(evt) {
            var data = this.valueList.row(evt).data;
            if (this._fieldListFieldType === 'esriFieldTypeString') {
                data = '\'' + data + '\'';
            }
            var node = this.whereNode,
                value = node.get('value');
            if (value !== '') {
                node.focus();
                var position = node.get('cursorPosition');
                var add;
                if (position[0] === 0 || value.substr(position[0] + 1, 1) !== ' ') {
                    add = data + ' ';
                    var prevChar = value.substr(position[0] - 1, 1);
                    if (prevChar !== ' ' && prevChar !== '(') {
                        add = ' ' + add;
                    }
                } else {
                    add = ' ' + data;
                }
                value = value.substr(0, position[0]) + add + value.substr(position[1]);
                node.set('value', value);
                var pos = position[0] + add.length;
                if (data === '()') {
                    pos = pos - 1;
                }
                node.textbox.setSelectionRange(pos, pos);
            } else {
                node.set('value', data);
                node.focus();
                if (data === '()') {
                    node.textbox.setSelectionRange(1, 1);
                } else {
                    node.textbox.setSelectionRange(data.length, data.length);
                }
            }
        },
        _setFieldValues: function() {
            this.valueList.refresh();
            if (!this._fieldListField) {
                return;
            }
            var fieldValues = null;
            array.forEach(this._layerInfo.fields, function(field) {
                if (field.name === this._fieldListField) {
                    if (field.values) {
                        fieldValues = field.values;
                    }
                    return;
                }
            }, this);
            if (fieldValues) {
                this.valueList.renderArray(fieldValues);
                this.valueList.scrollTo({
                    x: 0,
                    y: 0
                });
                this.infoNode.innerHTML = '';
                return;
            }
            this.infoNode.innerHTML = 'Getting values...';
            this._getFieldValues();
        },

        _getFieldValues: function() {
            //get field info
            var fieldInfo, values;
            array.forEach(this._layerInfo.fields, function(fld) {
                if (fld.name === this._fieldListField) {
                    fieldInfo = fld;
                    return;
                }
            }, this);
            //check for coded domain
            if (fieldInfo.domain && fieldInfo.domain.type === 'codedValue') {
                values = array.map(fieldInfo.domain.codedValues, function(codedValue) {
                    return codedValue.code;
                });
                values.sort();
                fieldInfo.values = values;
                this.valueList.renderArray(values);
                this.valueList.scrollTo({
                    x: 0,
                    y: 0
                });
                this.infoNode.innerHTML = '';
                return;
            }
            esriRest.getUniqueFieldValues(this._layer, this._layerId, this._fieldListField, this.uniqueValueLimit).then(lang.hitch(this, function(r) {
                fieldInfo.values = r;
                this.valueList.renderArray(r);
                this.infoNode.innerHTML = '';
            }), lang.hitch(this, function(e) {
                console.log(e);
                this.infoNode.innerHTML = '';
            }));
        },
        query: function() {
            this.infoNode.innerHTML = '';
            if (this.querySelectNode.get('value') === '') {
                this.infoNode.innerHTML = '<span class="hardcider-warning-text">Please select a layer to query.</span>';
                return;
            }
            var where = this._cleanWhere(this.whereNode.get('value'));
            this.whereNode.set('value', where);
            if (!where) {
                this.infoNode.innerHTML = '<span class="hardcider-warning-text">Start by creating query.</span>';
                this.whereNode.domNode.focus();
                return;
            }
            if (this.spatialFilterCustomNode.checked && !this._customSpatialFilterGeometry) {
                this.infoNode.innerHTML = '<span class="hardcider-warning-text">Custom Spatial Filter selected but not set.</span>';
                return;
            }
            var sfg = null;
            if (this.spatialFilterMapNode.checked) {
                sfg = this.iquert.map.extent.getExtent();
            } else if (this.spatialFilterCustomNode.checked) {
                sfg = this._customSpatialFilterGeometry;
            }
            this.iquert.performQuery(this._layer, this._layerId, where, sfg);
        },
        _setCustomSpatialFilter: function(type) {
            var map = this.iquert.map;
            map.eventBegin();
            map.setMapCursor('crosshair');
            map.notify('Set custom spatial filter.');
            map.drawToolbar.activate(type);
            var drawOnEnd = map.drawToolbar.on('draw-end', lang.hitch(this, function(result) {
                drawOnEnd.remove();
                map.drawToolbar.deactivate();
                map.eventEnd();
                this._customSpatialFilterGeometry = result.geometry;
                this.spatialFilterCustomNode.set('checked', true);
                map.graphics.add(new Graphic(result.geometry, map.drawToolbar.fillSymbol));
                setTimeout(function() {
                    map.graphics.clear();
                }, 1500);
            }));
            map.eventAdd(drawOnEnd);
        },
        _showCustomSpatialFilter: function() {
            var map = this.iquert.map;
            if (this._customSpatialFilterGeometry) {
                map.graphics.add(new Graphic(this._customSpatialFilterGeometry, map.drawToolbar.fillSymbol));
                setTimeout(function() {
                    map.graphics.clear();
                }, 1500);
            }
        },
        _verifyQuery: function() {
            this.infoNode.innerHTML = 'Verifying query...';
            if (this.querySelectNode.get('value') === '') {
                this.infoNode.innerHTML = '<span class="hardcider-warning-text">Please select a layer to query.</span>';
                return;
            }
            var where = this._cleanWhere(this.whereNode.get('value'));
            this.whereNode.set('value', where);
            if (!where) {
                this.infoNode.innerHTML = '<span class="hardcider-warning-text">Start by creating query.</span>';
                this.whereNode.domNode.focus();
                return;
            }
            if (this.spatialFilterCustomNode.checked && !this._customSpatialFilterGeometry) {
                this.infoNode.innerHTML = '<span class="hardcider-warning-text">Custom Spatial Filter selected but not set.</span>';
                return;
            }
            var sfg = null;
            if (this.spatialFilterMapNode.checked) {
                sfg = this.iquert.map.extent.getExtent().toJson();
            } else if (this.spatialFilterCustomNode.checked) {
                sfg = this._customSpatialFilterGeometry.toJson();
            }
            var time = new Date().getTime();
            where = '(' + where + ') AND ' + time + ' = ' + time;
            esriRequest({
                url: this._layer.url + '/' + this._layerId + '/query',
                callbackParamName: 'callback',
                content: {
                    f: 'json',
                    returnGeometry: false,
                    returnIdsOnly: true,
                    token: this._layer._getToken(),
                    where: where,
                    geometry: JSON.stringify(sfg),
                    geometryType: (sfg) ? 'esriGeometryEnvelope' : null
                }
            }).then(lang.hitch(this, function(r) {
                if (r.objectIds) {
                    this.infoNode.innerHTML = 'Query verified and returned ' + r.objectIds.length + ' results.';
                } else {
                    this.infoNode.innerHTML = 'Query verified, but returned 0 results.';
                }
            }), lang.hitch(this, function(e) {
                console.log(e);
                this.infoNode.innerHTML = 'Query is invalid.';
            }));
        },
        _cleanWhere: function(where) {
            //trim leading and trailing whitespace
            //TO DO: dojo???
            if (!String.prototype.trim) {
                where = where.replace(/^\s\s*/, '').replace(/\s\s*$/, '');
            } else {
                where = where.trim();
            }
            //replace double spaces with a single space
            where = where.replace(/\s{2,}/g, ' ');
            return where;
        },
        _clearWhere: function() {
            var node = this.whereNode;
            node.reset();
            node.focus();
            node.textbox.setSelectionRange(0, 0);
            this.infoNode.innerHTML = '';
        }
    });
});
