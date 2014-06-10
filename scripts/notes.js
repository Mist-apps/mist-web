'use strict';


/**
 * Notes Controller
 */
webApp.controller('NotesCtrl', function ($scope, noteResource, $timeout, toastr, syncService) {

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
		// Inform sync service
		syncService.updateNote(note)
	};

	/**
	 * Listen to key events on the note contents
	 */
	$scope.contentKeyListener = function ($event, note) {
		// Inform sync service
		syncService.updateNote(note)
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
		// Inform sync service
		syncService.updateNote(note);
	}

	/**
	 * Add a new empty note
	 */
	$scope.addNewNote = function () {
		// Add new note
		var date = new Date().getTime();
		var note = {title: '', content: '', creationDate: date};
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
		var note = {title: '', tasks: [{content: '', done: false}], creationDate: date};
		$scope.notes.push(note);
		// Inform sync service
		syncService.newNote(note);
	}

	/**
	 * Delete a note
	 */
	$scope.deleteNote = function (note) {
		// Update note
		var date = new Date().getTime();
		note.deleteDate = date;
		stopEditNotes();
		// Inform sync service
		syncService.updateNote(note);
	}

	/**
	 * Delete definitively a note
	 */
	$scope.destroyNote = function (note) {
		// Delete note
		for (var key in $scope.notes) {
			if ($scope.notes[key]._id === note._id) {
				$scope.notes.splice(key, 1);
				break;
			}
		}
		stopEditNotes();
		// Inform sync service
		syncService.deleteNote(note);
	}

	/**
	 * Restore a deleted note
	 */
	$scope.restoreNote = function (note) {
		// Update note
		delete(note.deleteDate);
		stopEditNotes();
		// Inform sync service
		syncService.updateNote(note);
	}

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
webApp.factory('syncService', function ($interval, $rootScope, noteResource) {

	$rootScope.syncStatus = 'synced';

	/**
	 * Handle sync status
	 */
	var setStatusSyncing = function () {
		$rootScope.syncStatus = 'syncing';
	}
	var setStatusSynced = function () {
		$rootScope.syncStatus = 'synced';
	}
	var setStatusError = function () {
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
		// Get actions to do, and check if some things to do
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
			noteResource.save(note, function (data) { success(note); note._id = data._id; }, function () { newNote(note); error(note); });
		});
		// Dirty notes
		Object.keys(dirtyNotes).forEach(function (id) {
			var note = dirtyNotes[id];
			delete(dirtyNotes[id]);
			noteResource.update({id: id}, note, function () { success(note); }, function () { updateNote(note); error(note); });
		});
		// Deleted Notes
		Object.keys(deletedNotes).forEach(function (id) {
			var note = deletedNotes[id];
			delete(deletedNotes[id]);
			noteResource.delete({id: id}, function () { success(note); }, function () { deleteNote(note); error(note); });
		});
	};

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
 * Note editor management
 */
var stopEditTasks = function () {
	$('.note-task-edit').removeClass('note-task-edit');
};
var startEditTask = function () {
	stopEditTasks();
	$(this).parent().addClass('note-task-edit');
	// Remove the binding to start a new edit
	$('body').unbind('click', startEditTask);
};
var startEditNote = function (event) {
	if (event.target.className !== '' && event.target.className !== 'note-task-icon') {
		// Show editor menu, and put the note on front
		$('.editor').addClass('editor-active');
		$(this).addClass('note-edit');
		$(this).find('.note-menu').addClass('note-menu-active');
		// Remove the binding to start a new edit
		$('body').unbind('click', startEditNote);
	}
};
var stopEditNotes = function () {
	$('.editor').removeClass('editor-active');
	$('.note').removeClass('note-edit');
	$('.note-menu').removeClass('note-menu-active');
	$('body').on('click', '.note', startEditNote);
	stopEditTasks();
};
var escapeKeyListener = function (event) {
	// If press "escape", stop edit
	if (event.which === 27) {
		$(this).blur();
		stopEditNotes();
	}
};
$('body').on('click', '.note', startEditNote);
$('body').on('click', '.editor, .note-menu .button, .note-menu div', stopEditNotes);
$('body').on('focus', '.note-task-content', startEditTask);
$('body').on('focus', '.note-title', stopEditTasks);
$('body').on('keydown', '.note-title, .note-content, .note-task-edit', escapeKeyListener);


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