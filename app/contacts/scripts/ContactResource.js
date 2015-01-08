/* exported ContactResource */
/* global Resource */
'use strict';


/**
 * Contact resource to CRUD the Contact API
 */
var ContactResource = new Resource('/contact', {
	importMist:		{method: 'POST', path: '/import', headers: {'Content-Type': 'application/json; app=mist'}},
	importGoogle:	{method: 'POST', path: '/import', headers: {'Content-Type': 'text/csv; app=google'}},
	importOutlook:	{method: 'POST', path: '/import', headers: {'Content-Type': 'text/csv; app=outlook'}},
	exportJSON:		{path: '/export', headers: {Accept: 'application/json'}}
});