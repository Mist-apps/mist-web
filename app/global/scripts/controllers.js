'use strict';


/**
 * Application controller. It manages:
 *		- Show/hide all menus
 *		- Logout
 */
webApp.controller('ApplicationController', function ($scope, $rootScope, $timeout, $location, $modal, AuthService, syncService) {

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

	// Boundaries for cropping
	var imagePreviewWidth = $('#image-preview').width();
	var imagePreviewHeight = $('#image-preview').height();
	var coordinates;
	// Cropping library
	var jcrop;
	// Is default image
	var isDefault = false;

	/**
	 * Set the default image
	 */
	var _setDefault = function () {
		// If already default, does nothing
		if (isDefault) {
			return;
		} else {
			isDefault = true;
		}
		// Create image object with base64 upload
		var image = new Image();
		image.src = 'images/user.png';
		image.onload = function () {
			var canvas = document.getElementById('image-canvas');
			canvas.width = 85;
			canvas.height = 85;
			var ctx = canvas.getContext('2d');
			ctx.drawImage(image, 0, 0, 85, 85);
			$('#image-preview > img').attr('src', canvas.toDataURL());
		}
	};

	/**
	 * Remove Jcrop if it was set
	 */
	var _removeJcrop = function () {
		// If there was a previous image cropping
		if (jcrop) {
			// Destroy the jcrop objects
			jcrop.destroy();
			jcrop = undefined;
			// Clean the DOM
			$('#upload-preview').empty();
			$('#upload-preview').append('<img />');
			$('#upload-preview').hide();
			$('#image-preview > img').remove();
			$('#image-preview').prepend('<img />');
			// Send the resize event, for centering the modal
			$('.modal-content').resize();
		}
	}

	/**
	 * Preview the result of the crop operation
	 */
	var _preview = function (coords) {
		// Save coordinates
		coordinates = coords;
		// Calculate deplacement
		var rx = imagePreviewWidth / coords.w;
		var ry = imagePreviewHeight / coords.h;
		// Get upload preview boundaries
		var uploadPreviewWidth = $('#upload-preview > img').width();
		var uploadPreviewHeight = $('#upload-preview > img').height();
		// Set image preview
		$('#image-preview > img').css({
			width: Math.round(rx * uploadPreviewWidth) + 'px',
			height: Math.round(ry * uploadPreviewHeight) + 'px',
			marginLeft: '-' + Math.round(rx * coords.x) + 'px',
			marginTop: '-' + Math.round(ry * coords.y) + 'px'
		});
	};

	/**
	 * Save the settings and remove the settings modal
	 * If the settings form is not consistent, does nothing
	 * Show a notification if saved or if an error occurs
	 */
	$scope.save = function () {
		// If default image
		if (isDefault) {
			$scope.tmpUser.image = null;
		}
		// If new image
		else if (coordinates) {
			// Create canvas for resizing image
			var canvas = document.getElementById('image-canvas');
			canvas.width = 85;
			canvas.height = 85;
			var ctx = canvas.getContext('2d');
			// Create image object with base64 upload
			var image = $('#image-preview > img').get(0);
			ctx.drawImage(image, coordinates.x, coordinates.y, coordinates.w, coordinates.h, 0, 0, 85, 85);
			$scope.tmpUser.image = canvas.toDataURL();
		}
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
	 * Upload the file on the client for cropping and preview
	 */
	$scope.upload = function () {
		isDefault = false;
		var input = $('#user-image-input').get(0);
		if (input.files && input.files[0]) {
			// Remove previous jcrop
			_removeJcrop();
			// Read the file input
			var reader = new FileReader();
			reader.onload = function (e) {
				// Set the image for previews
				$('#upload-preview').show();
				$('#upload-preview > img').attr('src', e.target.result);
				$('#image-preview > img').attr('src', e.target.result);
				// Add jcrop behaviour
				$('#upload-preview > img').Jcrop({
					aspectRatio:	1,
					boxWidth:		350,
					boxHeight:		350,
					onChange:		_preview,
					onSelect:		_preview
				}, function () {
					jcrop = this;
				});
				// Send the resize event, for centering the modal
				$('.modal-content').resize();
			};
			reader.readAsDataURL(input.files[0]);
		}
	};

	/**
	 * Remove the current image
	 */
	$scope.remove = function () {
		_removeJcrop();
		_setDefault();
	};

	// Initialize image
	if ($scope.tmpUser.image) {
		$('#image-preview > img').attr('src', $scope.tmpUser.image);
	} else {
		_setDefault();
	}

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


