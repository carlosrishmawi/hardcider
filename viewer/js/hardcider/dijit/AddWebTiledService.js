/*
 * Copyright (c) 2014 Ben Fousek
 * https://github.com/btfou/hardcider
 */
define([
    'dojo/_base/declare',
    'dojo/_base/lang',
    'dijit/_WidgetBase',
    'dijit/_TemplatedMixin',
    'dijit/_WidgetsInTemplateMixin',
    'dojo/text!hardcider/dijit/templates/AddWebTiledService.html',
    'dijit/form/TextBox'
], function (
    declare,
    lang,
    WidgetBase,
    TemplatedMixin,
    WidgetsInTemplateMixin,
    template
) {
    'use strict';
    return declare([WidgetBase, TemplatedMixin, WidgetsInTemplateMixin], {
        templateString: template,
        overlayControlContainer: null,
        onOverlayComplete: null,
        constructor: function (options) {
            options = options || {};
            lang.mixin(this, options);
        },
        postCreate: function () {
            if (!this.overlayControlContainer) {
                console.log('AddWebTiledService error::overlayControlContainer is required');
                this.destroy();
                return;
            }
        },
        addLayer: function () {
            var urlTemplate = this.urlTemplateNode,
                name = this.nameNode,
                subDomainsString = this.subDomainsNode.get('value'),
                subDomains = [];
            if (!urlTemplate.get('value')) {
                urlTemplate.focus();
                this.infoNode.innerHTML = '<span class="hardcider-warning-text">A URL template is required.</span>';
                return;
            }
            if (!name.get('value')) {
                name.focus();
                this.infoNode.innerHTML = '<span class="hardcider-warning-text">A layer name is required.</span>';
                return;
            }
            if (subDomainsString) {
                subDomainsString.replace(/[\s]+/g, '');
                subDomains = subDomainsString.split(',');
            }
            this.overlayControlContainer.addLayer({
                type: 'webTiled',
                template: this.urlTemplateNode.get('value'),
                subDomains: subDomains,
                name: this.nameNode.get('value'),
                visible: true
            });
            if (this.onOverlayComplete) {
                this.onOverlayComplete();
            }
            urlTemplate.reset();
            name.reset();
            this.subDomainsNode.reset();
        }
    });
});
