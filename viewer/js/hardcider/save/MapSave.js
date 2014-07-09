/*
 * Copyright (c) 2014 Ben Fousek
 * https://github.com/btfou/hardcider
 */
define([
    'dojo/_base/declare',
    'dojo/_base/lang',
    'dojo/dom-style',
    'dijit/Dialog',
    'dojo/text!hardcider/save/templates/SaveDialog.html'
], function(
    declare,
    lang,
    domStyle,
    Dialog,
    saveDialogtemplate
) {
    'use strict';
    var saveDialog = declare(Dialog, {
        templateString: template,
        constructor: function(options) {
            options = options || {};
            lang.mixin(this, options);
        },
        postCreate: function() {
            
        }
    });
    
    return {
        
    }
});
