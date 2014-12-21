'use strict';


/**
 * Check and uncheck a task in a todo list
 */
var toggleTaskDone = function (note, task) {
	// Toggle
	task.done = !task.done;
	// Set modification date
	note.modificationDate = new Date().getTime();
	// Inform sync service
	syncService.updateResource('NOTE', note);
};

/**
 * Listen to key events on the note titles
 */
var titleKeyListener = function ($event, note) {
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
var contentKeyListener = function ($event, note) {
	// Inform sync service and set modification time if necessary
	if (!_keyMustBeIgnored($event.keyCode)) {
		note.modificationDate = new Date().getTime();
		syncService.updateResource('NOTE', note);
	}
};

/**
 * Listen for key events on the task contents
 */
var taskKeyListener = function ($event, note, index) {
	var target = $($event.target);
	var tasks = note.tasks;

	// "ENTER" key
	if ($event.keyCode === 13) {
		// Get two parts of the task
		var start = target.val().substring(0, target.prop('selectionStart'));
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
			// Focus out of the digest, because focus has a callback
			$timeout(function () {
				target.parent().next().find('.note-task-content').focusStart();
			});
			$event.preventDefault();
		}
	}
	// "UP" key
	else if ($event.which === 38) {
		if (target.isCursorOnStartOfTask() && target.parent().prev().length) {
			// Focus out of the digest, because focus has a callback
			$timeout(function () {
				target.parent().prev().find('.note-task-content').focusEnd();
			});
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
			tasks[index - 1].content += tasks[index].content;
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
			tasks[index].content += tasks[index + 1].content;
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
};

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
	return keysToIgnore.indexOf(keyCode) !== -1;
};

/**
 * Start editing task
 */
var startEditTask = function ($event) {
	$($event.target).parent().addClass('note-task-edit');
};

/**
 * Stop editing task
 */
var stopEditTask = function ($event) {
	$($event.target).parent().removeClass('note-task-edit');
};


/**
 * Get Notes from API
 */
var getNotes = function () {
	notes = [];
	LoaderService.start('getNotes');
	SyncService.getResources('NOTE', function (err, data) {
		if (err) {
			toastr.error('Unable to get notes (' + err.message + ')');
		} else {
			notes = data;
			_checkNotesOrder();
		}
		LoaderService.stop('getNotes');
	});
}


/**
 * Check the notes order for gaps, or duplicates
 */
var _checkNotesOrder = function () {
	// Check order
	var order = [];
	var other = [];
	// Split ordered and others
	for (var i in notes) {
		// If no order
		if (!notes[i].order) {
			other.push(notes[i]);
		}
		// If place taken
		else if (order[notes[i].order]) {
			other.push(notes[i]);
		}
		// Set in the ordered list
		else {
			order[notes[i].order] = notes[i];
		}
	}
	// Pack the ordered list
	var i = 1;
	for (var j in order) {
		if (order[j].order !== i) {
			order[j].order = i;
			// Inform sync service
			SyncService.updateResource('NOTE', order[j]);
		}
		i++;
	}
	// Add the unordered to the end
	for (var j in other) {
		if (other[j].order !== i) {
			other[j].order = i;
			// Inform sync service
			SyncService.updateResource('NOTE', other[j]);
		}
		i++;
	}
};


/**
 * ===========================================================================================================================================
 * Execution flow
 * ===========================================================================================================================================
 */

// Store the notes
var notes = [];
// Set the active menu item
var activeMenuItem = 'all';
// Get notes when session recovered
recovered.done(getNotes);











/**
 * Notes Controller
 *//*
webApp.controller('NotesCtrl', function ($scope, $rootScope, $modal, toastr, syncService, NotesWebService) {

	/**
	 * Filter the notes from the menu selection
	 *//*
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
	 * Add a new empty note
	 *//*
	$scope.addNewNote = function () {
		// Add new note
		var date = new Date().getTime();
		var tmpId = '' + date + Math.floor(Math.random() * 1000000);
		var order = $scope.notes.length + 1;
		var note = {tmpId: tmpId, title: '', content: '', creationDate: date, order: order};
		$scope.notes.push(note);
		// Inform sync service
		syncService.newResource('NOTE', note);
	};

	/**
	 * Add a new empty todo list
	 *//*
	$scope.addNewTodo = function () {
		// Add new todo list
		var date = new Date().getTime();
		var tmpId = '' + date + Math.floor(Math.random() * 1000000);
		var order = $scope.notes.length + 1;
		var note = {tmpId: tmpId, title: '', tasks: [{content: '', done: false}], creationDate: date, order: order};
		$scope.notes.push(note);
		// Inform sync service
		syncService.newResource('NOTE', note);
	};

	/**
	 * Delete a note
	 *//*
	$scope.deleteNote = function (note) {
		// Update note
		note.deleteDate = new Date().getTime();
		// Stop edit the note
		$scope.stopEditNotes();
		// Inform sync service
		syncService.updateResource('NOTE', note);
	};

	/**
	 * Delete definitively a note
	 *//*
	$scope.destroyNote = function (note) {
		// Search for note to delete
		for (var key in $scope.notes) {
			// If the note has an id, search if id match, else, search if tmpId match
			if ((note._id && $scope.notes[key]._id === note._id) || (!note._id && $scope.notes[key].tmpId === note.tmpId)) {
				$scope.notes.splice(key, 1);
				break;
			}
		}
		// Pack the order numbers
		for (var key in $scope.notes) {
			if ($scope.notes[key].order > note.order) {
				// Change order number
				$scope.notes[key].order--;
				// Inform sync service
				syncService.updateResource('NOTE', $scope.notes[key]);
			}
		}
		// Stop edit the note
		$scope.stopEditNotes();
		// Inform sync service
		syncService.deleteResource('NOTE', note);
	};

	/**
	 * Restore a deleted note
	 *//*
	$scope.restoreNote = function (note) {
		// Update note
		delete(note.deleteDate);
		// Stop edit the note
		$scope.stopEditNotes();
		// Inform sync service
		syncService.updateResource('NOTE', note);
	};

	/**
	 * Change color of note
	 *//*
	$scope.setColor = function (note, color) {
		// Set the color
		note.color = color;
		// Inform sync service
		syncService.updateResource('NOTE', note);
	}

	/**
	 * Start editing a note
	 *//*
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
			// Remove drag and drop zone
			$(this).find('.drag-drop-zone').hide();
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
	 *//*
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
		// Add drag and drop zone
		$('.drag-drop-zone').show();
		// Rebind the listener to start edit a note
		$('body').on('click', '.note', $scope.startEditNote);
		// Remove the binding to listen to escape key
		$('body').off('keydown', _escapeKeyListener);
		// Remove the binding to listen to clicks on dim
		$('.dim').off('click', $scope.stopEditNotes);
		// Reorganize grid
		$rootScope.masonry.draw();
	};

	// Listen to clicks on note to start edit it
	$('body').on('click', '.note', $scope.startEditNote);

	/**
	 * Custom listeners
	 *//*
	var _escapeKeyListener = function (event) {
		if (event.which === 27) {
			$scope.stopEditNotes(event);
		}
	};

	/**
	 * Import/Export
	 *//*
	$scope.importExport = function () {
		$modal.show('notes-import');
	};

	/**
	 * Move the note after the "previous" note.
	 * The arguments are the order position of the notes.
	 *//*
	$scope.moveNote = function (AOrder, BOrder) {
		// Set notes order
		for (var key in $scope.notes) {
			var note = $scope.notes[key];
			// Set the note to the right position
			if (note.order === AOrder) {
				if (AOrder <= BOrder) {
					note.order = BOrder;
				} else {
					note.order = BOrder + 1;
				}
				syncService.updateResource('NOTE', note);
			}
			// Push all the notes between the previous and the note one position to the right
			else if (note.order < AOrder && note.order > BOrder) {
				note.order++;
				syncService.updateResource('NOTE', note);
			}
			// Push all the notes between the note and the previous one position to the left
			else if (note.order > AOrder && note.order <= BOrder) {
				note.order--;
				syncService.updateResource('NOTE', note);
			}
		}
		// Draw grid
		$rootScope.masonry.draw();
	};

	/**
	 * When a conflict is detected, stop edit the note and show modal
	 *//*
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
	$scope.$on('REFRESH', function (event) {
		$scope.getNotes();
	});

});

/**
 * Conflict controller (modal)
 *//*
webApp.controller('ConflictController', function ($scope, $rootScope, $modal, syncService, NotesWebService) {

	// Get conflicted notes
	$scope.local = $modal.parameters.local;
	$scope.remote = $modal.parameters.remote;

	/**
	 * Resolve the conflict
	 *//*
	$scope.resolve = function (which) {
		// Resolve the conflict
		if (which === 'local') {
			// Keep local version
			if ($scope.remote) {
				$scope.local._revision = $scope.remote._revision;
				syncService.updateResource('NOTE', $scope.local);
			}
			// Insert new note
			else {
				delete($scope.local._revision);
				delete($scope.local._id);
				delete($scope.local._user);
				var date = new Date().getTime();
				$scope.local.tmpId = '' + date + Math.floor(Math.random() * 1000000);
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
 * Import/Export controller (modal)
 *//*
webApp.controller('NotesImportController', function ($rootScope, $scope, $http, $modal, $download, toastr, noteResource) {

	$scope.import = function () {
		var input = $('#modal-notes-import .import-file').get(0);
		if (input.files && input.files[0]) {
			// Prepare reader
			var reader = new FileReader();
			// Import when file read
			reader.onload = function (e) {
				// Callbacks
				var success = function (data) {
					$modal.hide('notes-import');
					toastr.success('Notes import successful, ' + data.number + ' notes imported.');
					$rootScope.$broadcast('REFRESH');
				};
				var error = function (httpResponse) {
					$modal.hide('notes-import');
					toastr.error('Error during notes import');
				};
				// Import
				if (input.files[0].type === 'application/json') {
					console.log(e.target.result);
					//noteResource.importJSON(e.target.result, success, error);
				} else {
					toastr.error('Wrong file type');
				}
			};
			// Read the file
			reader.readAsText(input.files[0]);
		}
	};

	$scope.export = function () {
		noteResource.exportJSON(
			function (data) {
				$modal.hide('notes-import');
				$download.download('notes.json', 'data:application/json;base64,' + btoa(JSON.stringify(data)));
			}, function (httpResponse) {
				$modal.hide('notes-import');
				toastr.error('Error during notes export');
			}
		);
	};

	$scope.close = function () {
		// Hide modal
		$modal.hide('notes-import');
	};

});
*/