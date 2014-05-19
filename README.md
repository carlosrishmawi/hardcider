Hard Cider
==========

A viewer built with the [ESRI JavaScript API](https://developers.arcgis.com/javascript/).

####[View Demo](http://btfou.github.io/hardcider/)

####Getting Started

Simply fork or download this repo.

Basic map parameters and layers to load can be configured in the `apples.js` file.

Beyond that, knowledge of JavaScript, Dojo and the ESRI JavaScript API are required.

Questions, comments and issues are welcome [here](https://github.com/btfou/hardcider/issues).

####Notes

* Hard Cider's intended use is an internal viewer for organizations with ArcGIS Server, and for deploying custom tasks and functionalities therein. If you are looking for a viewer for the web, with better documentation and support, check out David Spriggs' [ConfigurableViewerJSAPI](https://github.com/DavidSpriggs/ConfigurableViewerJSAPI).
* Hard Cider is mobile and touch friendly, but is primarily a desktop application. Not the best for small screens. Not yet thoroughly tested on touch devices. The map's right-click menu can be accessed on touch devices with a long press.
* Hard Cider uses Dojo's claro theme with a few css tweaks to improve/simplify the look and maximize screen real estate for the map. Its beauty is derived from its simplicity and functionality.
* I am not very good about commenting. I'm working on it.
* Internet Explorer made an enemy of me long ago. Some say it's improved. I wouldn't know. I'm coming up on 6 years without having even opened it once. With any luck that streak will continue into eternity when I die. I've done my darndest to write Hard Cider with best practices, and it's lint free. Please don't concern me with IE only problems.

####The State of Hard Cider

Hard Cider is still a work in progress. There are a handful of key features, which are currently in development. These features include:

* Saving and loading of maps locally and to a server.
* Add more types of layers to the map via config and UI.
* ArcGIS feature layer editing.
* A Grunt build.
* And more in conceptual mode.

####Built With Cool Stuff

Do yourself a favor and check out these awesome projects. They make me look good, and they will do the same for you.

* [ESRI JavaScript API](https://developers.arcgis.com/javascript/)
* [Dojo](http://dojotoolkit.org/)
* [dgrid](http://dojofoundation.org/packages/dgrid/)
* [Font Awesome](http://fortawesome.github.io/Font-Awesome/)
* [Pouch DB](http://pouchdb.com/)
* [Couch DB](http://couchdb.apache.org/)
* [es5-shim](https://github.com/es-shims/es5-shim)
* [Terraformer](http://terraformer.io/)
* [Blob.js](https://github.com/eligrey/Blob.js)
* [FileSaver.js](https://github.com/eligrey/FileSaver.js)
* [Grunt](http://gruntjs.com/)

####Gratitude

Thanks to everyone who contributes to Dojo, and to many folks at ESRI, in particular the entire ESRI JavaScript API team.

####License
The MIT License (MIT)

Copyright (c) 2014 Ben Fousek

[License](https://github.com/btfou/hardcider/blob/master/LICENSE)
