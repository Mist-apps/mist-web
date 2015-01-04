/* exported NoteResource */
/* global Resource, Config, Session */
'use strict';


/**
 * Note resource to CRUD the Note API
 */
var NoteResource = new Resource('/note');

/**
 * Import notes from a JSON file
 */
NoteResource.importJSON = function (data, success, error) {
	$.ajax({
		url:			Config.api + '/note/import',
		type:			'POST',
		headers:		{'API-Token': Session.getToken()},
		data:			data,
		contentType:	'application/json; charset=utf-8',
		processData:	false,
		success:		success,
		error:			error
	});
};

/**
 * Export the notes to a JSON file
 */
NoteResource.exportJSON = function (success, error) {
	$.ajax({
		url:		Config.api + '/note/export',
		type:		'GET',
		accepts:	{json: 'application/json'},
		dataType:	'json',
		headers:	{'API-Token': Session.getToken()},
		success:	success,
		error:		error
	});
};