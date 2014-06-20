/*
 * Copyright (c) 2014 Ben Fousek
 * https://github.com/btfou/hardcider
 */
define([
    'dojo/_base/declare',
    'dojo/_base/lang',
    'dojo/_base/array',
    'dojo/dom-class',
    'dojo/dom-construct',
    'dojo/json',
    'dojo/date/locale',
    'dijit/_WidgetBase',
    'dijit/_TemplatedMixin',
    'dijit/_WidgetsInTemplateMixin',
    'esri/request',
    'esri/tasks/PrintTask',
    'esri/tasks/PrintParameters',
    'esri/tasks/PrintTemplate',
    'esri/tasks/LegendLayer',
    'dojo/text!hardcider/dijit/templates/Print.html',
    'dijit/form/Select',
    'dijit/form/TextBox',
    'dijit/form/Textarea'
], function(
    declare,
    lang,
    arrayUtils,
    domClass,
    domConst,
    JSON,
    locale,
    WidgetBase,
    TemplatedMixin,
    WidgetsInTemplateMixin,
    esriRequest,
    PrintTask,
    PrintParameters,
    PrintTemplate,
    LegendLayer,
    template
) {
    'use strict';
    return declare([WidgetBase, TemplatedMixin, WidgetsInTemplateMixin], {
        templateString: template,
        title: 'Print',
        clickPrint: null,
        map: null,
        printUrl: null,
        templates: null,
        format: 'PDF',
        constructor: function(options) {
            options = options || {};
            lang.mixin(this, options);
            if (!this.map) {
                console.log('UNWCPrint error::map is required');
                return;
            }
            if (!this.printUrl) {
                console.log('UNWCPrint error::printUrl is required');
                return;
            }
            if (!this.templates) {
                console.log('UNWCPrint error::templates is required');
                return;
            }
            //print task
            this.printTask = new PrintTask(this.printUrl);
            //print template
            this.printTemplate = lang.mixin(new PrintTemplate(), {
                layoutOptions: {
                    customTextElements: [],
                    legendLayers: []
                },
                showAttribution: false
            });
            //print parameters
            this.printParameters = lang.mixin(new PrintParameters(), {
                map: this.map,
                template: this.printTemplate
            });

        },
        postCreate: function() {
            //add templates to select
            for (var i in this.templates) {
                if (this.templates.hasOwnProperty(i)) {
                    this.layoutNode.addOption({
                        label: i,
                        value: this.templates[i]
                    });
                }
            }
        },
        print: function() {
            //under way
            this._printing();
            //overlay legends
            //all overlays which are visible
            arrayUtils.forEach(this.map.layerIds, function(id) {
                if (this.map.getLayer(id).visible) {
                    this.printTemplate.layoutOptions.legendLayers.push(lang.mixin(new LegendLayer(), {
                        layerId: id
                    }));
                }
            }, this);
            //graphic layer legends
            //currently only feature layers
            //this may be a problem with graphic layers being used for GeoJSON, etc
            arrayUtils.forEach(this.map.graphicLayerIds, function(id) {
                var layer = this.map.getLayer(id);
                if (layer.visible && layer.declaredClass !== 'esri.layers.GraphicsLayer') {
                    var legendLayer = new LegendLayer();
                    legendLayer.layerId = id;
                    this.printTemplate.layoutOptions.legendLayers.push(legendLayer);
                }
            }, this);
            //custom text elements
            this.printTemplate.layoutOptions.customTextElements.push({
                'Title': this.mapTitleNode.get('value') || 'Nehalem Viewer'
            });
            this.printTemplate.layoutOptions.customTextElements.push({
                'Notes': this.mapNotesNode.get('value') || 'Map notes.'
            });
            //print layout
            this.printTemplate.layout = this.layoutNode.get('value');
            //use setRequestPreCallback to modify Web_Map_as_JSON
            esriRequest.setRequestPreCallback(lang.hitch(this, function(args) {
                //parse Web_Map_as_JSON
                var webMapJson = JSON.parse(args.content.Web_Map_as_JSON);
                //remove map.graphics
                webMapJson.operationalLayers.splice(arrayUtils.indexOf(webMapJson.operationalLayers, this.map.graphics.id), 1);
                //remove non-print layers
                arrayUtils.forEach(webMapJson.operationalLayers, function(ol) {
                    var layer = this.map.getLayer(ol.id);
                    if (layer.print && layer.print === false) {
                        webMapJson.operationalLayers.splice(arrayUtils.indexOf(webMapJson.operationalLayers, ol), 1);
                    }
                }, this);
                //strip graphic layer attributes and and info templates
                arrayUtils.forEach(webMapJson.operationalLayers, function(ol) {
                    if (ol.featureCollection && ol.featureCollection.layers.length) {
                        arrayUtils.forEach(ol.featureCollection.layers, function(layer) {
                            arrayUtils.forEach(layer.featureSet.features, function(feature) {
                                if (feature.attributes) {
                                    delete feature.attributes;
                                }
                                if (feature.infoTemplate) {
                                    delete feature.infoTemplate;
                                }
                            });
                        });
                    }
                });
                //stringify Web_Map_as_JSON
                args.content.Web_Map_as_JSON = JSON.stringify(webMapJson);
                //return args
                return args;
            }));
            //execute the task
            this.printTask.execute(this.printParameters, lang.hitch(this, this._printResult), lang.hitch(this, this._printError));
            //reset setRequestPreCallback
            esriRequest.setRequestPreCallback();
        },
        _printResult: function(r) {
            //create div with link to result
            domConst.create('div', {
                style: 'margin:6px 0;',
                innerHTML: '<a href="' + r.url + '?_t=' + new Date().getTime() + '" target="_blank">' + this.mapTitleNode.get('value') + '</a>&nbsp;&nbsp;&nbsp;<span class="hardcider-muted-text">' + locale.format(new Date(), {
                    formatLength: 'short'
                }) + '</span>'
            }, this.resultsNode, 'last');
            //reset
            this._reset();
        },
        _printError: function(e) {
            //map alert error
            this.map.alert('An error occurred performing the print task.', 'Print Error');
            //reset
            this._reset();
        },
        _printing: function() {
            this.layoutNode.set('disabled', true);
            this.mapTitleNode.set('disabled', true);
            this.mapNotesNode.set('disabled', true);
            domClass.add(this.printNode, 'hardcider-display-none');
            domClass.remove(this.printingNode, 'hardcider-display-none');
        },
        _reset: function() {
            this.layoutNode.set('disabled', false);
            this.mapTitleNode.set('disabled', false);
            this.mapTitleNode.reset();
            this.mapNotesNode.set('disabled', false);
            this.mapNotesNode.reset();
            domClass.add(this.printingNode, 'hardcider-display-none');
            domClass.remove(this.printNode, 'hardcider-display-none');
        }
    });
});
