/*
 * Copyright (c) 2014 Ben Fousek
 * https://github.com/btfou/hardcider
 */
define([
    'dojo/_base/array',
    'dojo/_base/lang',
    'dojo/promise/all',
    'dojo/Deferred',
    'esri/request'
], function(
    array,
    lang,
    all,
    Deferred,
    esriRequest
) {
    'use strict';
    return {
        //get legend
        //@param layer {Object} - ags dynamic or feature layer
        getLegend: function(layer) {
            var deferred = new Deferred();
            this._getLegend(deferred, layer);
            return deferred.promise;
        },
        //private method for making legend request and resolving deferred
        _getLegend: function(deferred, layer) {
            var url = layer.url;
            if (!isNaN(parseInt(url.charAt(url.length - 1), 10))) {
                url = url.replace('FeatureServer', 'MapServer');
                url = url.substring(0, url.length - 2);
            }
            esriRequest({
                url: url + '/legend',
                callbackParamName: 'callback',
                content: {
                    f: 'json',
                    token: (typeof layer._getToken === 'function') ? layer._getToken() : null
                }
            }, {
                usePost: this.usePost
            }).then(function(r) {
                deferred.resolve(r);
            }, function(e) {
                console.log(e);
                deferred.reject('getLegend::an error occurred retrieving legend');
            });
        },

        //get service info
        //@param url {String} - service url
        getServiceInfo: function(url) {
            var deferred = new Deferred();
            esriRequest({
                url: url,
                callbackParamName: 'callback',
                content: {
                    f: 'json'
                }
            }).then(function(r) {
                deferred.resolve(r);
            }, function(e) {
                console.log(e);
                deferred.reject('getServiceInfo::' + e);
            });
            return deferred.promise;
        },

        //get layer info method
        //@param layer {Object} - esri dynamic layer or {url: 'some_mapservice_endpoint'}
        //@param layerId {Integer} - layer id for which to request info
        //@param addToLayer {Boolean} - if true the result will be appended as layer.layerInfos[layerId].info
        getLayerInfo: function(layer, layerId, addToLayer) {
            var deferred = new Deferred();
            this._getLayerInfo(deferred, layer, layerId, addToLayer);
            return deferred.promise;
        },

        //private method for requesting and handling layer info
        _getLayerInfo: function(deferred, layer, layerId, addToLayer) {
            if (!layer) {
                deferred.reject('getLayerInfo::"layer" argument missing');
                return;
            } else if (layerId === undefined) {
                deferred.reject('getLayerInfo::"layerId" argument missing');
                return;
            }
            esriRequest({
                url: layer.url + '/' + layerId,
                callbackParamName: 'callback',
                content: {
                    f: 'json',
                    token: (typeof layer._getToken === 'function') ? layer._getToken() : null
                }
            }, {
                usePost: true
            }).then(function(r) {
                if (addToLayer && layer.layerInfos) {
                    layer.layerInfos[layerId].info = r;
                }
                deferred.resolve(r);
            }, function(e) {
                console.log(e);
                deferred.reject('_getLayerInfo::an error occurred retrieving layer info');
            });
        },

        //get unique field values
        //@param layer {Object} - esri dynamic layer
        //@param layerId {Integer} - layer id for which the field belongs
        //@param field {String} - the field name
        //@param limit {Number} - the limit 
        getUniqueFieldValues: function(layer, layerId, field, limit) {
            var deferred = new Deferred(),
                time = new Date().getTime();
            limit = limit || layer.maxRecordCount * 8;
            esriRequest({
                url: layer.url + '/' + layerId + '/query',
                callbackParamName: 'callback',
                content: {
                    f: 'json',
                    where: time + ' = ' + time,
                    returnGeometry: false,
                    returnIdsOnly: true,
                    token: (typeof layer._getToken === 'function') ? layer._getToken() : null
                }
            }, {
                usePost: true
            }).then(lang.hitch(this, function(r) {
                if (r.objectIds.length > limit) {
                    deferred.reject('getUniqueFieldValues::objectids are greater than the limit');
                    return;
                } else if (r.objectIds.length <= layer.maxRecordCount) {
                    this._getUniqueFieldValues(deferred, [r.objectIds], layer, layerId, field);
                } else {
                    this._getUniqueFieldValues(deferred, this._chunkArray(r.objectIds, layer.maxRecordCount), layer, layerId, field);
                }
            }), lang.hitch(this, function(e) {
                console.log(e);
                deferred.reject('getUniqueFieldValues::an error occurred retrieving objectids');
            }));
            return deferred.promise;
        },

        //private method for requesting and handling unique values
        _getUniqueFieldValues: function(deferred, objectIdArrays, layer, layerId, field) {
            var promises = [];
            array.forEach(objectIdArrays, function(objectIdArray) {
                var def = esriRequest({
                    url: layer.url + '/' + layerId + '/query',
                    callbackParamName: 'callback',
                    content: {
                        f: 'json',
                        objectIds: objectIdArray.join(),
                        outFields: field,
                        returnDistinctValues: true,
                        returnGeometry: false,
                        token: (typeof layer._getToken === 'function') ? layer._getToken() : null
                    }
                }, {
                    usePost: true
                });
                promises.push(def.promise);
            }, this);
            all(promises).then(lang.hitch(this, function(results) {
                var uniqueValues = [],
                    fieldType = null;
                array.forEach(results, function(result, index) {
                    if (index === 0) {
                        fieldType = result.fields[0].type;
                    }
                    array.forEach(result.features, function(feature) {
                        var value = feature.attributes[field];
                        if (array.indexOf(uniqueValues, value) === -1 && value !== null) {
                            uniqueValues.push(value);
                        }
                    });
                });
                if (fieldType === 'esriFieldTypeString') {
                    uniqueValues.sort();
                } else if (fieldType === 'esriFieldTypeDate') {
                    var dates = [];
                    array.forEach(uniqueValues, function(uniqueValue) {
                        var date = new Date(uniqueValue),
                            year = date.getFullYear(),
                            m = date.getMonth() + 1,
                            month = (m < 10) ? '0' + m : m,
                            d = date.getDate(),
                            day = (d < 10) ? '0' + d : d,
                            h = date.getHours(),
                            hours = (h < 10) ? '0' + h : h,
                            min = date.getMinutes(),
                            minutes = (min < 10) ? '0' + min : min,
                            s = date.getSeconds(),
                            seconds = (s < 10) ? '0' + s : s;
                        dates.push(year + '/' + month + '/' + day + ' ' + hours + ':' + minutes + ':' + seconds);
                    });
                    uniqueValues = dates;
                    uniqueValues.sort();
                } else {
                    uniqueValues.sort(function(a, b) {
                        return a - b;
                    });
                }
                deferred.resolve(uniqueValues);
            }), lang.hitch(this, function(e) {
                console.log(e);
                deferred.reject('_getUniqueFieldValues::an error occurred retrieving field values');
            }));
        },

        //private method for chunking an array (a) into an array of arrays of length (b)
        _chunkArray: function(a, b) {
            var r = [];
            for (var i = 0; i < a.length; i += b) {
                r.push(a.slice(i, i + b));
            }
            return r;
        }
    };
});
