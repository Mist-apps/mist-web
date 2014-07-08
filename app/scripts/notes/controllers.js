'use strict';


/**
 * Notes Controller
 */
webApp.controller('NotesCtrl', function ($scope, $rootScope, $modal, noteResource, toastr, syncService, NotesWebService) {

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
	};

	$scope.notes = [];
	$scope.getNotes();

	// Add notes web methods
	$scope.toggleTaskDone = NotesWebService.toggleTaskDone;
	$scope.titleKeyListener = NotesWebService.titleKeyListener;
	$scope.contentKeyListener = NotesWebService.contentKeyListener;
	$scope.taskKeyListener = NotesWebService.taskKeyListener;
	$scope.startEditTask = NotesWebService.startEditTask;
	$scope.stopEditTask = NotesWebService.stopEditTask;

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
	 * Add a new empty note
	 */
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
	 */
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
	 */
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
		// Pack the order numbers
		for (var key in $scope.notes) {
			if ($scope.notes[key].order > note.order) {
				$scope.notes[key].order--;
			}
		}
		// Stop edit the note
		$scope.stopEditNotes();
		// Inform sync service
		syncService.deleteResource('NOTE', note);
	};

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
	};

	/**
	 * Drag and drop
	 */
	$scope.within_enter = false;
	$scope.handleDragStart = function($event, note) {
		$($event.target).parent().css('opacity', 0.4);
		$event.originalEvent.dataTransfer.effectAllowed = 'move';
		$event.originalEvent.dataTransfer.setData('application/json', JSON.stringify(note));
	};
	$scope.handleDragEnd = function($event) {
		$($event.target).parent().css('opacity', 1);
	};
	$scope.handleDrop = function($event, noteB) {
/*		// Find noteA
		var noteA = JSON.parse($event.originalEvent.dataTransfer.getData('application/json'));
		for (var key in $scope.notes) {
			// If the note has an id, search if id match, else, search if tmpId match
			if ((noteA._id && $scope.notes[key]._id === noteA._id) || (!noteA._id && $scope.notes[key].tmpId === noteA.tmpId)) {
				noteA = $scope.notes[key];
				break;
			}
		}
		// Change order
		var save = noteB.order;
		for (var key in $scope.notes) {
			// If noteA is before noteB
			if (noteA.order < noteB.order && $scope.notes[key].order > noteA.order && $scope.notes[key].order <= noteB.order) {
				console.log($scope.notes[key].order + ' --');
				$scope.notes[key].order--;
			}
			// If noteA is after noteB
			if (noteA.order > noteB.order && $scope.notes[key].order < noteA.order && $scope.notes[key].order >= noteB.order) {
				console.log($scope.notes[key].order + ' ++');
				$scope.notes[key].order++;
			}
		}
		console.log(noteA.order + ' -> ' + save);
		noteA.order = save;
		// Draw grid
		$rootScope.masonry.draw();*/
	};
	$scope.handleDragEnter = function ($event, noteB) {
		$event.preventDefault();
		$scope.within_enter = true;
		setTimeout(function() { $scope.within_enter = false; }, 0);
		$event.originalEvent.dataTransfer.dropEffect = 'move';
		console.log('enter');
		// Find noteA, and ignore
		var noteA = JSON.parse($event.originalEvent.dataTransfer.getData('application/json'));
		if ((noteA._id && noteB._id === noteA._id) || (!noteA._id && noteB.tmpId === noteA.tmpId)) {
			return;
		}
		for (var key in $scope.notes) {
			// If the note has an id, search if id match, else, search if tmpId match
			if ((noteA._id && $scope.notes[key]._id === noteA._id) || (!noteA._id && $scope.notes[key].tmpId === noteA.tmpId)) {
				noteA = $scope.notes[key];
				break;
			}
		}

		console.log('A: ' + noteA._id + ' ' + noteA.order);
		console.log('B: ' + noteB._id + ' ' + noteB.order);
		console.log('==================================');

		// Change order
		var save = noteB.order;
		for (var key in $scope.notes) {
			// If noteA is before noteB
			if (noteA.order < noteB.order && $scope.notes[key].order > noteA.order && $scope.notes[key].order <= noteB.order) {
				$scope.notes[key].order--;
			}
			// If noteA is after noteB
			if (noteA.order > noteB.order && $scope.notes[key].order < noteA.order && $scope.notes[key].order >= noteB.order) {
				$scope.notes[key].order++;
			}
		}
		noteA.order = save;
		// Draw grid
		$rootScope.masonry.draw();
	};
	$scope.handleDragOver = function($event) {
		$event.preventDefault();
		console.log('over');
	};
	$scope.handleDragLeave = function($event) {
		$event.preventDefault();
		if (!$scope.within_enter) {
			console.log('leave');
		}
		$scope.within_enter = false;
	};

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
webApp.controller('LeftMenuCtrl', function ($scope, $timeout) {

	$scope.goto = function (location) {
		$scope.location = $scope.$parent.location = location;
		// Wait for navbar loaded
		$timeout(function () {
			$('#nav-menu').html($('#menu-item-' + location).html());
		});
	};

	$scope.goto('all');

});

/**
 * Conflict controller (modal)
 */
webApp.controller('ConflictController', function ($scope, $rootScope, $modal, syncService, NotesWebService) {

	// Get conflicted notes
	$scope.local = $modal.parameters.local;
	$scope.remote = $modal.parameters.remote;

	// Add notes web methods
	$scope.toggleTaskDone = NotesWebService.toggleTaskDone;
	$scope.titleKeyListener = NotesWebService.titleKeyListener;
	$scope.contentKeyListener = NotesWebService.contentKeyListener;
	$scope.taskKeyListener = NotesWebService.taskKeyListener;
	$scope.startEditTask = NotesWebService.startEditTask;
	$scope.stopEditTask = NotesWebService.stopEditTask;

	/**
	 * Resolve the conflict
	 */
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