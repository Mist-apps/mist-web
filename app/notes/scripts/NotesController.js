/* exported NotesController */
/* global Application, Masonry, SyncService, LoaderService, ModalService, EditorController */
'use strict';


/**
 * Notes controller
 */
var NotesController = (function () {

	// Store the notes
	Application.notes = [];
	// Set the active menu item
	Application.activeMenuItem = 'all';
	// Number of notes to show (maximum)
	Application.maxToShow = 15;
	// Get note template
	var templateNote = _.template($('#template-note').html());

	/**
	 * Get Notes from API
	 */
	var load = function () {
		// Start load
		LoaderService.start('NotesController.load');
		// Clean the previous notes
		Application.notes = [];
		$('#notes-container').empty();
		// Ask for the notes
		SyncService.getResources('NOTE', function (err, data) {
			if (err) {
				toastr.error('Unable to get notes (' + err.message + ')');
			} else {
				Application.notes = data;
				_checkNotesOrder();
				// Show notes, after...
				var showNotes = _.after(Application.notes.length, _showNotes);
				// Prepare the notes in the container
				_.each(Application.notes, function (note, index) {
					_.delay(function (note) {
						_prepareNote(note);
						showNotes();
					}, index * 30, note);
				});
			}
		});
	};

	/**
	 * Method for the SyncService, to sync the note view with the resource
	 */
	var _syncNote = function (note, view) {
		if (!view) {
			view = note.__view;
		}
		note.title = view.find('.note-title').val();
		if (!note.tasks) {
			note.content = view.find('.note-content').val();
		} else {
			note.tasks = [];
			view.find('.note-task').each(function () {
				note.tasks.push({
					done: 		$(this).hasClass('note-task-done'),
					content: 	$(this).find('.note-task-content').val()
				});
			});
		}
	};

	/**
	 * Check the notes order for gaps, or duplicates
	 */
	var _checkNotesOrder = function () {
		// Check order
		var order = [];
		var other = [];
		// Split ordered and others
		for (var i in Application.notes) {
			// If no order
			if (!Application.notes[i].order) {
				other.push(Application.notes[i]);
			}
			// If place taken
			else if (order[Application.notes[i].order]) {
				other.push(Application.notes[i]);
			}
			// Set in the ordered list
			else {
				order[Application.notes[i].order] = Application.notes[i];
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
	 * Prepare one note with it's DOM view and it's sync function.
	 */
	var _prepareNote = function (note) {
		// Create DOM element, and bind it
		var item = $(templateNote(note));
		note.__view = item;
		note.__sync = _syncNote;
		// Set data to bind the resource
		item.data('resource', note);
		// Add DOM element to notes container
		$('#notes-container').append(note.__view);
		// Set textarea height
		item.find('textarea').each(function () {
			this.style.height = this.scrollHeight + 'px';
		});
	};

	/**
	 * Show the notes on the grid
	 */
	var _showNotes = function () {
		// Sort the notes
		Application.notes = _.sortBy(Application.notes, 'order');
		// Create the search function
		var search = function (item) {
			if (!Application.search || item.title.indexOf(Application.search) !== -1) {
				return true;
			}
			if (!item.tasks) {
				return item.content.indexOf(Application.search) !== -1;
			} else {
				for (var i in item.tasks) {
					if (item.tasks[i].content.indexOf(Application.search) !== -1) {
						return true;
					}
				}
			}
			return false;
		};
		// Filter the notes
		var partitions = [];
		switch (Application.activeMenuItem) {
			case 'all':		partitions = _.partition(Application.notes, function (item) {return !item.deleteDate && search(item);});
							break;
			case 'notes':	partitions = _.partition(Application.notes, function (item) {return !item.deleteDate && !item.tasks && search(item);});
							break;
			case 'todo':	partitions = _.partition(Application.notes, function (item) {return !item.deleteDate && item.tasks && search(item);});
							break;
			case 'trash':	partitions = _.partition(Application.notes, function (item) {return !!item.deleteDate && search(item);});
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
		var moreToShow = false;
		if (partitions[0].length > Application.maxToShow) {
			$('#more #nbr-total').html(partitions[0].length);
			partitions[1] = partitions[1].concat(partitions[0].slice(Application.maxToShow));
			partitions[0] = partitions[0].slice(0, Application.maxToShow);
			$('#more #nbr-shown').html(partitions[0].length);
			moreToShow = true;
		}
		// Stop loading
		LoaderService.stop('NotesController.load');
		// Draw the notes
		masonry.draw(partitions[0], partitions[1], moreToShow);
	};

	/**
	 * Move the note after the "previous" note.
	 * The arguments are the order position of the notes.
	 */
	var _moveNote = function (AOrder, BOrder) {
		console.log(AOrder + ' -> ' + BOrder);
		// Set notes order
		for (var key in Application.notes) {
			var note = Application.notes[key];
			// Set the note to the right position
			if (note.order === AOrder) {
				if (AOrder <= BOrder) {
					note.order = BOrder;
				} else {
					note.order = BOrder + 1;
				}
				SyncService.updateResource('NOTE', note);
			}
			// Push all the notes between the previous and the note one position to the right
			else if (note.order < AOrder && note.order > BOrder) {
				note.order++;
				SyncService.updateResource('NOTE', note);
			}
			// Push all the notes between the note and the previous one position to the left
			else if (note.order > AOrder && note.order <= BOrder) {
				note.order--;
				SyncService.updateResource('NOTE', note);
			}
		}
		// Draw the notes again
		_showNotes();
	};

	/**
	 * Bind the actions on the DOM elements
	 */
	var bind = function () {
		// On clicking on the left menu, refresh the notes
		$('.menu-item').click(function () {
			Application.maxToShow = 15;
			_showNotes();
		});
		// On clicking on the "ellipsis" button, increase the max number of notes to show
		$('#more span').click(function () {
			Application.maxToShow += 10;
			_showNotes();
		});
		// Add a new empty note
		$('#add-menu-note').click(function () {
			// Add new note
			var date = _.now();
			var tmpId = '' + date + _.uniqueId();
			var order = Application.notes.length + 1;
			var note = {tmpId: tmpId, title: '', content: '', creationDate: date, order: order};
			Application.notes.push(note);
			_prepareNote(note);
			_showNotes();
			// Inform sync service
			SyncService.newResource('NOTE', note);
		});
		// Add a new empty todo list
		$('#add-menu-todo').click(function () {
			// Add new todo list
			var date = _.now();
			var tmpId = '' + date + _.uniqueId();
			var order = Application.notes.length + 1;
			var note = {tmpId: tmpId, title: '', tasks: [{content: '', done: false}], creationDate: date, order: order};
			Application.notes.push(note);
			_prepareNote(note);
			_showNotes();
			// Inform sync service
			SyncService.newResource('NOTE', note);
		});
		// Import/Export
		$('#add-menu-import').click(function () {
			ModalService.show('import');
		});
		// When a conflict is detected, stop edit the note and show modal
		SyncService.on('conflict', function (notes) {
			EditorController.stop();
			ModalService.show('conflict', notes);
		});
		// Listen to the search field
		$('#nav-search-content input').on('change input', function () {
			_showNotes();
		});
	};

	// Initialize Masonry
	var masonry = new Masonry({setOrder: _moveNote});

	/**
	 * Exports
	 */
	return {
		bind:		bind,
		load:		load,
		refresh:	_showNotes,
		newNote:	_prepareNote
	};

})();