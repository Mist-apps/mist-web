/* exported ConfirmModalController */
/* global AuthService, ModalService */
'use strict';


/**
 * Confirmation controller
 */
var ConfirmModalController = function () {

	$('#modal-button-logout').click(function () {
		// Logout
		AuthService.logout();
		// Go to login page
		location.replace('/login');
	});

	$('#modal-button-cancel').click(function () {
		// Hide modal
		ModalService.hide('global-confirm');
	});

};