/**
 * Confirmation controller (modal)
 */
var ConfirmController = function () {

	$('#modal-button-logout').click(function () {
		// Hide modal
		ModalService.hide('global-confirm');
		// Logout
		AuthService.logout();
		// Initialize sync service
		SyncService.init();
		// Go to login page
		location.replace('/login');
	});

	$('#modal-button-cancel').click(function () {
		// Hide modal
		ModalService.hide('global-confirm');
	});

};


/**
 * Settings controller (modal)
 */
var SettingsController = function () {

	// Cone the user
	var user = $.extend(true, {}, Session.getUser());
	user.password = user.password2 = '';

	// Populate the modal
	$('input:text[name=firstName]').val(user.firstName);
	$('input:text[name=lastName]').val(user.lastName);
	$('input:text[name=mail]').val(user.mail);

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
		image.src = '../global/images/user.png';
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
	 *//*
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
	$('#modal-button-cancel').click(function () {
		// Hide modal
		ModalService.hide('global-settings');
	});

	/**
	 * Upload the file on the client for cropping and preview
	 *//*
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
	$('#image-preview span').click(function () {
		_removeJcrop();
		_setDefault();
	});

	// Initialize image
	if (user.image) {
		$('#image-preview > img').attr('src', user.image);
	} else {
		_setDefault();
	}

};