'use strict';


/**
 * Contacts resource
 */
webApp.factory('contactResource', ['$resource', function ($resource) {
	return $resource(API_URL + '/contact/:id', {id: '@id'}, {
		update: { method: 'PUT' },
		exportJSON: { method: 'GET', url: API_URL + '/contact/export', headers: {'Accept': 'application/json'}, isArray: true },
		importMist: { method: 'POST', url: API_URL + '/contact/import', headers: {'Content-Type': 'application/json; app=mist'}, isArray: false },
		importGoogle: { method: 'POST', url: API_URL + '/contact/import', headers: {'Content-Type': 'text/csv; app=google'}, isArray: false },
		importOutlook: { method: 'POST', url: API_URL + '/contact/import', headers: {'Content-Type': 'text/csv; app=outlook'}, isArray: false }
	});
}]);