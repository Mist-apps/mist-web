/* exported AuthService */
/* global Session, UserResource */
'use strict';


/**
 * Authentication service to login/logout and manage the Session.
 * Uses the session/local storage to store the token.
 *
 * Dependencies: Session / UserResource
 */
var AuthService = {

	/**
	 * Login by sending the credentials to the API and waiting for a token.
	 * This method returns a promise.
	 *
	 * If ok, store the token into session/local storage and resolve the promise
	 * If not ok, reject the promise with an error code and message
	 *
	 * @param credentials Object containing 3 properties: login/password/remember
	 * @return a promise resolved when the login process is done
	 */
	login: function (credentials) {
		var deferred = $.Deferred();
		// If login attempt success
		var success = function (data) {
			// Create the session
			Session.create(data.token, data.user);
			// Save token in local/session storage
			if (credentials.remember) {
				localStorage.setItem('token', data.token);
			} else {
				sessionStorage.setItem('token', data.token);
			}
			// Connected
			deferred.resolve();
		};
		// If login attempt fails
		var error = function (httpResponse) {
			if (httpResponse.status === 401) {
				deferred.reject({code: 1, message: 'Bad credentials'});
			} else if (httpResponse.status === 404) {
				deferred.reject({code: 2, message: 'Unable to join server'});
			} else {
				deferred.reject({code: 3, message: 'Unknown error'});
			}
		};
		// Try to log in
		UserResource.login(credentials, success, error);
		// Return a promise
		return deferred.promise();
	},

	/**
	 * Logout by destroying the token
	 */
	logout: function () {
		// Destroy session
		Session.destroy();
		// Clear all the local/session storage
		sessionStorage.clear();
		localStorage.clear();
	},

	/**
	 * Try to recover the authentication by searching for a token in
	 * session/local storage. If found, ask for user information.
	 *
	 * @return a promise resolved when the recovering process is done
	 */
	recover: function () {
		var deferred = $.Deferred();
		// Search for token in local/session storage
		var token = sessionStorage.getItem('token');
		if (!token) {
			token = localStorage.getItem('token');
		}
		// If token found
		if (token) {
			// If user information retrieval success
			var success = function (data) {
				// Create the session
				Session.create(token, data);
				// Connected
				deferred.resolve();
			};
			// If user information retrieval fails
			var error = function () {
				// Not connected
				deferred.reject('Unknown error when retrieving user');
			};
			// Get user information
			UserResource.recover(token, success, error);
		}
		// If no token found
		else {
			deferred.reject('No token found in storage');
		}
		// Return a promise
		return deferred.promise();
	},

	/**
	 * Check if the user is authenticated or not
	 *
	 * @return whether the user is logged in or not
	 */
	isAuthenticated: function () {
		return !!Session.getToken();
	}

};