'use strict';


/**
 * Try to login by calling the AuthService with the credentials
 */
$('#login-submit button').click(function () {
	/*AuthService.login($scope.credentials).then(
		// If login success
		function () {
			// If we authenticated from modal
			if ($modal.isShown('global-login')) {
				$modal.hide('global-login');
			}
			// If we authenticated from form
			else {
				// Initialize sync service
				syncService.init();
				// Go to home
				$location.path('/');
			}
		},
		// If login error
		function (reason) {
			if (reason.code === 1) {
				$('.login-form-input').addClass('shake login-form-input-error');
			} else {
				$('.login-form-input').removeClass('login-form-input-error');
			}
			$scope.errorMessage = reason.message;
		}
	);*/
});

// Auto-focus the login field
$('#login-container form input[name="login"]').focus();

// Auto remove shake class
 $('body').on('animationend webkitAnimationEnd oAnimationEnd MSAnimationEnd', '.shake', function () {
	$(this).removeClass('shake');
});