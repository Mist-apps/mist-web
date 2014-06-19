'use strict';



/**
 * Login controller
 */
webApp.controller('LoginCtrl', function ($scope, $location, AuthService, Session) {
	$scope.credentials = {
		username: '',
		password: '',
		remember: false
	};
	$scope.login = function (credentials) {
		AuthService.login(credentials).then(function () {
			$location.path('/');
		}, function (reason) {
			if (reason.code === 1) {
				$('.login-form-input').addClass('shake');
				$scope.formError = true;
			} else {
				$scope.formError = false;
			}
			$scope.errorMessage = reason.message;
		});
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