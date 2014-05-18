/*
 * Copyright (c) 2014 Ben Fousek
 * https://github.com/btfou/hardcider
 */
define([
    'dojo/_base/declare',
    'dojo/_base/lang',
    'dojo/_base/array',
    'dojo/on',
    'dojo/dom-construct',
    'dojo/date/locale',
    'dijit/_WidgetsInTemplateMixin',
    'dijit/Dialog',
    'dijit/Menu',
    'dijit/MenuItem',
    'dojo/promise/all',
    'hardcider/utility/pouch-db-utils',
    'hardcider/utility/couch-db-utils',
    'dojo/store/Memory',
    'dgrid/OnDemandGrid',
    'dgrid/Selection',
    'dgrid/Keyboard',
    'dgrid/extensions/ColumnResizer',
    'dojo/text!hardcider/draw/templates/NewProjectDialog.html',
    'dojo/text!hardcider/draw/templates/LoadProjectDialog.html',
    'dijit/form/TextBox',
    'dijit/form/ValidationTextBox',
    'dijit/form/Textarea',
    'dijit/form/Select',
    'dijit/form/CheckBox'
], function(
    declare,
    lang,
    array,
    on,
    domConst,
    locale,
    WidgetsInTemplateMixin,
    Dialog,
    Menu,
    MenuItem,
    all,
    PouchDbUtils,
    couchDbUtils,
    Memory,
    OnDemandGrid,
    Selection,
    Keyboard,
    ColumnResizer,
    NewProjectTemplate,
    LoadProjectTemplate
) {
    return declare(null, {
        draw: null,
        couchDbUrl: null,
        couchDbGetProjectsUrl: null,
        pouchDbName: null,
        currentProject: null,
        constructor: function(options) {
            lang.mixin(this, options);
            if (!this.draw) {
                console.log('DrawProjects::draw option (an instance of hardcider/draw/Draw) is required');
                return;
            }
            if (this.pouchDbName) {
                this._pouch = new PouchDbUtils({
                    dbName: this.pouchDbName
                });
            }
            if (this.couchDbUrl) {
                couchDbUtils.validateDatabase(this.couchDbUrl).then(lang.hitch(this, function() {
                    this._couch = true;
                }));
            }
            this.menu = new Menu();
            this.menu.addChild(new MenuItem({
                label: 'New Project',
                onClick: lang.hitch(this, function() {
                    this.showNewProjectDialog();
                })
            }));
            this.menu.addChild(new MenuItem({
                label: 'Load Project',
                onClick: lang.hitch(this, function() {
                    this.showLoadProjectDialog();
                })
            }));
            this.menu.addChild(new MenuItem({
                label: 'Save Project',
                onClick: lang.hitch(this, function() {
                    this.saveProject();
                })
            }));
        },
        showNewProjectDialog: function() {
            if (!this.newProjectDialog) {
                var npd = this.newProjectDialog = declare([Dialog, WidgetsInTemplateMixin], {
                    templateString: NewProjectTemplate
                })({
                    title: 'New Drawing Project'
                });
                on(npd.createNode, 'click', lang.hitch(this, function() {
                    if (npd.nameNode.validate()) {
                        this._createNewProject(npd.locationNode.get('value'), npd.includeNode.checked, {
                            name: npd.nameNode.get('value'),
                            description: npd.descriptionNode.get('value') || 'No description.',
                            location: npd.locationNode.get('value'),
                            timestamp: new Date().getTime()
                        });
                    }
                }));
                npd._cancel = function() {
                    npd.hide();
                    npd.nameNode.reset();
                    npd.descriptionNode.reset();
                    npd.includeNode.set('checked', true);
                };
                on(npd.cancelNode, 'click', function() {
                    npd._cancel();
                });
            }
            this.newProjectDialog.show();
        },
        _createNewProject: function(location, include, save) {
            if (location === 'Local' && !this._pouch) {
                this.draw.map.alert('This application is not configured for saving drawing data locally.', 'Error');
                return;
            } else if (location === 'Server' && !this._couch) {
                this.draw.map.alert('This application is not configured for saving drawing data to a server.', 'Error');
                return;
            }
            if (include) {
                save.graphics = this._graphicsToJson();
            } else {
                this.draw._deleteAll();
                save.graphics = [];
            }
            if (this.currentProject) {
                on.once(this.draw.map, 'confirmed', lang.hitch(this, function(r) {
                    if (r.confirmed) {
                        this._createProject(location, save);
                    }
                }));
                this.draw.map.confirm('Unsaved current drawing data will be lost.', 'Warning');
            } else {
                this._createProject(location, save);
            }
        },
        _createProject: function(location, save) {
            if (location === 'Local') {
                this._pouch.addDoc(save).then(lang.hitch(this, function(r) {
                    this.currentProject = {
                        _id: r.id,
                        _rev: r.rev,
                        name: save.name,
                        description: save.description,
                        location: save.location,
                        timestamp: save.timestamp
                    };
                    this.newProjectDialog._cancel();
                    this.draw.map.notify('Project Created: ' + save.name);
                }), lang.hitch(this, function(e) {
                    console.log(e);
                    this.draw.map.alert('An error occurred creating project.', 'Error');
                }));
            } else if (location === 'Server') {
                couchDbUtils.addDocument(this.couchDbUrl, JSON.stringify(save)).then(lang.hitch(this, function(r) {
                    this.currentProject = {
                        _id: r.id,
                        _rev: r.rev,
                        name: save.name,
                        description: save.description,
                        location: save.location
                    };
                    this.newProjectDialog._cancel();
                    this.draw.map.notify('Project Created: ' + save.name);
                }), lang.hitch(this, function(e) {
                    console.log(e);
                    this.draw.map.alert('An error occurred creating project.', 'Error');
                }));
            } else {
                this.draw.map.alert('Something has gone horribly wrong.', 'Error');
            }
        },
        showLoadProjectDialog: function() {
            if (!this.loadProjectDialog) {
                var lpd = this.loadProjectDialog = declare([Dialog, WidgetsInTemplateMixin], {
                    templateString: LoadProjectTemplate
                })({
                    title: 'Load Drawing Project',
                    onHide: function() {
                        this.loadingNode.innerHTML = '<i class="fa fa-spinner fa-spin"></i>&nbsp;Loading projects...';
                    }
                });
                on(lpd.filterNode, 'change', lang.hitch(this, function(value) {
                    var grid = this.projectLoadGrid;
                    if (value === '') {
                        grid.setQuery({});
                        return;
                    }
                    grid.setQuery({
                        name: new RegExp(value, 'i')
                    });
                }));
                on(lpd.resetNode, 'click', function() {
                    lpd.filterNode.reset();
                });
                on(lpd.loadNode, 'click', lang.hitch(this, this._loadProject));
                on(lpd.deleteNode, 'click', lang.hitch(this, this._deleteProject));
                this.projectLoadGrid = declare([OnDemandGrid, Selection, Keyboard, ColumnResizer])({
                    className: 'hardcider-draw-load-grid',
                    bufferRows: Infinity,
                    selectionMode: 'single',
                    columns: [{
                        field: 'name',
                        label: 'Name'
                    }, {
                        field: 'description',
                        label: 'Description'
                    }, {
                        field: 'timestamp',
                        label: 'Last Save',
                        formatter: function(value) {
                            return locale.format(new Date(value));
                        }
                    }, {
                        field: 'location',
                        label: 'Location'
                    }],
                    adjustLastColumn: false,
                    minWidth: 76
                }, domConst.create('div'));
                lpd.gridContainerNode.setContent(this.projectLoadGrid.domNode);
                this.projectLoadGrid.startup();
                this.projectLoadGrid.on('.dgrid-row:click', lang.hitch(this, function(evt) {
                    this._selectedLoadData = this.projectLoadGrid.row(evt).data;
                }));
                this.projectLoadGrid.on('dgrid-deselect', lang.hitch(this, function() {
                    this._selectedLoadData = null;
                }));
            }
            this._getProjects();
            this.loadProjectDialog.show();
        },
        _getProjects: function() {
            if (!this._pouch && !this._couch) {
                this.draw.map.alert('This application is not configured for loading drawing data.', 'Error');
                return;
            }
            var promises = [],
                emit;
            if (this._pouch) {
                promises.push(this._pouch.query(function(doc) {
                    emit(null, {
                        _id: doc._id,
                        _rev: doc._rev,
                        name: doc.name,
                        description: doc.description,
                        timestamp: doc.timestamp,
                        location: doc.location
                    });
                }));
            }
            if (this._couch) {
                if (this.couchDbGetProjectsUrl) {
                    promises.push(couchDbUtils.getView(this.couchDbGetProjectsUrl));
                } else {
                    promises.push(couchDbUtils.getTempView(this.couchDbUrl, '{"map":"function (doc) {emit(null, {_id: doc._id,_rev: doc._rev,name: doc.name,description: doc.description,timestamp: doc.timestamp,location: doc.location});}"}'));
                }
            }
            all(promises).then(lang.hitch(this, function(r) {
                var rows = [],
                    pr = r[0],
                    cr = r[1];
                if (pr && pr.rows.length) {
                    array.forEach(pr.rows, function(row) {
                        rows.push(row);
                    });
                }
                if (cr && cr.rows.length) {
                    array.forEach(cr.rows, function(row) {
                        rows.push(row);
                    });
                }
                if (rows.length) {
                    this.projectLoadGrid.setStore(new Memory({
                        data: array.map(rows, function(row) {
                            return row.value;
                        }),
                        idProperty: '_id'
                    }));
                }
                this.projectLoadGrid.sort('timestamp', true);
                this.projectLoadGrid.resize();
                //because firefox is too good at remembering scroll position
                //no has('ff') just in case
                this.projectLoadGrid.scrollTo({
                    x: 0,
                    y: 0
                });
                this.loadProjectDialog.loadingNode.innerHTML = '';
            }), lang.hitch(this, function(e) {
                console.log(e);
            }));
        },
        _loadProject: function() {
            var sld = this._selectedLoadData;
            if (!sld) {
                return;
            }
            on.once(this.draw.map, 'confirmed', lang.hitch(this, function(r) {
                if (r.confirmed) {
                    if (sld.location === 'Local') {
                        this._pouch.getDoc(sld._id).then(lang.hitch(this, this._loadProjectHandler), lang.hitch(this, function(e) {
                            console.log(e);
                            this.draw.map.alert('An error occurred loading project.', 'Error');
                        }));
                    } else if (sld.location === 'Server') {
                        couchDbUtils.getDocument(this.couchDbUrl, sld._id).then(lang.hitch(this, this._loadProjectHandler), lang.hitch(this, function(e) {
                            console.log(e);
                            this.draw.map.alert('An error occurred loading project.', 'Error');
                        }));
                    } else {
                        this.draw.map.alert('Something has gone horribly wrong.', 'Error');
                    }
                }
            }));
            this.draw.map.confirm('Unsaved drawing data will be lost.', 'Warning');
        },
        _loadProjectHandler: function(doc) {
            this.currentProject = {
                _id: doc._id,
                _rev: doc._rev,
                name: doc.name,
                description: doc.description,
                location: doc.location,
                timestamp: doc.timestamp
            };
            this.draw._deleteAll();
            this.draw.undo.clearRedo();
            this.draw.undo.clearUndo();
            this.draw.loadGraphics(doc.graphics, true);
            this.loadProjectDialog.hide();
            this.draw.map.notify('Project Loaded: ' + doc.name);
        },
        _deleteProject: function() {
            var sld = this._selectedLoadData,
                cp = this.currentProject || {
                    _id: null
                };
            if (!sld) {
                return;
            }
            if (cp._id === sld._id) {
                this.draw.map.alert(sld.name + ' is the current project and cannot be deleted.', 'Error');
                return;
            }
            on.once(this.draw.map, 'confirmed', lang.hitch(this, function(r) {
                if (r.confirmed) {
                    if (sld.location === 'Local') {
                        this._pouch.removeDoc(sld._id).then(lang.hitch(this, this._deleteProjectHandler), lang.hitch(this, function(e) {
                            console.log(e);
                            this.draw.map.alert('An error occurred deleting project.', 'Error');
                        }));
                    } else if (sld.location === 'Server') {
                        couchDbUtils.deleteDocument(this.couchDbUrl, sld._id, sld._rev).then(lang.hitch(this, this._deleteProjectHandler), lang.hitch(this, function(e) {
                            console.log(e);
                            this.draw.map.alert('An error occurred deleting project.', 'Error');
                        }));
                    } else {
                        this.draw.map.alert('Something has gone horribly wrong.', 'Error');
                    }
                }
            }));
            this.draw.map.confirm('Delete drawing project ' + sld.name + '?', 'Confirm Delete');
        },
        _deleteProjectHandler: function(r) {
            this.projectLoadGrid.store.remove(r.id);
            this.projectLoadGrid.refresh();
        },
        saveProject: function() {
            var cp = this.currentProject;
            if (!cp) {
                this.showNewProjectDialog();
            } else {
                var save = lang.clone(cp),
                    timestamp = new Date().getTime();
                save.graphics = this._graphicsToJson();
                save.timestamp = timestamp;
                if (cp.location === 'Local') {
                    this._pouch.updateDoc(cp._id, save).then(lang.hitch(this, function(r) {
                        this._saveProjectHandler(r, timestamp);
                    }), lang.hitch(this, function(e) {
                        console.log(e);
                        this.draw.map.alert('An error occurred saving project.', 'Error');
                    }));
                } else if (cp.location === 'Server') {
                    couchDbUtils.updateDocument(this.couchDbUrl, cp._id, JSON.stringify(save)).then(lang.hitch(this, function(r) {
                        this._saveProjectHandler(r, timestamp);
                    }), lang.hitch(this, function(e) {
                        console.log(e);
                        this.draw.map.alert('An error occurred saving project.', 'Error');
                    }));
                } else {
                    this.draw.map.alert('Something has gone horribly wrong.', 'Error');
                }

            }
        },
        _saveProjectHandler: function(r, timestamp) {
            lang.mixin(this.currentProject, {
                _rev: r.rev,
                timestamp: timestamp
            });
            this.draw.map.notify('Project Saved: ' + this.currentProject.name);
        },
        _graphicsToJson: function() {
            var graphics = [],
                dl = this.draw.drawLayers,
                layerGraphicsToJson = function(layer) {
                    array.forEach(layer.graphics, function(graphic) {
                        graphics.push(graphic.toJson());
                    });
                };
            for (var i in dl) {
                if (dl.hasOwnProperty(i) && i !== 'temp') {
                    layerGraphicsToJson(dl[i]);
                }
            }
            return graphics;
        }
    });
});
