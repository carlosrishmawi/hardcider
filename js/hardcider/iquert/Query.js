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
    'dojo/dom-style',
    'dijit/Menu',
    'dijit/MenuItem',
    'hardcider/utility/esri-rest',
    'esri/graphic',
    'dojo/text!hardcider/iquert/templates/Query.html',
    'dijit/form/Form',
    'dijit/form/Button',
    'dijit/form/RadioButton',
    'dijit/form/TextBox',
    'dijit/form/NumberTextBox',
    'dijit/form/DateTextBox',
    'dijit/form/Select'
], function(
    declare,
    WidgetBase,
    TemplatedMixin,
    WidgetsInTemplateMixin,
    array,
    lang,
    on,
    domStyle,
    Menu,
    MenuItem,
    esriRest,
    Graphic,
    queryTemplate
) {
    return declare([WidgetBase, TemplatedMixin, WidgetsInTemplateMixin], {
        templateString: queryTemplate,
        constructor: function(options) {
            lang.mixin(this, options);
        },
        postCreate: function() {
            this.inherited(arguments);
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
            on(this.formNode, 'submit', lang.hitch(this, this.query));
            on(this.fieldSelectNode, 'change', lang.hitch(this, this._setIsNullQuery));
            on(this.operatorSelectNode, 'change', lang.hitch(this, this._setIsNullQuery));
            this.querySelectHandler = on.pausable(this.querySelectNode, 'change', lang.hitch(this, function(value) {
                var v = value.split(',');
                this.setQuery(this.iquert.map.getLayer(v[0]), parseInt(v[1], 10));
            }));
        },
        _setIsNullQuery: function(value) {
            if (value === 'IS NULL' || value === 'IS NOT NULL') {
                this._isNullQuery = true;
            } else {
                this._isNullQuery = false;
            }
            array.forEach(this.valueContainerNode.getChildren(), function(child) {
                if (value === 'IS NULL' || value === 'IS NOT NULL') {
                    child.set('disabled', true);
                } else {
                    child.set('disabled', false);
                }
            }, this);
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
                type;
            if (!layerInfo) {
                this._getLayerInfo(layer, layerId);
                return;
            }
            this.infoNode.innerHTML = '';
            if (this._onFieldChange) {
                this._onFieldChange.remove();
                this._onFieldChange = null;
            }
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
            this.fieldSelectNode.removeOption(this.fieldSelectNode.getOptions());
            array.forEach(this._layerInfo.fields, function(f) {
                if (f.type !== 'esriFieldTypeOID' && f.type !== 'esriFieldTypeGeometry' && f.type !== 'esriFieldTypeBlob' && f.type !== 'esriFieldTypeRaster' && f.type !== 'esriFieldTypeGUID' && f.type !== 'esriFieldTypeGlobalID' && f.type !== 'esriFieldTypeXML') {
                    switch (f.type) {
                        case 'esriFieldTypeString':
                            type = 'text';
                            break;
                        case 'esriFieldTypeSmallInteger':
                        case 'esriFieldTypeInteger':
                        case 'esriFieldTypeSingle':
                        case 'esriFieldTypeDouble':
                            type = 'number';
                            break;
                        case 'esriFieldTypeDate':
                            type = 'date';
                            break;
                    }
                    this.fieldSelectNode.addOption({
                        label: f.alias + ' <span class="hardcider-muted-text">(' + type + ')</span>',
                        value: f.name + ',' + type
                    });
                }
            }, this);
            this._setField();
            this._onFieldChange = on(this.fieldSelectNode, 'change', lang.hitch(this, this._setField));
        },
        _setField: function() {
            var value = this.fieldSelectNode.get('value');
            this._field = value.split(',')[0];
            this._type = value.split(',')[1];
            this._domain = null;
            this._domainType = null;
            array.forEach(this._layerInfo.fields, function(f) {
                if (f.name === this._field) {
                    if (f.domain) {
                        this._domain = f.domain;
                        this._domainType = f.domain.type;
                        return;
                    }
                }
            }, this);
            this._setOperator();
        },
        _setOperator: function() {
            array.forEach(this.valueContainerNode.getChildren(), function(child) {
                domStyle.set(child.domNode, 'display', 'none');
            }, this);
            this.textValueNode.reset();
            this.numberValueNode.reset();
            this.dateValueNode.reset();
            this.codedDomainValueNode.removeOption(this.codedDomainValueNode.getOptions());
            this.operatorSelectNode.removeOption(this.operatorSelectNode.getOptions());
            if (this._type === 'text' && !this._domain) {
                this.operatorSelectNode.addOption([{
                    label: 'Contains',
                    value: 'LIKE',
                    selected: true
                }, {
                    label: 'Does not contain',
                    value: '<>'
                }, {
                    label: 'Equals',
                    value: '='
                }, {
                    label: 'Begins with',
                    value: 'begin'
                }, {
                    label: 'Ends with',
                    value: 'end'
                }, {
                    label: 'Is null',
                    value: 'IS NULL'
                }, {
                    label: 'Is not null',
                    value: 'IS NOT NULL'
                }]);
                domStyle.set(this.textValueNode.domNode, 'display', 'block');
            } else if (this._type === 'text' && this._domain && this._domainType === 'codedValue') {
                this.operatorSelectNode.addOption([{
                    label: 'Equals',
                    value: '=',
                    selected: true
                }, {
                    label: 'Does not equal',
                    value: '<>'
                }, {
                    label: 'Is null',
                    value: 'IS NULL'
                }, {
                    label: 'Is not null',
                    value: 'IS NOT NULL'
                }]);
                array.forEach(this._domain.codedValues, function(cv) {
                    this.codedDomainValueNode.addOption({
                        label: cv.name,
                        value: cv.code
                    });
                }, this);
                domStyle.set(this.codedDomainValueNode.domNode, 'display', 'block');
            } else if (this._type === 'number') { //TO DO: add range domain
                this.operatorSelectNode.addOption([{
                    label: 'Equals',
                    value: '=',
                    selected: true
                }, {
                    label: 'Not equal to',
                    value: '<>'
                }, {
                    label: 'Less than',
                    value: '<'
                }, {
                    label: 'Less than or equal to',
                    value: '<='
                }, {
                    label: 'Greater than',
                    value: '>'
                }, {
                    label: 'Greater than or equal to',
                    value: '>='
                }, {
                    label: 'Is null',
                    value: 'IS NULL'
                }, {
                    label: 'Is not null',
                    value: 'IS NOT NULL'
                }]);
                domStyle.set(this.numberValueNode.domNode, 'display', 'block');
            } else if (this._type === 'date') {
                this.operatorSelectNode.addOption([{
                    label: 'On',
                    value: '=',
                    selected: true
                }, {
                    label: 'Before',
                    value: '<'
                }, {
                    label: 'After',
                    value: '>'
                }, {
                    label: 'Is null',
                    value: 'IS NULL'
                }, {
                    label: 'Is not null',
                    value: 'IS NOT NULL'
                }]);
                domStyle.set(this.dateValueNode.domNode, 'display', 'block');
            }
        },
        _buildWhere: function() {
            var where, value,
                type = this._type,
                operator = this.operatorSelectNode.get('value'),
                field = this._field;
            if (type === 'text') {
                if (!this._domain) {
                    value = this.textValueNode.get('value');
                } else {
                    value = this.codedDomainValueNode.get('value');
                }
                switch (operator) {
                    case '=':
                        where = '(LOWER(' + field + ') = LOWER(\'' + value + '\'))';
                        break;
                    case 'LIKE':
                        value = (value).split(' ').join('%');
                        where = '(LOWER(' + field + ') LIKE LOWER(\'%' + value + '%\'))';
                        break;
                    case '<>':
                        where = '(LOWER(' + field + ') <> LOWER(\'%' + value + '%\'))';
                        break;
                    case 'begin':
                        value = value + '%';
                        where = '(LOWER(' + field + ') LIKE LOWER(\'' + value + '\'))';
                        break;
                    case 'end':
                        value = '%' + value;
                        where = '(LOWER(' + field + ') LIKE LOWER(\'' + value + '\'))';
                        break;
                    case 'IS NULL':
                        where = '(' + field + ' IS NULL)';
                        break;
                    case 'IS NOT NULL':
                        where = '(' + field + ' IS NOT NULL)';
                        break;
                }
            } else if (type === 'date') {
                var date = this.dateValueNode.get('value');
                value = 'date\'' + date.getFullYear() + '/' + (date.getMonth() + 1) + '/' + date.getDate() + '\'';
                switch (operator) {
                    case '=':
                        where = '(' + field + ' = ' + value + ')';
                        break;
                    case '<':
                        where = '(' + field + ' < ' + value + ')';
                        break;
                    case '>':
                        where = '(' + field + ' > ' + value + ')';
                        break;
                    case 'IS NULL':
                        where = '(' + field + ' IS NULL)';
                        break;
                    case 'IS NOT NULL':
                        where = '(' + field + ' IS NOT NULL)';
                        break;
                }
            } else if (type === 'number') {
                value = this.numberValueNode.get('value');
                switch (operator) {
                    case '=':
                        where = '(' + field + ' = ' + value + ')';
                        break;
                    case '<>':
                        where = '(' + field + ' <> ' + value + ')';
                        break;
                    case '<':
                        where = '(' + field + ' < ' + value + ')';
                        break;
                    case '<=':
                        where = '(' + field + ' <= ' + value + ')';
                        break;
                    case '>':
                        where = '(' + field + ' > ' + value + ')';
                        break;
                    case '>=':
                        where = '(' + field + ' >= ' + value + ')';
                        break;
                    case 'IS NULL':
                        where = '(' + field + ' IS NULL)';
                        break;
                    case 'IS NOT NULL':
                        where = '(' + field + ' IS NOT NULL)';
                        break;
                }
            }
            var time = new Date().getTime();
            where += ' AND ' + time + ' = ' + time;
            return where;
        },
        query: function() {
            this.infoNode.innerHTML = '';
            if (this.fieldSelectNode.get('value') === '') {
                this.infoNode.innerHTML = '<span class="hardcider-warning-text">Please select a layer to query.</span>';
                return;
            }
            if (!this._isNullQuery) {
                if (this._type === 'text' && !this._domain && this.textValueNode.get('value') === '') {
                    this.infoNode.innerHTML = '<span class="hardcider-warning-text">Please enter a query value.</span>';
                    this.textValueNode.focus();
                    return;
                } else if (this._type === 'text' && this._domain && this.codedDomainValueNode.get('value') === '') {
                    //this should never happen
                    this.infoNode.innerHTML = '<span class="hardcider-warning-text">Please enter a query value.</span>';
                    this.codedDomainValueNode.focus();
                    return;
                } else if (this._type === 'number' && isNaN(this.numberValueNode.get('value'))) { //TO DO: add range domain
                    this.infoNode.innerHTML = '<span class="hardcider-warning-text">Please enter a query value.</span>';
                    this.numberValueNode.focus();
                    return;
                } else if (this._type === 'date' && this.dateValueNode.get('value') === '') {
                    this.infoNode.innerHTML = '<span class="hardcider-warning-text">Please enter a query value.</span>';
                    this.dateValueNode.focus();
                    return;
                } else if (this.spatialFilterCustomNode.checked && !this._customSpatialFilterGeometry) {
                    this.infoNode.innerHTML = '<span class="hardcider-warning-text">Custom Spatial Filter selected but not set.</span>';
                    return;
                }
            }
            var sfg = null;
            if (this.spatialFilterMapNode.checked) {
                sfg = this.iquert.map.extent.getExtent();
            } else if (this.spatialFilterCustomNode.checked) {
                sfg = this._customSpatialFilterGeometry;
            }
            this.iquert.performQuery(this._layer, this._layerId, this._buildWhere(), sfg);
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
        }
    });
});
