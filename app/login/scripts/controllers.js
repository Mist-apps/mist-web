'use strict';


/**
 * Try to login by calling the AuthService with the credentials
 */
$('form').on('submit', function () {
	// Get credentials
	var credentials = {
		login:		$('input:text[name=login]').val(),
		password:	$('input:password[name=password]').val(),
		remember:	$('input:checkbox[name=remember]').is(":checked")
	};
	// Try to log in
	AuthService.login(credentials).then(
		// If login success
		function () {
			// Initialize sync service
			// TODO syncService.init();
			// Go to home
			location.replace('/notes');
		},
		// If login error
		function (reason) {
			if (reason.code === 1) {
				$('.login-form-input').addClass('shake login-form-input-error');
			} else {
				$('.login-form-input').removeClass('login-form-input-error');
			}
			$('#login-error').html(reason.message);
		}
	);
	// Do not redirect to "action" page
	return false;
});


/**
 * Miscellaneous
 */

// Auto-focus the login field
$('input[name="login"]').focus();

// Auto remove shake class
 $('body').on('animationend webkitAnimationEnd oAnimationEnd MSAnimationEnd', '.shake', function () {
	$(this).removeClass('shake');
});