'use strict';



/**
 * Login controller
 */
webApp.controller('LoginCtrl', function ($scope, $location, AuthService) {

	// Default credentials values
	$scope.credentials = {
		username: '',
		password: '',
		remember: false
	};

	/**
	 * Try to login by calling the AuthService with the credentials
	 */
	$scope.login = function () {
		AuthService.login($scope.credentials).then(
			// If login success
			function () {
				$location.path('/');
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
		);
	};
});



/**
 * =================================
 *         Normal Javascript
 * =================================
 */



/**
 * Auto remove shake class
 */
$('body').on('animationend webkitAnimationEnd oAnimationEnd MSAnimationEnd', '.shake', function() {
	$(this).removeClass('shake');
});