/* exported NoteResource */
/* global Resource */
'use strict';


/**
 * Note resource to CRUD the Note API
 */
var NoteResource = new Resource('/note', {
	importJSON:		{method: 'POST', path: '/import', headers: {'Content-Type': 'application/json'}},
	exportJSON:		{path: '/export', headers: {Accept: 'application/json'}}
});