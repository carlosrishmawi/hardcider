/*
 * Copyright (c) 2014 Ben Fousek
 * https://github.com/btfou/hardcider
 */
define([
    'dojo/_base/declare',
    'dojo/_base/lang',
    'dojo/Evented',
    'esri/tasks/IdentifyParameters',
    'esri/tasks/IdentifyTask',
    'esri/tasks/query',
    'esri/tasks/QueryTask',
    'hardcider/iquert/Results',
    'hardcider/iquert/Query',
    'hardcider/iquert/QueryBuilder'
], function(
    declare,
    lang,
    Evented,
    IdentifyParams,
    IdentifyTask,
    Query,
    QueryTask,
    ResultsWidget,
    QueryWidget,
    QueryBuilderWidget
) {
    'use strict';
    return declare(Evented, {
        map: null,
        draw: null,
        resultsLayer: null,
        constructor: function(options) {
            lang.mixin(this, options);
            this.resultsLayer = this.map.getLayer(this.resultsLayerId);
            if (this.resultsNode) {
                this.resultsWidget = new ResultsWidget({
                    map: this.map,
                    iquert: this,
                    layer: this.resultsLayer
                }, this.resultsNode);
            }
            if (this.queryNode) {
                this.queryWidget = new QueryWidget({
                    iquert: this
                }, this.queryNode);
            }
            if (this.queryBuilderNode) {
                this.queryBuilderWidget = new QueryBuilderWidget({
                    iquert: this
                }, this.queryBuilderNode);
            }
        },
        identify: function(layer, type, layerId) {
            this.currentIdentify = {
                layer: layer,
                type: type,
                layerId: layerId
            };
            if (this.resultsWidget) {
                this.resultsWidget.clear();
            }
            if (this._identifyOnDrawEnd) {
                this._identifyOnDrawEnd.remove();
                this._identifyOnDrawEnd = null;
            }
            type = type || 'point';
            var name;
            if (layerId) {
                name = layer.layerInfos[layerId].name;
            } else {
                name = layer.layerParams.name;
            }
            switch (type) {
                case 'point':
                    this.map.setDrawTooltips({
                        addPoint: 'Click to identify'
                    });
                    this.map.notify('Identify ' + name + ' by Point');
                    break;
                case 'extent':
                    this.map.setDrawTooltips({
                        freehand: 'Press down and drag to identify'
                    });
                    this.map.notify('Identify ' + name + ' by Extent');
                    break;
                case 'polygon':
                    this.map.setDrawTooltips({
                        start: 'Click to start',
                        resume: 'Click to continue',
                        complete: 'Click to continue or double-click to finish and identify'
                    });
                    this.map.notify('Identify ' + name + ' by Polygon');
                    break;
                default:
                    break;
            }
            this.map.setMapCursor('crosshair');
            this.map.drawToolbar.activate(type);
            this._identifyOnDrawEnd = this.map.drawToolbar.on('draw-end', lang.hitch(this, function(result) {
                if (this.resultsWidget) {
                    this.resultsWidget.infoNode.innerHTML = '<i class="fa fa-spinner fa-spin"></i> Identify in progress...';
                }
                if (this.showResults) {
                    this.showResults();
                }
                this.map.drawToolbar.deactivate();
                this._identifyOnDrawEnd.remove();
                this._identifyOnDrawEnd = null;
                this.map.eventEnd();
                var ip = new IdentifyParams();
                ip.tolerance = (type === 'point') ? 6 : 1;
                ip.returnGeometry = true;
                if (layerId !== undefined) {
                    ip.layerIds = [layerId];
                    ip.layerOption = 'all';
                } else {
                    ip.layerOption = 'visible';
                }
                ip.mapExtent = this.map.extent;
                ip.geometry = result.geometry;
                ip.width = this.map.width;
                ip.height = this.map.height;
                var it = new IdentifyTask((layer._getToken()) ? layer.url + '?token=' + layer._getToken() : layer.url);
                it.execute(ip, lang.hitch(this, function(r) {
                    if (this.resultsWidget) {
                        this.resultsWidget._identifyResults(r, layer, layerId);
                    } else {
                        this.emit('identify-complete', {
                            results: r,
                            layer: layer,
                            layerId: layerId
                        });
                    }
                }), lang.hitch(this, function(e) {
                    console.log(e);
                    this.emit('identify-error', e);
                    this.map.alert('An error occurred performing identify.', 'Error');
                }));
            }));
            this.map.eventAdd(this._identifyOnDrawEnd);
        },
        repeatIdentify: function() {
            var ci = this.currentIdentify;
            if (ci) {
                this.identify(ci.layer, ci.type, ci.layerId);
            }
        },
        query: function(layer, layerId) {
            if (!this.queryWidget) {
                return;
            }
            this.queryWidget.setQuery(layer, layerId);
            if (this.showQuery) {
                this.showQuery();
            }
        },
        queryBuilder: function(layer, layerId) {
            if (!this.queryBuilderWidget) {
                return;
            }
            this.queryBuilderWidget.setQuery(layer, layerId);
            if (this.showQueryBuilder) {
                this.showQueryBuilder();
            }
        },
        performQuery: function(layer, layerId, where, spatialFilterGeometry) {
            var rw = this.resultsWidget,
                q = new Query();
            if (rw) {
                rw.clear();
                if (this.showResults) {
                    this.showResults();
                }
                rw.infoNode.innerHTML = '<i class="fa fa-spinner fa-spin"></i> Query in progress...';
            }
            q.returnGeometry = true;
            q.outFields = ['*'];
            if (spatialFilterGeometry) {
                q.geometry = spatialFilterGeometry;
            }
            q.where = where;
            q.outSpatialReference = this.map.spatialReference;
            var qt = new QueryTask((layer._getToken()) ? layer.url + '/' + layerId + '?token=' + layer._getToken() : layer.url + '/' + layerId);
            qt.execute(q, lang.hitch(this, function(r) {
                if (rw) {
                    rw._queryResults(r, layer, layerId);
                } else {
                    this.emit('query-complete', {
                        results: r,
                        layer: layer,
                        layerId: layerId
                    });
                }
            }), lang.hitch(this, function(e) {
                console.log(e);
                if (rw) {
                    rw.infoNode.innerHTML = '<span class="hardcider-warning-text">A query error has occurred.</span>';
                    this.map.alert('An error occurred performing query.', 'Error');
                }
                this.emit('query-error', e);
            }));
        }
    });
});
