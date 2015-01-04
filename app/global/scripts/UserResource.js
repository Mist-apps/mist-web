/* exported UserResource */
/* global Resource, Config, Session */
'use strict';


/**
 * User resource to CRUD the User API
 */
var UserResource = new Resource('/user');

/**
 * Try to recover a session and get the connected user information
 *
 * @param token the token to get the user
 * @param success(data, textStatus, jqXHR)
 * @param error(jqXHR, textStatus, errorThrown)
 */
UserResource.recover = function (token, success, error) {
	$.ajax({
		url:		Config.api + '/user',
		type:		'GET',
		headers:	{'API-Token': token},
		success:	success,
		error:		error
	});
};

/**
 * Try to login and get a token
 *
 * @param credentials the login and password of the user who want to connect
 * @param success(data, textStatus, jqXHR)
 * @param error(jqXHR, textStatus, errorThrown)
 */
UserResource.login = function (credentials, success, error) {
	$.ajax({
		url:			Config.api + '/login',
		type:			'POST',
		headers:		{},
		data:			JSON.stringify(credentials),
		contentType:	'application/json; charset=utf-8',
		processData:	false,
		success:		success,
		error:			error
	});
};

/**
 * Update the user, no need to give the id, it is retrieved by the session.
 *
 * @param data the data to insert
 * @param success(data, textStatus, jqXHR)
 * @param error(jqXHR, textStatus, errorThrown)
 */
UserResource.update = function (data, success, error) {
	$.ajax({
		url:			Config.api + this.path,
		type:			'PUT',
		headers:		{'API-Token': Session.getToken()},
		data:			JSON.stringify(data),
		contentType:	'application/json; charset=utf-8',
		processData:	false,
		success:		success,
		error:			error
	});
};