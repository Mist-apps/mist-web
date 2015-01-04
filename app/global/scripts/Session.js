/* exported Session */
'use strict';


/**
 * Session containing the user, token...
 */
var Session = (function () {

	// Session state
	var token = null;
	var user = null;

	// Export methods
	return {
		getToken: function () {
			return token;
		},
		getUser: function () {
			return user;
		},
		create: function (newToken, newUser) {
			token = newToken;
			user = newUser;
		},
		destroy: function () {
			token = null;
			user = null;
		},
		update: function (newUser) {
			user = newUser;
		}
	};

})();