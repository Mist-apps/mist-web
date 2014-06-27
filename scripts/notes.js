'use strict';



/**
 * Notes resource
 */
webApp.factory('noteResource', ['$resource', function ($resource) {
	return $resource(API_URL + '/note/:id', {id: '@id'}, {
		update: { method: 'PUT' }
	});
}]);

/**
 * Resize directive to resize automatically textarea's during writing.
 */
webApp.directive('resize', function ($timeout, $rootScope) {
	return {
		restrict: 'A',
		link: function(scope, element, attrs) {
			var resize = function () {
				// Resize the element
				element[0].style.height = 'auto';
				element[0].style.height = element[0].scrollHeight + 'px';
				// Refresh grid layout
				$rootScope.masonry.draw();
			};
			element.on('change cut paste drop keyup keydown', resize);
			$timeout(resize);
		}
	};
});

/**
 * Manage grid
 */
webApp.directive('grid', function ($rootScope, $timeout) {
	return {
		restrict: 'A',
		link: function(scope, element, attrs) {
			// Create masonry object
			$rootScope.masonry = new Masonry(element[0]);
		}
	};
});

/**
 * Grid elements
 */
webApp.directive('gridItem', function ($rootScope, $timeout) {
	return {
		restrict: 'A',
		link: function(scope, element, attrs) {
			// Refresh layout when item destroyed
			scope.$on('$destroy', function () {
				$rootScope.masonry.draw();
			});
			// Refresh the grid when item added
			$rootScope.masonry.draw();
		}
	};
});

/**
 * Notes Controller
 */
webApp.controller('NotesCtrl', function ($scope, $rootScope, $timeout, $modal, noteResource, toastr, syncService) {

	$scope.location = 'all';

	/**
	 * Get Notes from API
	 */
	$scope.getNotes = function () {
		var success = function (data, responseHeaders) {
			$scope.notes = data;
		};
		var error = function (httpResponse) {
			toastr.error('Unable to get notes (' + httpResponse.status + ')');
		};
		noteResource.query(success, error);
	}

	$scope.notes = [];
	$scope.getNotes();

	/**
	 * Check and uncheck a task in a todo list
	 */
	$scope.toggleTaskDone = function (note, task) {
		// Toggle
		task.done = !task.done;
		// Set modification date
		note.modificationDate = new Date().getTime();
		// Inform sync service
		syncService.updateResource('NOTE', note)
	};

	/**
	 * Filter the notes from the menu selection
	 */
	$scope.filterNotes = function (value) {
		if ($scope.location === 'all') {
			return !value.deleteDate;
		} else if ($scope.location === 'notes') {
			return !value.deleteDate && !value.tasks;
		} else if ($scope.location === 'todo') {
			return !value.deleteDate && value.tasks;
		} else if ($scope.location === 'trash') {
			return value.deleteDate;
		} else {
			return false;
		}
	};

	/**
	 * Listen to key events on the note titles
	 */
	$scope.titleKeyListener = function ($event, note) {
		var target = $($event.target);
		// "ENTER" key
		if ($event.keyCode === 13) {
			var next = $($event.target).next();
			// Go to content
			if (next.hasClass('note-content')) {
				next.focus();
			}
			// Go to task
			else if (next.hasClass('note-tasks')) {
				next.find('.note-task-content').focus();
			}
			// Stop key default behaviour
			$event.preventDefault();
		}
		// Inform sync service and set modification time if necessary
		if (!_keyMustBeIgnored($event.keyCode)) {
			note.modificationDate = new Date().getTime();
			syncService.updateResource('NOTE', note);
		}
	};

	/**
	 * Listen to key events on the note contents
	 */
	$scope.contentKeyListener = function ($event, note) {
		// Inform sync service and set modification time if necessary
		if (!_keyMustBeIgnored($event.keyCode)) {
			note.modificationDate = new Date().getTime();
			syncService.updateResource('NOTE', note);
		}
	};

	/**
	 * Listen for key events on the task contents
	 */
	$scope.taskKeyListener = function ($event, note, index) {
		var target = $($event.target);
		var tasks = note.tasks;

		// "ENTER" key
		if ($event.keyCode === 13) {
			// Get two parts of the task
			var start = target.val().substring(0, target.prop('selectionStart'))
			var end = target.val().substring(target.prop('selectionEnd'));
			// Update model
			tasks[index].content = start;
			tasks.splice(index + 1, 0, {done: false, content: end});
			// Stop key default behaviour
			$event.preventDefault();
			// Wait rendering to go to the created task
			$timeout(function () {
				target.change();
				target.parent().next().find('.note-task-content').focusStart();
			});
		}
		// "DOWN" key
		else if ($event.which === 40) {
			if (target.isCursorOnEndOfTask() && target.parent().next().length) {
				target.parent().next().find('.note-task-content').focusStart();
				$event.preventDefault();
			}
		}
		// "UP" key
		else if ($event.which === 38) {
			if (target.isCursorOnStartOfTask() && target.parent().prev().length) {
				target.parent().prev().find('.note-task-content').focusEnd();
				$event.preventDefault();
			}
		}
		// "BACKSPACE" key
		else if ($event.which === 8) {
			// If there is a previous task, and the cursor is on the start of the task
			if (target.isCursorOnStartOfTask() && target.parent().prev().length) {
				// Move caret position after rendering
				var pos = tasks[index - 1].content.length;
				var elem = target.parent().prev().find('.note-task-content');
				$timeout(function() {
					elem.focusPosition(pos);
				});
				// Merge the two tasks
				tasks[index - 1].content += tasks[index].content
				tasks.splice(index, 1);
				// Stop key default behaviour
				$event.preventDefault();
			}
		}
		// "DELETE" key
		else if ($event.which === 46) {
			// If there is a next task, and the cursor is on the end of the task
			if (target.isCursorOnEndOfTask() && target.parent().next().length) {
				// Move caret position after rendering
				var pos = tasks[index].content.length;
				$timeout(function() {
					target.focusPosition(pos);
				});
				// Merge the two tasks
				tasks[index].content += tasks[index + 1].content
				tasks.splice(index + 1, 1);
				// Stop key default behaviour
				$event.preventDefault();
			}
		}
		// Inform sync service and set modification time if necessary
		if (!_keyMustBeIgnored($event.keyCode)) {
			note.modificationDate = new Date().getTime();
			syncService.updateResource('NOTE', note);
		}
	}

	/**
	 * Check whether the key must be ignored or not for informing
	 * the sync service
	 */
	var _keyMustBeIgnored = function (keyCode) {
		var keysToIgnore = [
			37, 38, 39, 40,		// Arrows
			16, 17, 18, 27,		// Shift Control Alt Escape
			9, 19, 91, 92,		// Tab Pause WindowsLeft WindowsRight
			20, 144, 145,		// CapsLock NumLock ScrollLock
			33, 34, 35, 36,		// PageUp PageDown End Home
			45, 93,				// Insert Select
			112, 113, 114, 115, 116, 117, 118, 119, 120, 121, 122, 123	// F1 -> F12
		];
		return keysToIgnore.indexOf(keyCode) !== -1
	}

	/**
	 * Add a new empty note
	 */
	$scope.addNewNote = function () {
		// Add new note
		var date = new Date().getTime();
		var tmpId = "" + date + Math.floor(Math.random() * 1000000);
		var note = {tmpId: tmpId, title: '', content: '', creationDate: date};
		$scope.notes.push(note);
		// Inform sync service
		syncService.newResource('NOTE', note);
	}

	/**
	 * Add a new empty todo list
	 */
	$scope.addNewTodo = function () {
		// Add new todo list
		var date = new Date().getTime();
		var tmpId = "" + date + Math.floor(Math.random() * 1000000);
		var note = {tmpId: tmpId, title: '', tasks: [{content: '', done: false}], creationDate: date};
		$scope.notes.push(note);
		// Inform sync service
		syncService.newResource('NOTE', note);
	}

	/**
	 * Delete a note
	 */
	$scope.deleteNote = function (note) {
		// Update note
		note.deleteDate = new Date().getTime();
		// Stop edit the note
		$scope.stopEditNotes();
		// Inform sync service
		syncService.updateResource('NOTE', note);
	}

	/**
	 * Delete definitively a note
	 */
	$scope.destroyNote = function (note) {
		// Search for note to delete
		for (var key in $scope.notes) {
			// If the note has an id, search if id match, else, search if tmpId match
			if ((note._id && $scope.notes[key]._id === note._id) || (!note._id && $scope.notes[key].tmpId === note.tmpId)) {
				$scope.notes.splice(key, 1);
				break;
			}
		}
		// Stop edit the note
		$scope.stopEditNotes();
		// Inform sync service
		syncService.deleteResource('NOTE', note);
	}

	/**
	 * Restore a deleted note
	 */
	$scope.restoreNote = function (note) {
		// Update note
		delete(note.deleteDate);
		// Stop edit the note
		$scope.stopEditNotes();
		// Inform sync service
		syncService.updateResource('NOTE', note);
	}

	/**
	 * Start editing task
	 */
	$scope.startEditTask = function ($event) {
		$($event.target).parent().addClass('note-task-edit');
	};

	/**
	 * Stop editing task
	 */
	$scope.stopEditTask = function ($event) {
		$($event.target).parent().removeClass('note-task-edit');
	};

	/**
	 * Start editing the notes
	 */
	$scope.startEditNote = function (event) {
		if (event.target.className !== '' && event.target.className !== 'note-task-icon') {
			// Set tabindex
			$(this).find('.note-title').attr('tabindex', 1);
			$(this).find('.note-content').attr('tabindex', 1);
			$(this).find('.note-task-content').attr('tabindex', 1);
			$(this).find('button').attr('tabindex', 1);
			// Show editor
			$modal.dim();
			$(this).addClass('note-edit');
			$(this).find('.note-menu').addClass('note-menu-active');
			// Remove the binding to start a new edit
			$('body').off('click', $scope.startEditNote);
			// Listen to escape key
			$('body').on('keydown', _escapeKeyListener);
			// Listen to clicks on dim
			$('.dim').on('click', $scope.stopEditNotes);
			// Reorganize grid
			$rootScope.masonry.draw();
		}
	};

	/**
	 * Stop editing the notes
	 */
	$scope.stopEditNotes = function (event) {
		// Stop focusing the element
		if (event) {
			$(event.target).blur();
		}
		// Remove notes tabindex
		$('.note-title').attr('tabindex', -1);
		$('.note-content').attr('tabindex', -1);
		$('.note-task-content').attr('tabindex', -1);
		$('.note button').attr('tabindex', -1);
		// Remove editor
		$modal.clear();
		$('.note').removeClass('note-edit');
		$('.note-menu').removeClass('note-menu-active');
		// Rebind the listener to start edit a note
		$('body').on('click', '.note', $scope.startEditNote);
		// Remove the binding to listen to escape key
		$('body').off('keydown', _escapeKeyListener);
		// Remove the binding to listen to clicks on dim
		$('.dim').off('click', $scope.stopEditNotes);
		// Reorganize grid
		$rootScope.masonry.draw();
	};

	/**
	 * Custom listeners
	 */
	var _escapeKeyListener = function (event) {
		if (event.which === 27) {
			$scope.stopEditNotes(event);
		}
	}

	/**
	 * When a conflict is detected, stop edit the note and show modal
	 */
	$scope.$on('CONFLICT', function (event, local, remote) {
		$scope.stopEditNotes();
		$modal.show('notes-conflict', {local: local, remote: remote});
	});
	$scope.$on('DESTROY_NOTE', function (event, note) {
		// Search for note
		for (var key in $scope.notes) {
			// If the note has an id, search if id match, else, search if tmpId match
			if ((note._id && $scope.notes[key]._id === note._id) || (!note._id && $scope.notes[key].tmpId === note.tmpId)) {
				$scope.notes.splice(key, 1);
				break;
			}
		}
	});

	// Listen to clicks on note to start edit it
	$('body').on('click', '.note', $scope.startEditNote);

});

/**
 * Left-menu controller
 */
webApp.controller('LeftMenuCtrl', function ($scope, $rootScope) {

	$scope.goto = function (location) {
		$scope.location = $scope.$parent.location = location;
		$('#nav-menu').html($('#menu-item-' + location).html());
	};

	$scope.goto('all');

});

/**
 * Conflict controller (modal)
 */
webApp.controller('ConflictController', function ($scope, $rootScope, $modal, syncService) {

	// Get conflicted notes
	$scope.local = $modal.parameters.local;
	$scope.remote = $modal.parameters.remote;

	/**
	 * Resolve the conflict
	 */
	$scope.resolve = function (which) {
		// Resolve the conflict
		if (which === 'local') {
			// Keep local version
			if ($scope.remote) {
				$scope.local._revision = $scope.remote._revision
				syncService.updateResource('NOTE', $scope.local);
			}
			// Insert new note
			else {
				delete($scope.local._revision);
				delete($scope.local._id);
				delete($scope.local._user);
				var date = new Date().getTime();
				$scope.local.tmpId = "" + date + Math.floor(Math.random() * 1000000);
				syncService.newResource('NOTE', $scope.local);
			}
		} else if (which === 'remote') {
			// Keep remote version, so copy remote in local
			if ($scope.remote) {
				for (var key in $scope.remote) {
					$scope.local[key] = $scope.remote[key];
					syncService.updateResource('NOTE', $scope.local);
				}
			}
			// Delete note locally
			else {
				$rootScope.$broadcast('DESTROY_NOTE', $scope.local);
			}
		}
		// Restart syncing
		$rootScope.syncStatus = 'syncing';
		// Hide modal
		$modal.hide('notes-conflict');
	};

});


/**
 * =================================
 *         Normal Javascript
 * =================================
 */


/**
 * JQuery functions to move cursor to a position in an input element
 */
$.fn.focusPosition = function(position) {
	var e = $(this).get(0);
	e.focus();
	if (e.setSelectionRange) {
		e.setSelectionRange(position, position);
	} else if (e.createTextRange) {
		e = e.createTextRange();
		e.collapse(true);
		e.moveEnd('character', position);
		e.moveStart('character', position);
		e.select();
	}
}
$.fn.focusStart = function() {
	$(this).focusPosition(0);
}
$.fn.focusEnd = function() {
	$(this).focusPosition($(this).val().length);
}

/**
 * Jquery funtion to check if we are at the end of a task or not
 */
$.fn.isCursorOnEndOfTask = function() {
	return $(this).prop('selectionStart') === $(this).val().length;
};

/**
 * Jquery funtion to check if we are at the start of a task or not
 */
$.fn.isCursorOnStartOfTask = function() {
	return $(this).prop('selectionEnd') === 0;
};