/*
 * Copyright (c) 2014 Ben Fousek
 * https://github.com/btfou/hardcider
 */
define([
    'dojo/_base/declare',
    'dojo/_base/lang',
    'dojo/dom-style',
    'dijit/Dialog',
    'dojo/text!hardcider/dijit/templates/AlertDialog.html'
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
            if (!this.map || this.map.alert) {
                console.log('AlertDialog:: a map instance is required or map.alert already exists');
                this.destroy();
                return;
            }
            this.map.alert = lang.hitch(this, function(message, title) {
                this.alert(message, title);
            });
            this._onKey = function() {
                return;
            };
            domStyle.set(this.closeButtonNode, 'display', 'none');
        },
        //@param message {String} message (or html) to show
        //@param title {String} title for dialog - defaults to 'Alert' - single space hides title bar
        alert: function(message, title) {
            if (title && title !== ' ') {
                domStyle.set(this.titleBar, 'display', 'block');
                this.set('title', title);
            } else if (title === ' ') {
                domStyle.set(this.titleBar, 'display', 'none');
            } else {
                domStyle.set(this.titleBar, 'display', 'block');
                this.set('title', 'Alert');
            }
            this.messageNode.innerHTML = message;
            this.show();
        },
        //map emit 'alerted' to listen for user response to alert
        alerted: function() {
            this.map.emit('alerted', null);
            this.hide();
        }
    });
});
