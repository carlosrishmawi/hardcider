/*
 * Copyright (c) 2014 Ben Fousek
 * https://github.com/btfou/hardcider
 *
 * a special thanks to Rene Rubalcava @odoenet
 */
define([
    'dojo/Deferred',
    'dojo/_base/declare',
    'dojo/_base/lang',
    'xtras/pouchdb-2.1.0.min',
    'xtras/es5-shim.min'
], function(
    Deferred,
    declare,
    lang,
    pdb
) {
    'use strict';
    return declare(null, {
        _db: null,
        constructor: function(options) {
            if (!window.PouchDB) {
                window.PouchDB = pdb;
            }
            if (options.dbName) {
                this.initDB(options.dbName);
            }
        },
        initDB: function(dbName) {
            this._db = new window.PouchDB(dbName);
        },
        addDoc: function(doc) {
            var deferred = new Deferred();
            this._db.post(doc, function(err, result) {
                if (!err) {
                    deferred.resolve(result);
                } else {
                    deferred.reject(err);
                }
            });
            return deferred.promise;
        },
        updateDoc: function(id, doc) {
            var deferred = new Deferred();
            this._db.get(id, lang.hitch(this, function(err, response) {
                if (!err) {
                    this._db.put(doc, id, response._rev, function(err, response) {
                        if (!err) {
                            deferred.resolve(response);
                        } else {
                            deferred.reject(err);
                        }
                    });
                } else {
                    deferred.reject(err);
                }
            }));
            return deferred.promise;
        },
        removeDoc: function(id) {
            var deferred = new Deferred();
            this._db.get(id, lang.hitch(this, function(err, response) {
                if (!err) {
                    this._db.remove(response, function(err, response) {
                        if (!err) {
                            deferred.resolve(response);
                        } else {
                            deferred.reject(err);
                        }
                    });
                } else {
                    deferred.reject(err);
                }
            }));
            return deferred.promise;
        },
        getDoc: function(id) {
            var deferred = new Deferred();
            this._db.get(id, function(err, doc) {
                if (!err) {
                    deferred.resolve(doc);
                } else {
                    deferred.reject(err);
                }
            });
            return deferred.promise;
        },
        getAllDocs: function(include_docs) {
            var deferred = new Deferred();
            this._db.allDocs({
                include_docs: include_docs
            }, function(err, response) {
                if (!err) {
                    deferred.resolve(response);
                } else {
                    deferred.reject(err);
                }
            });
            return deferred.promise;
        },
        query: function(fun) {
            var deferred = new Deferred();
            this._db.query(fun, function(err, response) {
                if (!err) {
                    deferred.resolve(response);
                } else {
                    deferred.reject(err);
                }
            });
            return deferred.promise;
        }
    });
});
