/*
 * Copyright (c) 2014 Ben Fousek
 * https://github.com/btfou/hardcider
 */
define([
    'dojo/_base/declare',
    'dojo/_base/array',
    'dojo/_base/lang',
    'dijit/Toolbar',
    'dijit/ToolbarSeparator',
    'dijit/Menu',
    'dijit/MenuItem',
    'dijit/form/DropDownButton',
    'dojo/_base/fx',
    'dojo/fx'
], function(
    declare,
    array,
    lang,
    Toolbar,
    ToolbarSeparator,
    Menu,
    MenuItem,
    DropDownButton,
    baseFx,
    fx
) {
    //'use strict'; no go!
    return declare([Toolbar], {
        currentGroup: null,
        items: [],
        groups: [],
        fadeDuration: 500,
        constructor: function(options) {
            options = options || {};
            if (!options.toolbars) {
                console.log('GroupToolbar::toolbars parameter missing.');
                return;
            }
            if (!options.defaultToolbarGroup) {
                console.log('GroupToolbar::defaultToolbarGroup parameter missing.');
                return;
            }
            this.currentGroup = options.defaultToolbarGroup;
            this.fadeDuration = options.fadeDuration || this.fadeDuration;
            this._options = options;
        },
        postCreate: function() {
            this.inherited(arguments);
            this.selectorMenu = new Menu();
            var toolbars = this._options.toolbars;
            for (var i in toolbars) {
                if (toolbars.hasOwnProperty(i)) {
                    this._addGroup(i, toolbars[i]);
                }
            }
            this.selectorMenu.startup();
            var label = array.filter(this.groups, function(g) {
                return g.group === this.currentGroup;
            }, this);
            this.dropDownButton = new DropDownButton({
                label: label[0].label,
                showLabel: false,
                iconClass: 'iconToolbar',
                title: 'Select a toolbar',
                dropDown: this.selectorMenu
            });
            this.addChild(this.dropDownButton);
            this.addChild(new ToolbarSeparator());
        },
        addGroup: function(params) {
            for (var i in params) {
                if (params.hasOwnProperty(i)) {
                    this._addGroup(i, params[i]);
                }
            }
        },
        _addGroup: function(group, label) {
            this.selectorMenu.addChild(new MenuItem({
                label: label,
                onClick: lang.hitch(this, function() {
                    this.setGroup(group);
                })
            }));
            this.groups.push({
                group: group,
                label: label
            });
        },
        addItem: function(item) {
            if (!item.toolbarGroup) {
                console.log('GroupToolbar::toolbarGroup parameter missing.');
                return;
            }
            this.items.push(item);
            if (item.toolbarGroup === this.currentGroup) {
                this.addChild(item);
            }
        },
        setGroup: function(group) {
            if (this.currentGroup === group) {
                return;
            }
            this.currentGroup = group;
            var fades = [];
            array.forEach(this.items, function(item) {
                var fade = baseFx.fadeOut({
                    node: item.domNode,
                    duration: this.fadeDuration
                });
                fades.push(fade);
            }, this);
            var fadeOut = fx.combine(fades);
            fadeOut._onEnd = lang.hitch(this, function() {
                var label = array.filter(this.groups, function(g) {
                    return g.group === this.currentGroup;
                }, this);
                this.dropDownButton.set('label', label[0].label);
                array.forEach(this.getChildren(), function(child) {
                    if (child.toolbarGroup !== undefined) {
                        this.removeChild(child);
                    }
                }, this);
                array.forEach(this.items, function(item) {
                    if (item.toolbarGroup === group) {
                        this.addChild(item);
                    }
                }, this);
                var fades = [];
                array.forEach(this.items, function(item) {
                    var fade = baseFx.fadeIn({
                        node: item.domNode,
                        duration: this.fadeDuration
                    });
                    fades.push(fade);
                }, this);
                fx.combine(fades).play();
            });
            fadeOut.play();
            this.emit('group-change', {
                group: group
            });
        }
    });
});
