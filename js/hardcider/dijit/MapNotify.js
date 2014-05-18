/*
 * Copyright (c) 2014 Ben Fousek
 * https://github.com/btfou/hardcider
 */
define([
    'dojo/_base/declare',
    'dojo/_base/lang',
    'dojo/_base/fx',
    'dojo/dom-style',
    'dijit/_WidgetBase',
    'dijit/_TemplatedMixin'
], function(
    declare,
    lang,
    baseFx,
    domStyle,
    WidgetBase,
    TemplatedMixin
) {
    return declare([WidgetBase, TemplatedMixin], {
        templateString: '<div class="hardcider-map-notify"><span data-dojo-attach-point="contentNode"></span></div>',
        showing: false,
        duration: 3000,
        fadeDuration: 750,
        constructor: function(options) {
            lang.mixin(this, options);
        },
        postCreate: function() {
            this.inherited(arguments);
        },
        notify: function(msg, duration) {
            if (!msg) {
                return;
            }
            this.contentNode.innerHTML = msg;
            if (this.showing) {
                this.cancel();
            }
            this.show(duration);
        },
        show: function(duration) {
            duration = duration || this.duration;
            var node = this.domNode;
            domStyle.set(node, 'zIndex', 50);
            baseFx.fadeIn({
                node: node,
                duration: this.fadeDuration,
                onEnd: lang.hitch(this, function() {
                    this.timer = setTimeout(lang.hitch(this, function() {
                        this.hide();
                        this.timer = null;
                    }), duration);
                    this.showing = true;
                })
            }).play();
        },
        hide: function() {
            var node = this.domNode;
            baseFx.fadeOut({
                node: node,
                duration: this.fadeDuration,
                onEnd: lang.hitch(this, function() {
                    domStyle.set(node, 'zIndex', -200);
                    this.showing = false;
                })
            }).play();
        },
        cancel: function() {
            if (this.timer) {
                clearTimeout(this.timer);
                this.timer = null;
            }
        }
    });
});
