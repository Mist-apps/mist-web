'use strict';


/**
 * Application controller. It manages:
 *		- Show/hide all menus
 *		- Logout
 */
webApp.controller('ApplicationController', function ($scope, $timeout, $rootScope, $location, $modal, AuthService, syncService) {

	/**
	 * Left menu location
	 */
	$rootScope.location = 'all';

	$rootScope.$watch('location', function () {
		var interval = setInterval(function () {
			var title = $('#menu-item-' + $rootScope.location).text();
			if (title && $('#nav-menu-title').html() !== undefined) {
				$('#nav-menu-title').html(title);
				clearInterval(interval);
			}
		}, 100);
	});

	/**
	 * Navigate to path
	 */
	$scope.goto = function (path) {
		$location.path(path);
	};

	/**
	 * Hide all menus
	 */
	var _hideMenus = function () {
		$('.menu').removeClass('menu-show');
		$('#nav-search').css('display', '');	// Remove manually display to recover the class value
		$('#add-menu div').hide();
		$('#add-menu div:first-child').show();
		$('#add-menu div:first-child div').show();
		$('html').unbind('click');
	};

	/**
	 * Show and hide left menu dynamically
	 */
	$scope.toggleLeftMenu = function ($event) {
		if (!$('.menu').hasClass('menu-show')) {
			_hideMenus();
			$('.menu').addClass('menu-show');
			$('html').click(function () {
				_hideMenus();
			});
			$event.stopPropagation();
		} else {
			_hideMenus();
		}
	};

	/**
	 * Show and hide the add menu dynamically
	 */
	$scope.toggleAddMenu = function ($event) {
		if ($('#add-menu div:first-child').is(':visible')) {
			_hideMenus();
			$('#add-menu div').show();
			$('#add-menu div:first-child').hide();
			$('html').click(function () {
				_hideMenus();
			});
			$event.stopPropagation();
		}
	};

	/**
	 * Show and hide the search menu dynamically (small screens)
	 */
	$scope.toggleSearchMenu = function ($event) {
		if ($('#nav-search').is(':hidden')) {
			_hideMenus();
			$('#nav-search').show();
			$('html').click(function (event) {
				// Check if we clicked outside of the nav menu
				if ($(event.target).parents('#nav-search').length !== 1) {
					_hideMenus();
				}
			});
			$event.stopPropagation();
		} else {
			_hideMenus();
		}
	};

	/**
	 * Show the settings modal and send a broadcast to initialize the
	 * settings controller.
	 */
	$scope.showSettings = function () {
		// Init the settings modal
		$scope.$broadcast('INIT_SETTINGS');
		// Show the user settings modal
		$modal.show('global-settings');
	};

	/**
	 * Log the user out and redirect it to the login page
	 */
	$scope.logout = function () {
		// If status is not synced, show the confirm dialog
		if ($rootScope.syncStatus !== 'synced') {
			$modal.show('global-confirm');
		}
		// If no confirmation needed, logout and go to the login page
		else {
			AuthService.logout();
			syncService.init();
			$location.path('/login');
		}
	};

});

/**
 * Settings controller (modal)
 */
webApp.controller('SettingsController', function ($scope, $modal, toastr, Session, userResource) {

	// Clone user in a tmp user to update
	$scope.tmpUser = $.extend(true, {}, Session.user);
	$scope.tmpUser.password = $scope.tmpUser.password2 = '';

	/**
	 * Save the settings and remove the settings modal
	 * If the settings form is not consistent, does nothing
	 * Show a notification if saved or if an error occurs
	 */
	$scope.save = function () {
		// Check password
		if ($scope.tmpUser.password !== $scope.tmpUser.password2 || ($scope.tmpUser.password !== '' && $scope.tmpUser.password < 6)) {
			return;
		}
		// Remove login, password2, and password if empty
		delete($scope.tmpUser.login);
		delete($scope.tmpUser.password2);
		if (!$scope.tmpUser.password) {
			delete($scope.tmpUser.password);
		}
		// Update the user
		userResource.update($scope.tmpUser,
			function (data) {
				Session.update(data);
				toastr.success('Settings saved');
			}, function () {
				toastr.error('Unable to save settings');
			}
		);
		// Hide modal
		$modal.hide('global-settings');
	};

	/**
	 * Cancel the settings modifications: hide modal
	 */
	$scope.cancel = function () {
		// Hide modal
		$modal.hide('global-settings');
	};

	/**
	 * Get the image from input, resize it to 85px/85px,
	 * transform it in base64 and update the temporary user
	 */
	$scope.uploadImage = function () {
		var input = $('#user-image-input').get(0);
		if (input.files && input.files[0]) {
			// Create canvas for resizing image
			var canvas = document.getElementById('user-image-canvas');
			canvas.width = 85;
			canvas.height = 85;
			var ctx = canvas.getContext('2d');
			// Create image object with base64 upload
			var image = new Image();
			image.onload = function() {
				ctx.drawImage(image, 0, 0, 85, 85);
				$scope.tmpUser.image = canvas.toDataURL();
			};
			// Read the image from the input in base64
			var reader = new FileReader();
			reader.onload = function (e) {
				image.src = e.target.result;
			};
			reader.readAsDataURL(input.files[0]);
		}
	};

});

/**
 * Confirmation controller (modal)
 */
webApp.controller('ConfirmController', function ($scope, $location, $modal, syncService, AuthService) {

	/**
	 * Logout
	 */
	$scope.logout = function () {
		// Logout
		AuthService.logout();
		// Initialize sync service
		syncService.init();
		// Hide modal
		$modal.hide('global-confirm');
		// Go to login page
		$location.path('/login');
	};

	/**
	 * Cancel the logout process
	 */
	$scope.cancel = function () {
		// Hide modal
		$modal.hide('global-confirm');
	};

});

/**
 * Login controller
 */
webApp.controller('LoginController', function ($scope, $location, $modal, AuthService, syncService) {

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
		);
	};

	// Auto-focus the login field
	$('#login-container form input[name="login"]').focus();

});