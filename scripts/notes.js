'use strict';



/**
 * Notes resource
 */
webApp.factory('noteResource', ['$resource', function ($resource) {
	return $resource(API_URL + '/note/:id', {id: '@id'}, {
		update: {method: 'PUT'}
	});
}]);

/**
 * Resize directive to resize automatically textarea's during
 * writing.
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
 * Manage grid elements
 */
webApp.directive('grid', function ($rootScope, $timeout) {
	return {
		restrict: 'A',
		link: function(scope, element, attrs) {
			// Create masonry object if not created yet
			if (!$rootScope.masonry) {
				$rootScope.masonry = new Masonry(element[0].parentElement);
			}
			// Add element to grid
			$rootScope.masonry.append(element[0]);
			// Refresh layout when item destroyed
			scope.$on('$destroy', function () {
				$rootScope.masonry.remove(element[0]);
				$rootScope.masonry.draw();
			});
			// Refresh layout when position changes
			scope.$watch('$index', function (newIndex, oldIndex) {
				$rootScope.masonry.draw();
			});
		}
	};
});

/**
 * Notes Controller
 */
webApp.controller('NotesCtrl', function ($scope, $rootScope, noteResource, $timeout, toastr, syncService) {

	$scope.location = 'all';

	/**
	 * Get Notes from API
	 */
	$scope.getNotes = function () {
		var success = function (data, responseHeaders) {
			$scope.notes = data;
		};
		var error = function (httpResponse) {
			toastr.error('Unable to get notes');
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
		syncService.updateNote(note)
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
			syncService.updateNote(note);
		}
	};

	/**
	 * Listen to key events on the note contents
	 */
	$scope.contentKeyListener = function ($event, note) {
		// Inform sync service and set modification time if necessary
		if (!_keyMustBeIgnored($event.keyCode)) {
			note.modificationDate = new Date().getTime();
			syncService.updateNote(note);
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
			syncService.updateNote(note);
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
		syncService.newNote(note);
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
		syncService.newNote(note);
	}

	/**
	 * Delete a note
	 */
	$scope.deleteNote = function (note) {
		// Update note
		note.deleteDate = new Date().getTime();
		$scope.stopEditNotes();
		// Inform sync service
		syncService.updateNote(note);
	}

	/**
	 * Delete definitively a note
	 */
	$scope.destroyNote = function (note) {
		// Delete note
		for (var key in $scope.notes) {
			// If the note has an id, search if id match, else, search if tmpId match
			if ((note._id && $scope.notes[key]._id === note._id) || (!note._id && $scope.notes[key].tmpId === note.tmpId)) {
				$scope.notes.splice(key, 1);
				break;
			}
		}
		$scope.stopEditNotes();
		// Inform sync service
		syncService.deleteNote(note);
	}

	/**
	 * Restore a deleted note
	 */
	$scope.restoreNote = function (note) {
		// Update note
		delete(note.deleteDate);
		$scope.stopEditNotes();
		// Inform sync service
		syncService.updateNote(note);
	}

	/**
	 * Note editor management
	 */
	$scope.stopEditTasks = function () {
		$('.note-task-edit').removeClass('note-task-edit');
	};
	$scope.startEditTask = function () {
		$scope.stopEditTasks();
		$(this).parent().addClass('note-task-edit');
		// Remove the binding to start a new edit
		$('body').unbind('click', $scope.startEditTask);
	};
	$scope.startEditNote = function (event) {
		if (event.target.className !== '' && event.target.className !== 'note-task-icon') {
			// Show editor menu, and put the note on front
			$('.dim').addClass('dim-active');
			$(this).addClass('note-edit');
			$(this).find('.note-menu').addClass('note-menu-active');
			// Remove the binding to start a new edit
			$('body').unbind('click', $scope.startEditNote);
			// Reorganize grid
			$rootScope.masonry.draw();
		}
	};
	$scope.stopEditNotes = function () {
		$('.dim').removeClass('dim-active');
		$('.note').removeClass('note-edit');
		$('.note-menu').removeClass('note-menu-active');
		$('body').on('click', '.note', $scope.startEditNote);
		$scope.stopEditTasks();
		// Reorganize grid
		$rootScope.masonry.draw();
	};
	$scope.escapeKeyListener = function (event) {
		// If press "escape", stop edit
		if (event.which === 27) {
			$(this).blur();
			$scope.stopEditNotes();
		}
	};

	$('body').on('click', '.note', $scope.startEditNote);
	$('body').on('click', '.dim, .note-menu .button, .note-menu div', $scope.stopEditNotes);
	$('body').on('focus', '.note-task-content', $scope.startEditTask);
	$('body').on('focus', '.note-title', $scope.stopEditTasks);
	$('body').on('keydown', '.note-title, .note-content, .note-task-edit', $scope.escapeKeyListener);

});

/**
 * Left-menu controller
 */
webApp.controller('LeftMenuCtrl', function ($scope, $rootScope) {

	$rootScope.order = 'creationDate';
	$rootScope.reverse = false;

	$scope.goto = function (location) {
		$scope.location = $scope.$parent.location = location;
		$('#nav-menu').html($('#menu-item-' + location).html());
	};

	$scope.goto('all');

});

/**
 * Sync service to sync the notes with the server
 */
webApp.factory('syncService', function ($interval, $rootScope, noteResource, toastr) {

	$rootScope.syncStatus = 'synced';

	/**
	 * Handle sync status
	 */
	var setStatusSyncing = function () {
		// If the sync is set to stopped, it is not possible to change the status from the sync service
		if ($rootScope.syncStatus === 'stopped') return;
		// If the sync is in error, it is not possible to set it to syncing, wait for good sync before
		if ($rootScope.syncStatus === 'error') return;
		// Set status
		$rootScope.syncStatus = 'syncing';
	}
	var setStatusSynced = function () {
		// If the sync is set to stopped, it is not possible to change the status from the sync service
		if ($rootScope.syncStatus === 'stopped') return;
		// Set status
		$rootScope.syncStatus = 'synced';
	}
	var setStatusError = function () {
		// If the sync is set to stopped, it is not possible to change the status from the sync service
		if ($rootScope.syncStatus === 'stopped') return;
		// If the sync pass for the first time in error, show an error notification
		if ($rootScope.syncStatus !== 'error') toastr.error('Unable to sync notes');
		// Set status
		$rootScope.syncStatus = 'error';
	}

	/**
	 * Prevent leave page when syncing
	 */
	window.onbeforeunload = function(event) {
		event = event || window.event;
		var message = '';
		switch ($rootScope.syncStatus) {
			case 'syncing':		message = 'Notes are syncing, if you leave, you will loose some data...';	break;
			case 'error':		message = 'Error during sync, if you leave, you will loose some data...';	break;
			case 'stopped':		message = 'Sync is stopped, if you leave, you will loose some data...';		break;
		}
		if (message !== '') {
			if (event) { event.returnValue = message; }		// For IE and Firefox
			return message;									// For Safari
		}
	};

	//	Save notes to sync, new notes have no _id
	var newNotes = [];
	var dirtyNotes = {};
	var deletedNotes = {};

	/**
	 * Handle note modifications
	 */
	var newNote = function (note) {
		newNotes.push(note);
		setStatusSyncing();
	};
	var updateNote = function (note) {
		if (note._id) {
			dirtyNotes[note._id] = note;
			setStatusSyncing();
		}
	};
	var deleteNote = function (note) {
		if (note._id) {
			delete(dirtyNotes[note._id]);
			deletedNotes[note._id] = note;
			setStatusSyncing();
		}
	};

	/**
	 * Sync method
	 */
	var syncErrors = {};
	var sync = function () {
		// Do not sync if stopped
		if ($rootScope.syncStatus === 'stopped') {
			return;
		}
		// Get actions to do, and check if something to do
		var todo = newNotes.length + Object.keys(dirtyNotes).length + Object.keys(deletedNotes).length;
		if (todo === 0) {
			setStatusSynced();
			return;
		}
		// Response methods
		var success = function (note) {
			if (note._id) {
				delete(syncErrors[note._id]);
			} else {
				delete(syncErrors.new);
			}
			checkEndOfSync();
		};
		var error = function (note) {
			if (note._id) {
				syncErrors[note._id] = 1;
			} else {
				syncErrors.new = 1;
			}
			checkEndOfSync();
		};
		var checkEndOfSync = function () {
			todo--;
			if (todo === 0) {
				if (Object.keys(syncErrors).length === 0) {
					setStatusSynced();
				} else {
					setStatusError();
				}
			}
		}
		// New notes
		newNotes.forEach(function (note, key) {
			newNotes.splice(key, 1);
			var clone = $.extend(true, {}, note);
			delete(clone.tmpId);
			noteResource.save(clone,
				function (data) {
					success(note);
					note._id = data._id;
					note._revision = data._revision;
					delete(note.tmpId);
				}, function () {
					newNote(note);
					error(note);
				}
			);
		});
		// Dirty notes
		Object.keys(dirtyNotes).forEach(function (id) {
			var note = dirtyNotes[id];
			delete(dirtyNotes[id]);
			noteResource.update({id: id}, note,
				function (data) {
					success(note);
					note._revision = data._revision;
				}, function () {
					updateNote(note);
					error(note);
				}
			);
		});
		// Deleted Notes
		Object.keys(deletedNotes).forEach(function (id) {
			var note = deletedNotes[id];
			delete(deletedNotes[id]);
			noteResource.delete({id: id},
				function () {
					success(note);
				}, function () {
					deleteNote(note);
					error(note);
				}
			);
		});
	};

	// Listen if the user is disconnected to stop syncing
	$rootScope.$watch('user', function (user) {
		if (user === null) {
			$rootScope.syncStatus = 'stopped';
		} else {
			$rootScope.syncStatus = 'syncing';
		}
	})

	// Sync the changes every X seconds
	var timer = $interval(sync, 2000);

	// Return change handling methods
	return {
		newNote:		newNote,
		updateNote:		updateNote,
		deleteNote:		deleteNote
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