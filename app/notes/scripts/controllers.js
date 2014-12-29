'use strict';


/*
 * ===================================================
 * Start/Stop the editor
 * ===================================================
 */


/**
 * Start editing a note
 */
var startEditNote = function (event) {
	if (event.target.className !== '' && event.target.className !== 'note-task-icon') {
		// Add menu
		var menu = $(menuPartial);
		var color = $(this).data('resource').color;
		color = color ? color : 'white';
		menu.find('[data-color=' + color + ']').addClass('fa-check-square');
		$(this).append(menu);
		// Set tabindex
		$(this).find('.note-title').attr('tabindex', 1);
		$(this).find('.note-content').attr('tabindex', 1);
		$(this).find('.note-task-content').attr('tabindex', 1);
		$(this).find('button').attr('tabindex', 1);
		// Show editor
		ModalService.dim();
		$(this).addClass('note-edit');
		// Remove drag and drop zone
		$(this).find('.drag-drop-zone').hide();
		// Remove the binding to start a new edit
		$('body').off('click', startEditNote);
		// Listen to escape key
		$('body').on('keydown', _escapeKeyListener);
		// Listen to clicks on dim
		$('.dim').on('click', stopEditNotes);
	}
};

/**
 * Stop editing the notes
 */
var stopEditNotes = function (event) {
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
	ModalService.clear();
	$('.note').removeClass('note-edit');
	$('.note-menu').remove();
	// Add drag and drop zone
	$('.drag-drop-zone').show();
	// Rebind the listener to start edit a note
	$('body').on('click', '.note', startEditNote);
	// Remove the binding to listen to escape key
	$('body').off('keydown', _escapeKeyListener);
	// Remove the binding to listen to clicks on dim
	$('.dim').off('click', stopEditNotes);
};

/**
 * Custom listeners
 */
var _escapeKeyListener = function (event) {
	if (event.which === 27) {
		stopEditNotes(event);
	}
};

// Listen to clicks on note to start edit it
$('body').on('click', '.note', startEditNote);
$('body').on('click', '.note-menu button', stopEditNotes);


/*
 * ===================================================
 * Editor behaviour
 * ===================================================
 */


/**
 * Check and uncheck a task in a todo list
 */
$('body').on('click', '.note-task-icon', function (event) {
	// Toggle
	$(this).parent().toggleClass('note-task-done');
	// Inform sync service
	SyncService.updateResource('NOTE', $(this).closest('.note').data('resource'));
});

/**
 * Listen to key events on the note titles
 */
$('body').on('keydown', '.note-title', function (event) {
	// "ENTER" key
	if (event.keyCode === 13) {
		var next = $(this).next();
		// Go to content
		if (next.hasClass('note-content')) {
			next.focus();
		}
		// Go to task
		else if (next.hasClass('note-tasks')) {
			next.find('.note-task-content').first().focus();
		}
		// Stop key default behaviour
		event.preventDefault();
	}
	// Inform sync service if necessary
	else if (!_keyMustBeIgnored(event.keyCode)) {
		SyncService.updateResource('NOTE', $(this).closest('.note').data('resource'));
	}
});

/**
 * Listen to key events on the note contents
 */
$('body').on('keydown', '.note-content', function (event) {
	// Inform sync service if necessary
	if (!_keyMustBeIgnored(event.keyCode)) {
		SyncService.updateResource('NOTE', $(this).closest('.note').data('resource'));
	}
});

/**
 * Listen for key events on the task contents
 */
$('body').on('keydown', '.note-task-content', function (event) {
	var target = $(this);
	var resource = target.closest('.note').data('resource');
	// "ENTER" key
	if (event.keyCode === 13) {
		// Get two parts of the task
		var start = target.val().substring(0, target.prop('selectionStart'));
		var end = target.val().substring(target.prop('selectionEnd'));
		// Update and add views
		target.val(start);
		var next = $(taskPartial);
		target.parent().after(next);
		next.find('.note-task-content').val(end).focusStart();
		// Stop key default behaviour
		event.preventDefault();
	}
	// "DOWN" key
	else if (event.which === 40) {
		if (target.isCursorOnEndOfTask() && target.parent().next().length) {
			target.parent().next().find('.note-task-content').focusStart();
			event.preventDefault();
		}
	}
	// "UP" key
	else if (event.which === 38) {
		if (target.isCursorOnStartOfTask() && target.parent().prev().length) {
			target.parent().prev().find('.note-task-content').focusEnd();
			event.preventDefault();
		}
	}
	// "BACKSPACE" key
	else if (event.which === 8) {
		var prev = target.parent().prev();
		// If there is a previous task, and the cursor is on the start of the task
		if (target.isCursorOnStartOfTask() && prev.length) {
			var prevContent = prev.find('.note-task-content');
			var pos = prevContent.val().length;
			// Merge the two tasks
			prevContent.val(prevContent.val() + target.val());
			target.parent().remove();
			// Move caret position and resize the input
			prevContent.trigger('input');
			prevContent.focusPosition(pos);
			// Stop key default behaviour
			event.preventDefault();
		}
	}
	// "DELETE" key
	else if (event.which === 46) {
		var next = target.parent().next();
		// If there is a next task, and the cursor is on the end of the task
		if (target.isCursorOnEndOfTask() && next.length) {
			var pos = target.val().length;
			// Merge the two tasks
			target.val(target.val() + next.find('.note-task-content').val());
			next.remove();
			// Move caret position and resize the input
			target.trigger('input');
			target.focusPosition(pos);
			// Stop key default behaviour
			event.preventDefault();
		}
	}
	// Inform sync service if necessary
	if (!_keyMustBeIgnored(event.keyCode)) {
		SyncService.updateResource('NOTE', resource);
	}
});

/**
 * Resize automatically the notes
 */
$('body').on('change input', 'textarea', function () {
	// Resize the element
	this.style.height = 'auto';
	this.style.height = this.scrollHeight + 'px';
	// Refresh grid layout
	_showNotes();
});

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
$('body').on('focus', '.note-task-content', function () {
	$(this).parent().addClass('note-task-edit');
});

/**
 * Stop editing task
 */
$('body').on('blur', '.note-task-content', function () {
	$(this).parent().removeClass('note-task-edit');
});


/*
 * ===================================================
 * Miscellaneous
 * ===================================================
 */


/**
 * Method for the SyncService, to sync the note view with the resource
 */
var _syncNote = function (note) {
	note.title = note.__view.find('.note-title').val();
	if (!note.tasks) {
		note.content = note.__view.find('.note-content').val();
	} else {
		note.tasks = [];
		note.__view.find('.note-task').each(function () {
			note.tasks.push({
				done: 		$(this).hasClass('note-task-done'),
				content: 	$(this).find('.note-task-content').val()
			});
		})
	}
}

/**
 * On clicking on the left menu, refresh the notes
 */
$('.menu-item').click(function () {
	maxToShow = 10;
	_showNotes();
});

/**
 * On clicking on the "ellipsis" button, increase the max number of notes to show
 */
$('#more span').click(function () {
	maxToShow += 10;
	_showNotes();
});


/*
 * ===================================================
 * Retrieve notes and show them
 * ===================================================
 */


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
			// Show notes, after...
			var showNotes = _.after(notes.length, function () {
				LoaderService.stop('getNotes');
				_showNotes();
			});
			// Prepare the notes in the container
			_.each(notes, function (note, index) {
				_.delay(function (note) {
					_prepareNote(note);
					showNotes();
				}, index * 10, note);
			});
		}
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
	// Sort the notes
	notes = _.sortBy(notes, 'order');
};

/**
 * Prepare one note with it's DOM view and it's sync function.
 */
var _prepareNote = function (note) {
	// Create DOM element, and bind it
	var item = $(notePartial);
	note.__view = item[2];
	note.__sync = _syncNote;
	// Set data to bind the resource
	item.data('resource', note);
	// Set color
	if (note.color) {
		item.addClass('note-' + note.color);
	}
	// Set title
	$('.note-title', item).val(note.title);
	// If note
	if (!note.tasks) {
		$('.note-content', item).val(note.content);
		$('.note-tasks', item).remove();
	}
	// If todo list
	else {
		// Remove the initial task and reuse it for each task
		$('.note-content', item).remove();
		var task = $(taskPartial);
		var tasks = $('.note-tasks', item);
		// For each task
		for (var i in note.tasks) {
			var clone = task.clone();
			if (note.tasks[i].done) {
				clone.addClass('note-task-done');
			}
			$('.note-task-content', clone).val(note.tasks[i].content);
			tasks.append(clone);
		}
	}
	// Add DOM element to notes container
	$('#notes-container').append(note.__view);
	// Set textarea height
	var textarea = $(note.__view).find('textarea').get(0);
	textarea.style.height = 'auto';
	textarea.style.height = textarea.scrollHeight + 'px';
}

/**
 * Show the notes on the page
 */
var _showNotes = function () {
	// Filter the notes
	var partitions = [];
	switch (activeMenuItem) {
		case 'all':		partitions = _.partition(notes, function (item) {return !item.deleteDate});
						break;
		case 'notes':	partitions = _.partition(notes, function (item) {return !item.deleteDate && !item.tasks});
						break;
		case 'todo':	partitions = _.partition(notes, function (item) {return !item.deleteDate && item.tasks});
						break;
		case 'trash':	partitions = _.partition(notes, function (item) {return !!item.deleteDate});
						break;
		default:		toastr.error('Unknown menu item');
						break;
	}
	// If there are notes to shown
	if (partitions[0].length > 0) {
		// Remove the "No notes" message
		$('#nothing-message').hide();
	} else {
		// Show the "No notes" message
		$('#nothing-message').show();
	}
	// If there are more notes to show than the maximum authorized, transfer them in the second array (to hide)
	if (partitions[0].length > maxToShow) {
		partitions[1] = partitions[1].concat(partitions[0].slice(maxToShow));
		partitions[0] = partitions[0].slice(0, maxToShow);
		//$('#more').show();
	} else {
		//$('#more').hide();
	}
	// Draw the notes
	masonry.draw(partitions[0], partitions[1]);
	if (partitions[0].length > maxToShow) {
		$('#more').show();
	} else {
		$('#more').hide();
	}
};


/*
 * ===================================================
 * Right menu management
 * ===================================================
 */


/**
 * Add a new empty note
 */
$('#add-menu-note').click(function () {
	// Add new note
	var date = new Date().getTime();
	var tmpId = '' + date + Math.floor(Math.random() * 1000000);
	var order = notes.length + 1;
	var note = {tmpId: tmpId, title: '', content: '', creationDate: date, order: order};
	notes.push(note);
	_prepareNote(note);
	_showNotes();
	// Inform sync service
	SyncService.newResource('NOTE', note);
});

/**
 * Add a new empty todo list
 */
$('#add-menu-todo').click(function () {
	// Add new todo list
	var date = new Date().getTime();
	var tmpId = '' + date + Math.floor(Math.random() * 1000000);
	var order = notes.length + 1;
	var note = {tmpId: tmpId, title: '', tasks: [{content: '', done: false}], creationDate: date, order: order};
	notes.push(note);
	_prepareNote(note);
	_showNotes();
	// Inform sync service
	SyncService.newResource('NOTE', note);
});

/**
 * Import/Export
 */
$('#add-menu-import').click(function () {
	ModalService.show('import');
});


/*
 * ===================================================
 * Note menu buttons
 * ===================================================
 */


/**
 * Delete a note
 */
$('body').on('click', '#note-menu-delete', function () {
	// Update note
	var note = $(this).closest('.note').data('resource');
	note.deleteDate = _.now();
	// Stop edit the note
	stopEditNotes();
	// Show or hide the note
	_showNotes();
	// Inform sync service
	SyncService.updateResource('NOTE', note);
});

/**
 * Delete definitively a note
 */
$('body').on('click', '#note-menu-destroy', function () {
	// Remove note
	var note = $(this).closest('.note').data('resource');
	_showNotes();
	$(this).closest('.note').remove();
	// Search for note to delete
	for (var key in notes) {
		// If the note has an id, search if id match, else, search if tmpId match
		if ((note._id && notes[key]._id === note._id) || (!note._id && notes[key].tmpId === note.tmpId)) {
			notes.splice(key, 1);
			break;
		}
	}
	// Pack the order numbers
	for (var key in notes) {
		if (notes[key].order > note.order) {
			// Change order number
			notes[key].order--;
			// Inform sync service
			SyncService.updateResource('NOTE', notes[key]);
		}
	}
	// Stop edit the note
	stopEditNotes();
	// Inform sync service
	SyncService.deleteResource('NOTE', note);
});

/**
 * Restore a deleted note
 */
$('body').on('click', '#note-menu-restore', function () {
	// Update note
	var note = $(this).closest('.note').data('resource');
	delete note.deleteDate;
	// Stop edit the note
	stopEditNotes();
	// Show or hide the note
	_showNotes();
	// Inform sync service
	SyncService.updateResource('NOTE', note);
});

/**
 * Change color of note
 */
$('body').on('click', '.note-menu ul .fa', function () {
	var view = $(this).closest('.note');
	var note = view.data('resource');
	// Update button
	$(this).removeClass('fa-square').addClass('fa-check-square');
	$(this).siblings('.fa').removeClass('fa-check-square').addClass('fa-square');
	// Update note color
	view.removeClass('note-' + note.color)
	note.color = $(this).data('color');
	view.addClass('note-' + note.color);
	// Inform sync service
	SyncService.updateResource('NOTE', note);
});


/*
 * ===================================================
 * Execution flow
 * ===================================================
 */


// Store the notes
var notes = [];
// Set the active menu item
var activeMenuItem = 'all';
// Number of notes to show (maximum)
var maxToShow = 15;
// Initialize Masonry
var masonry = new Masonry($('#notes-container').get(0));
$('body').on('mousedown', '.drag-drop-zone', masonry.dragStart);
$('body').on('mouseup', '.drag-drop-zone', function (event) {
	masonry.dragEnd(event);
	masonry.draw();
});
// Get notes when session recovered
recovered.done(getNotes);

// Load partials
// TODO be sure it is done before get notes...
var notePartial;
var menuPartial;
var taskPartial;
$.get('partials/note.html').done(function (html) {
	notePartial = html;
});
$.get('partials/note-menu.html').done(function (html) {
	menuPartial = html;
});
$.get('partials/note-task.html').done(function (html) {
	taskPartial = html;
});





/**
 * Notes Controller
 *//*
webApp.controller('NotesCtrl', function ($scope, $rootScope, $modal, toastr, syncService, NotesWebService) {

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