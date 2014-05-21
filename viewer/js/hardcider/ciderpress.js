/*
 * Copyright (c) 2014 Ben Fousek
 * https://github.com/btfou/hardcider
 */
define([
    'dojo/_base/declare',
    'dojo/_base/window',
    'dojo/_base/lang',
    'dojo/on',
    'dojo/dom',
    'dojo/dom-construct',
    'dojo/dom-style',
    'dojo/dom-class',
    'dojo/dom-attr',
    'dijit/layout/BorderContainer',
    'dijit/layout/TabContainer',
    'dijit/layout/AccordionContainer',
    'dijit/layout/ContentPane',
    'hardcider/dijit/GroupToolbar',
    'dojox/layout/Dock'
], function(
    declare,
    win,
    lang,
    on,
    dom,
    domConst,
    domStyle,
    domClass,
    domAttr,
    BC,
    TC,
    AC,
    CP,
    GT,
    Dock
) {
    'use strict';
    return declare(null, {
        node: null,
        constructor: function(node) {
            this.node = node;
        },
        press: function() {
            this.bc = new BC({
                liveSplitters: true,
                design: 'sidebar',
                gutters: false,
                style: 'width:100%;height:100%;z-index:1;'
            }, this.node);
            this.bc.startup();
            this.left = new TC({
                id: 'left',
                region: 'left',
                splitter: true,
                style: 'width:340px;z-index:1;',
                minSize: 260
            });
            this.bc.addChild(this.left);
            this.layersTab = new TC({
                title: 'Layers',
                nested: true
            });
            this.layersTab.addChild(new CP({
                title: 'Overlays',
                content: '<div id="layers-overlays"></div>'
            }));
            this.layersTab.addChild(new CP({
                title: 'Features',
                content: '<div id="layers-features"></div>'
            }));
            this.addLayersTab = new AC({
                title: 'Add Layers',
                nested: true
            });
            this.addLayersTab.addChild(new CP({
                title: 'ArcGIS Dynamic/Tiled',
                content: '<div id="add-layers-arcgis-dynamic-tiled"></div>'
            }));
            this.addLayersTab.addChild(new CP({
                title: 'ArcGIS Feature',
                content: '<div id="add-layers-arcgis-feature"></div>'
            }));
            this.addLayersTab.addChild(new CP({
                title: 'Web Tiled',
                content: '<div id="add-layers-web-tiled"></div>'
            }));
            this.addLayersTab.addChild(new CP({
                title: 'CSV File',
                content: '<div id="add-layers-csv"></div>'
            }));
            this.addLayersTab.addChild(new CP({
                title: 'GeoJSON',
                content: '<div id="add-layers-geojson"></div>'
            }));
            this.addLayersTab.addChild(new CP({
                title: 'Shape File',
                content: '<div id="add-layers-shape"></div>'
            }));
            this.addLayersTab.addChild(new CP({
                title: 'Geodatabase (GDB) Feature Classes',
                content: '<div id="add-layers-gdb"></div>'
            }));
            this.layersTab.addChild(this.addLayersTab);
            this.left.addChild(this.layersTab);
            this.iquertTab = new TC({
                title: 'Data',
                nested: true
            });
            this.iquertTab.addChild(new CP({
                id: 'iquert-results-tab',
                title: 'Results',
                content: '<div id="iquert-results"></div>'
            }));
            this.iquertTab.addChild(new CP({
                id: 'iquert-query-tab',
                title: 'Query',
                content: '<div id="iquert-query"></div>'
            }));
            this.iquertTab.addChild(new CP({
                id: 'iquert-query-builder-tab',
                title: 'Query Builder',
                content: '<div id="iquert-query-builder"></div>'
            }));
            this.left.addChild(this.iquertTab);
            this.editorTab = new TC({
                title: 'Editor',
                nested: true
            });
            this.editorTab.addChild(new CP({
                title: 'Editor',
                content: '<div id="editor-editor"></div>'
            }));
            this.editorTab.addChild(new CP({
                title: 'Attributes',
                content: '<div id="editor-attributes"></div>'
            }));
            this.editorTab.addChild(new CP({
                title: 'Attachements',
                content: '<div id="editor-attachements"></div>'
            }));
            this.left.addChild(this.editorTab);
            this.toolsTab = new TC({
                title: 'Tools',
                nested: true
            });
            this.toolsTab.addChild(new CP({
                title: 'Measure',
                content: '<div id="measure"></div>'
            }));
            this.left.addChild(this.toolsTab);
            this.right = new TC({
                id: 'right',
                region: 'right',
                splitter: true,
                style: 'width:320px;z-index:1;',
                minSize: 260
            });
            this.bc.addChild(this.right);
            this.bottom = new TC({
                id: 'bottom',
                region: 'bottom',
                className: 'bottom-region-tabs',
                tabPosition: 'bottom',
                splitter: true,
                style: 'height:240px;z-index:1;',
                minSize: 180
            });
            this.bc.addChild(this.bottom);

            //bottom placeholder
            this.bottom.addChild(new CP({
                title: 'Hello',
                content: 'I\'m just a placeholder. My parent is a good place for custom tasks and such.'
            }));
            this.bottom.addChild(new CP({
                title: 'World',
                closable: true,
                content: 'I\'m just a placeholder. My parent is a good place for custom tasks and such. And I\'m closable.'
            }));
            //..bottom placeholder

            this.center = new CP({
                id: 'map-panel',
                region: 'center',
                splitter: true,
                style: 'padding:0;overflow:hidden;z-index:1;'
            });
            this.bc.addChild(this.center);
            domConst.create('div', {
                id: 'geocoder'
            }, this.center.domNode);
            this.toolbar = new GT({
                id: 'toolbar',
                region: 'top',
                splitter: false,
                style: 'border-bottom:none;',
                defaultToolbarGroup: 'map',
                toolbars: {
                    'map': 'Map',
                    'tasks': 'Tasks',
                    'draw': 'Draw'
                }
            });
            this.bc.addChild(this.toolbar);
            this._hideRegion(this.right);
            this._hideRegion(this.bottom);
            this.dock = new Dock({
                style: 'position:absolute;bottom:0;right:0;height:0px;width:0px;display:none;z-index:0;border:none;'
            }, domConst.create('div', null, win.body()));
            this.bc.resize();
            var bt = domConst.create('div', {
                id: 'hardcider-region-toggle-bottom',
                state: 'closed',
                region: 'bottom',
                title: 'Open Pane',
                innerHTML: '<i class="fa fa-chevron-up"></i>'
            }, this.center.domNode);
            domClass.add(bt, ['region-toggle region-toggle-bottom']);
            on(bt, 'click', lang.hitch(this, function() {
                this.toggleRegion(this.bottom);
            }));
            var lt = domConst.create('div', {
                id: 'hardcider-region-toggle-left',
                state: 'open',
                region: 'left',
                title: 'Close Pane',
                innerHTML: '<i class="fa fa-chevron-left"></i>'
            }, this.center.domNode);
            domClass.add(lt, ['region-toggle region-toggle-left']);
            on(lt, 'click', lang.hitch(this, function() {
                this.toggleRegion(this.left);
            }));
        },
        toggleRegion: function(region, force) {
            var id = region.id,
                display = domStyle.get(id, 'display');
            if (force === 'show' && display === 'block') {
                return;
            } else if (force === 'hide' && display === 'none') {
                return;
            }
            if (display === 'block') {
                this._hideRegion(region);
            } else {
                this._showRegion(region);
            }
        },
        _regionToggles: {
            left: {
                open: '<i class="fa fa-chevron-left"></i>',
                closed: '<i class="fa fa-chevron-right"></i>'
            },
            bottom: {
                open: '<i class="fa fa-chevron-down"></i>',
                closed: '<i class="fa fa-chevron-up"></i>'
            },
            right: {
                open: '<i class="fa fa-chevron-right"></i>',
                closed: '<i class="fa fa-chevron-left"></i>'
            },
            top: {
                open: '<i class="fa fa-chevron-up"></i>',
                closed: '<i class="fa fa-chevron-down"></i>'
            }
        },
        _showRegion: function(region) {
            var id = region.id,
                toggle = dom.byId('hardcider-region-toggle-' + id);
            domStyle.set(id, 'display', 'block');
            domStyle.set(id + '_splitter', 'display', 'block');
            if (toggle) {
                domAttr.set(toggle, 'title', 'Close Pane');
                domAttr.set(toggle, 'state', 'open');
                var state = domAttr.get(toggle, 'state'),
                    tRegion = domAttr.get(toggle, 'region');
                toggle.innerHTML = this._regionToggles[tRegion][state];
            }
            this.bc.resize();
        },
        _hideRegion: function(region) {
            var id = region.id,
                toggle = dom.byId('hardcider-region-toggle-' + id);
            domStyle.set(id, 'display', 'none');
            domStyle.set(id + '_splitter', 'display', 'none');
            if (toggle) {
                domAttr.set(toggle, 'title', 'Open Pane');
                domAttr.set(toggle, 'state', 'closed');
                var state = domAttr.get(toggle, 'state'),
                    tRegion = domAttr.get(toggle, 'region');
                toggle.innerHTML = this._regionToggles[tRegion][state];
            }
            this.bc.resize();
        }
    });
});
