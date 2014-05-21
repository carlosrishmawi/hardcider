/*
 * Copyright (c) 2014 Ben Fousek
 * https://github.com/btfou/hardcider
 */
define([
    'dojo/_base/declare',
    'dojo/_base/lang',
    'dojo/dom-style',
    'dijit/Dialog',
    'dojo/text!hardcider/dijit/templates/ConfirmDialog.html'
], function(
    declare,
    lang,
    domStyle,
    Dialog,
    template
) {
    return declare(Dialog, {
        templateString: template,
        constructor: function(options) {
            lang.mixin(this, options);
        },
        postCreate: function() {
            this.inherited(arguments);
            if (!this.map || this.map.confirm) {
                console.log('ConfirmDialog:: a map instance is required or map.confirm already exists');
                this.destroy();
                return;
            }
            this.map.confirm = lang.hitch(this, function(message, title) {
                this.confirm(message, title);
            });
            this._onKey = function() {
                return;
            };
            domStyle.set(this.closeButtonNode, 'display', 'none');
        },
        //@param message {String} message (or html) to show
        //@param title {String} title for dialog - defaults to 'Confirm' - single space hides title bar
        confirm: function(message, title) {
            if (title && title !== ' ') {
                domStyle.set(this.titleBar, 'display', 'block');
                this.set('title', title);
            } else if (title === ' ') {
                domStyle.set(this.titleBar, 'display', 'none');
            } else {
                domStyle.set(this.titleBar, 'display', 'block');
                this.set('title', 'Confirm');
            }
            this.messageNode.innerHTML = message;
            this.show();
        },
        //map emit 'confirmed' to listen for user confirmation
        confirmed: function() {
            this.map.emit('confirmed', {
                confirmed: true
            });
            this.hide();
        },
        canceled: function() {
            this.map.emit('confirmed', {
                confirmed: false
            });
            this.hide();
        }
    });
});
