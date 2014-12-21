'use strict';


/**
 * Resource class definition
 *
 * @param path the path of the resource to CRUD (/notes, /contacts...)
 */
function Resource(path) {
	this.path = path;
};

/**
 * Get all the resources
 *
 * @param success(data, textStatus, jqXHR)
 * @param error(jqXHR, textStatus, errorThrown)
 */
Resource.prototype.get = function (success, error) {
	var request = {
		url:		API_URL + this.path,
		type:		'GET',
		headers:	{'API-Token': Session.getToken()},
		success:	success,
		error:		error
	};
	$.ajax(request);
};

/**
 * Insert a resource
 *
 * @param data the data to insert
 * @param success(data, textStatus, jqXHR)
 * @param error(jqXHR, textStatus, errorThrown)
 */
Resource.prototype.insert = function (data, success, error) {
	$.ajax({
		url:			API_URL + this.path,
		type:			'POST',
		headers:		{'API-Token': Session.getToken()},
		data:			JSON.stringify(data),
		contentType:	'application/json; charset=utf-8',
		processData:	false,
		success:		success,
		error:			error
	});
}

/**
 * Update a resource by it's id
 *
 * @param id the id of the resource to update
 * @param data the data to insert
 * @param success(data, textStatus, jqXHR)
 * @param error(jqXHR, textStatus, errorThrown)
 */
Resource.prototype.update = function (id, data, success, error) {
	$.ajax({
		url:			API_URL + this.path + '/' + id,
		type:			'PUT',
		headers:		{'API-Token': Session.getToken()},
		data:			JSON.stringify(data),
		contentType:	'application/json; charset=utf-8',
		processData:	false,
		success:		success,
		error:			error
	});
};

/**
 * Delete a resource by it's id
 *
 * @param id the id of the resource to delete
 * @param success(data, textStatus, jqXHR)
 * @param error(jqXHR, textStatus, errorThrown)
 */
Resource.prototype.delete = function (id, success, error) {
	$.ajax({
		url:			API_URL + this.path + '/' + id,
		type:			'DELETE',
		headers:		{'API-Token': Session.getToken()},
		success:		success,
		error:			error
	});
};