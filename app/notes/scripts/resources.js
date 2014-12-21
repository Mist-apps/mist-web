'use strict';


/**
 * Note resource to CRUD the Note API
 */
var NoteResource = new Resource('/note');

/**
 * Import notes from a JSON file
 */
NoteResource.importJSON = function () {
	// TODO importJSON: { method: 'POST', url: API_URL + '/note/import', headers: {'Content-Type': 'application/json'}, isArray: false }
};

/**
 * Export the notes to a JSON file
 */
NoteResource.exportJSON = function () {
	// TODO exportJSON: { method: 'GET', url: API_URL + '/note/export', headers: {'Accept': 'application/json'}, isArray: true },
};