/* exported ContactResource */
/* global Resource */
'use strict';


/**
 * Contact resource to CRUD the Contact API
 */
var ContactResource = new Resource('/contact');

/**
 * Import notes from a Mist JSON file
 */
ContactResource.importMist = function () {
	// TODO importMist: { method: 'POST', url: Config.api + '/contact/import', headers: {'Content-Type': 'application/json; app=mist'}, isArray: false },
};

/**
 * Import notes from a JSON file
 */
ContactResource.importGoogle = function () {
	// TODO importGoogle: { method: 'POST', url: Config.api + '/contact/import', headers: {'Content-Type': 'text/csv; app=google'}, isArray: false },
};

/**
 * Import notes from a JSON file
 */
ContactResource.importOutlook = function () {
	// TODO importOutlook: { method: 'POST', url: Config.api + '/contact/import', headers: {'Content-Type': 'text/csv; app=outlook'}, isArray: false }
};

/**
 * Export the notes to a JSON file
 */
ContactResource.exportJSON = function () {
	// TODO exportJSON: { method: 'GET', url: Config.api + '/contact/export', headers: {'Accept': 'application/json'}, isArray: true },
};