/*
 * Copyright (c) 2014 Ben Fousek
 * https://github.com/btfou/hardcider
 */
define([
    'dojo/_base/declare',
    'dojo/_base/lang',
    'esri/request',
    'dijit/_WidgetBase',
    'dijit/_TemplatedMixin',
    'dijit/_WidgetsInTemplateMixin',
    'dojo/text!hardcider/dijit/templates/AddArcGISService.html',
    'dijit/form/TextBox'
], function (
    declare,
    lang,
    esriRequest,
    WidgetBase,
    TemplatedMixin,
    WidgetsInTemplateMixin,
    template
) {
    'use strict';
    return declare([WidgetBase, TemplatedMixin, WidgetsInTemplateMixin], {
        templateString: template,
        overlayControlContainer: null,
        vectorControlContainer: null,
        onOverlayComplete: null,
        onVectorComplete: null,
        constructor: function (options) {
            options = options || {};
            lang.mixin(this, options);
        },
        postCreate: function () {
            if (!this.overlayControlContainer || !this.vectorControlContainer) {
                console.log('AddArcGISService error::overlayControlContainer and vectorControlContainer are required');
                this.destroy();
                return;
            }
        },
        addLayer: function () {
            var url = this.urlNode,
                name = this.nameNode;
            this.infoNode.innerHTML = '';
            if (!url.get('value')) {
                url.focus();
                this.infoNode.innerHTML = '<span class="hardcider-warning-text">A URL is required.</span>';
                return;
            }
            if (!name.get('value')) {
                name.focus();
                this.infoNode.innerHTML = '<span class="hardcider-warning-text">A layer name is required.</span>';
                return;
            }
            url.set('disabled', true);
            name.set('disabled', true);
            esriRequest({
                url: url.get('value'),
                content: {
                    f: 'json'
                },
                handleAs: 'json'
            }).then(lang.hitch(this, this._handleJsonRequestResult), lang.hitch(this, this._handleJsonRquestError));
        },
        _handleJsonRequestResult: function (r) {
            if (r.supportsDynamicLayers !== undefined && !r.singleFusedMapCache) {
                this.overlayControlContainer.addLayer({
                    type: 'dynamic',
                    url: this.urlNode.get('value'),
                    name: this.nameNode.get('value'),
                    visible: true
                });
                if (this.onOverlayComplete) {
                    this.onOverlayComplete();
                }
                this._reset(true);
            } else if (r.singleFusedMapCache) {
                this.overlayControlContainer.addLayer({
                    type: 'tiled',
                    url: this.urlNode.get('value'),
                    name: this.nameNode.get('value'),
                    visible: true
                });
                if (this.onOverlayComplete) {
                    this.onOverlayComplete();
                }
                this._reset(true);
            } else if (r.defaultResamplingMethod) {
                this.overlayControlContainer.addLayer({
                    type: 'image',
                    url: this.urlNode.get('value'),
                    name: this.nameNode.get('value'),
                    visible: true
                });
                if (this.onOverlayComplete) {
                    this.onOverlayComplete();
                }
                this._reset(true);
            } else if (r.type === 'Feature Layer') {
                this.vectorControlContainer.addLayer({
                    type: 'feature',
                    url: this.urlNode.get('value'),
                    name: this.nameNode.get('value'),
                    visible: true
                });
                if (this.onVectorComplete) {
                    this.onVectorComplete();
                }
                this._reset(true);
            } else {
                this.infoNode.innerHTML = '<span class="hardcider-warning-text">The URL appears to be valid, however it\'s not an ArcGIS service url.</span>';
                this._reset(false);
            }
        },
        _handleJsonRequestError: function (e) {
            console.log(e);
            this.infoNode.innerHTML = '<span class="hardcider-warning-text">The URL is not a valid ArcGIS service.</span>';
            this._reset(false);
        },
        _reset: function (reset) {
            var url = this.urlNode,
                name = this.nameNode;
            url.set('disabled', false);
            name.set('disabled', false);
            if (reset) {
                url.reset();
                name.reset();
            }
        }
    });
});
