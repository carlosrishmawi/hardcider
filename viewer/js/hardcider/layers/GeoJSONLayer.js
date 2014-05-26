/*
 * Copyright (c) 2014 Ben Fousek
 * https://github.com/btfou/hardcider
 */
define([
    'dojo/_base/declare',
    'dojo/_base/lang',
    'dojo/_base/array',
    'dojo/on',
    'dojo/request',
    'dojo/request/script',
    'esri/layers/GraphicsLayer',
    'esri/graphic',
    'esri/geometry/jsonUtils',
    'esri/symbols/jsonUtils',
    'esri/request'
], function(
    declare,
    lang,
    array,
    on,
    request,
    script,
    GraphicsLayer,
    Graphic,
    geomJsonUtils,
    symJsonUtils,
    esriRequest
) {
    return declare(GraphicsLayer, {
        symbols: {
            point: {
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
            polyline: {
                color: [0, 0, 255, 255],
                width: 3,
                type: 'esriSLS',
                style: 'esriSLSSolid'
            },
            polygon: {
                color: [255, 0, 0, 32],
                outline: {
                    color: [255, 0, 0, 255],
                    width: 3,
                    type: 'esriSLS',
                    style: 'esriSLSSolid'
                },
                type: 'esriSFS',
                style: 'esriSFSSolid'
            }
        },
        geomertyTypes: [],
        constructor: function(options) {
            options = options || {};
            if (!options.url && !options.featureCollection) {
                console.log('GeoJSONLayer error::you must specify a url or a feature collection');
                //check this
                //this.getMap().removeLayer(this);
                return;
            }
            lang.mixin(this, options);
            if (this.url) {
                this._getGeoJson(this.url);
            } else if (this.featureCollection) {
                this._addGeoJson(this.featureCollection);
            }
        },
        _getGeoJson: function(url) {
            esriRequest({
                url: url,
                callback: 'callback',
                handleAs: 'json'
            }).then(lang.hitch(this, this._addGeoJson), lang.hitch(this, function(e) {
                console.log(e);
            }));
        },
        _addGeoJson: function(r) {
            r = r || this.featureCollection;
            if (!window.Terraformer || !window.Terraformer.ArcGIS) {
                console.log('GeoJSONLayer error::Terraformer or Terraformer.ArcGIS are not loaded');
                return;
            }
            var collection = window.Terraformer.ArcGIS.convert(r);
            array.forEach(collection, function(feat) {
                var geom = geomJsonUtils.fromJson(feat.geometry),
                    sym;
                switch (geom.type) {
                    case 'point':
                        sym = symJsonUtils.fromJson(this.symbols.point);
                        break;
                    case 'polyline':
                        sym = symJsonUtils.fromJson(this.symbols.polyline);
                        break;
                    case 'polygon':
                        sym = symJsonUtils.fromJson(this.symbols.polygon);
                        break;
                }
                this.add(new Graphic(geom, sym, feat.attributes));
            }, this);
        }
    });
});
