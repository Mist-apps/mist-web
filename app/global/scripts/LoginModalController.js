/* exported LoginModalController */
/* global AuthService, ModalService */
'use strict';


/**
 * Login Controller
 */
var LoginModalController = function () {

	/**
	 * Try to login by calling the AuthService with the credentials
	 */
	$('.modal form').on('submit', function () {
		// Get credentials
		var credentials = {
			login:		$('input:text[name=login]').val(),
			password:	$('input:password[name=password]').val(),
			remember:	$('input:checkbox[name=remember]').is(':checked')
		};
		// Try to log in
		AuthService.login(credentials).then(
			// If login success
			function () {
				// Remove modal
				ModalService.hide('global-login');
			},
			// If login error
			function (reason) {
				if (reason.code === 1) {
					$('.login-form-input').addClass('shake login-form-input-error');
				} else {
					$('.login-form-input').removeClass('login-form-input-error');
				}
				$('#login-error').html(reason.message).show();
			}
		);
		// Do not redirect to "action" page
		return false;
	});

	/**
	 * Auto remove shake class
	 */
	$('.modal').on('animationend webkitAnimationEnd oAnimationEnd MSAnimationEnd', '.shake', function () {
		$(this).removeClass('shake');
	});

	/**
	 * Execution
	 */

	// Auto-focus the login field
	$('input[name="login"]').focus();

};