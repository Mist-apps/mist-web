/* exported Masonry */
'use strict';


/**
 * Library to control the notes on a grid:
 * 		- Show them on a beatifull grid
 *		- Allow the drag and drop
 *		- Check the window resizing to re-draw the grid
 *
 * Configuration:
 *		- container 	a JQuery DOM object containing the notes to show/hide
 *		- itemWidth 	the width of a note item
 *		- gap			the gap between the notes in the grid
 *		- debounce 		the time frame in which multiple drawings may not be done
 *		- sensitivity 	the sensitivity of the drag start event
 *		- setOrder 		a callback called when a note is droped in another position (args: note order, new previous note order)
 */
var Masonry = function (config) {

	// Prepare config (merge with defaults)
	config = _.defaults(config || {}, {
		container:		$('#notes-container'),
		itemWidth:		250,
		gap:			20,
		debounce:		100,
		sensitivity:	100,
		setOrder: 		_.noop
	});

	// Internal attributes for grid drawing
	var columnNumber;
	var offsetTop = 80;
	var offsetLeft = 35;
	var lastShown = [];

	/**
	 * Initialize the column number
	 */
	var _initColumnNumber = function () {
		columnNumber = Math.floor((config.container.parent().width() + config.gap) / (config.itemWidth + config.gap));
		if (columnNumber < 1) {
			columnNumber = 1;
		}
	};

	_initColumnNumber();


	/**
	 * Draw the notes. Show some, and hide others.
	 * If some notes are hidden because there is not enough place, an ellipsis is shown (#more).
	 *
	 * This method cannot be called more than one time each time frame (defined in config).
	 *
	 * @param toShow The notes to show, they must have a "__view" jquery view property.
	 * @param toHide The notes to hide, they must have a "__view" jquery view property.
	 * @param moreToShow Whethert there are more notes to show or not
	 */
	var draw = _.debounce(function (toShow, toHide, moreToShow) {
		// If no arguments, create them
		if (!toShow && !toHide) {
			toShow = lastShown;
			toHide = [];
			moreToShow = $('#more').is(':visible');
		}
		// Else, save the notes to show
		else {
			lastShown = toShow;
		}
		// Initialize the columns height to 0
		var columns = [];
		for (var i = 0; i < columnNumber; i++) {
			columns[i] = 0;
		}
		// Set items to 0,0 position and hide them
		for (var i = 0; i < toHide.length; i++) {
			toHide[i].__view.css('top', '');
			toHide[i].__view.css('left', '');
			toHide[i].__view.removeClass('note-visible');
		}
		// Set items position and show them
		for (var i = 0; i < toShow.length; i++) {
			var col = _getSmallestCol(columns);
			toShow[i].__view.css('top', columns[col]);
			toShow[i].__view.css('left', ((config.itemWidth + config.gap) * col));
			toShow[i].__view.addClass('note-visible');
			// Remove the menu height if necessary
			if (toShow[i].__view.find('.note-menu').is(':visible')) {
				columns[col] += config.gap + toShow[i].__view.height() - toShow[i].__view.find('.note-menu').height();
			} else {
				columns[col] += config.gap + toShow[i].__view.height();
			}
		}
		// Prepare height
		var height = columns[_getHighestCol(columns)];
		height = height > config.gap ? height - config.gap : height;
		// Set container size
		config.container.get(0).style.height = height + 'px';
		config.container.get(0).style.width = (columnNumber * (config.itemWidth + config.gap) - config.gap) + 'px';
		// If there are more notes to show
		if (moreToShow) {
			$('#more').show();
		} else {
			$('#more').hide();
		}
	}, config.drawDebounce);

	/**
	 * Get the smallest column of the columns passed.
	 */
	var _getSmallestCol = function (columns) {
		var smallestCol = 0;
		var minColSize = 9999999;
		for (var key in columns) {
			if (columns[key] < minColSize) {
				minColSize = columns[key];
				smallestCol = key;
			}
		}
		return smallestCol;
	};

	/**
	 * Get the highest column of the columns passed.
	 */
	var _getHighestCol = function (columns) {
		var highestCol = 0;
		var maxColSize = 0;
		for (var key in columns) {
			if (columns[key] > maxColSize) {
				maxColSize = columns[key];
				highestCol = key;
			}
		}
		return highestCol;
	};

	// Check window resizing
	window.onresize = function () {
		_initColumnNumber();
		draw();
	};

	// Internal attributes for drag and drop
	var dragging = false;
	var interval;
	var mouse;
	var afterItem;
	var senseTimeout;

	/**
	 * Start dragging the note
	 */
	config.container.on('mousedown', '.drag-drop-zone', function (event) {
		// Wait sensitivity before start dragging
		senseTimeout = setTimeout(function () {
			// Get note
			var note = $(event.target).parent();
			// Set note in front and disable transitions
			note.addClass('note-edit note-dragging');
			// Save offsets
			offsetTop = note.parent().offset().top;
			offsetLeft = note.parent().offset().left;
			// Save relative position of the note from the mouse
			var relX = event.pageX - note.offset().left;
			var relY = event.pageY - note.offset().top;
			// Listen to mouse move
			$(document).bind('mousemove', function (event) {
				dragging = true;
				var diffX = event.pageX - relX - offsetLeft;
				var diffY = event.pageY - relY - offsetTop;
				note.css('left', diffX + 'px').css('top', diffY + 'px');
				mouse = {x: event.pageX, y: event.pageY};
				// Start moving other items
				if (!interval) {
					interval = setInterval(function () {
						_move(note);
					}, 50);
				}
			});
		}, config.sensitivity);
	});

	/**
	 * Stop dragging the note
	 */
	config.container.on('mouseup', '.drag-drop-zone', function (event) {
		// Clear the timeout if needed
		clearTimeout(senseTimeout);
		// Stop listening to mouse move
		$(document).unbind('mousemove');
		// Get note
		var note = $(event.target).parent();
		// Remove note from front
		note.removeClass('note-edit note-dragging');
		// If we were dragging
		if (dragging) {
			// Save afterItem
			var previous = afterItem;
			// We are no more dragging
			dragging = false;
			// Clear some variables
			afterItem = undefined;
			// Stop moving other items
			clearInterval(interval);
			interval = null;
			// Cancel click event if dragged
			$(event.target).one('click', false);
			// Set note order
			var noteOrder = parseInt(note.data('resource').order);
			var previousOrder = previous ? parseInt(previous.data('resource').order) : 0;
			config.setOrder(noteOrder, previousOrder);
		}
	});

	/**
	 * Move the note and redraw the grid
	 */
	var _move = function (note) {
		var columns = [];
		for (var i = 0; i < columnNumber; i++) {
			columns[i] = 0;
		}
		// Set each item position
		var items = lastShown;
		var lastDrawn;
		var skipped = false;
		for (var i = 0; i < items.length; i++) {
			// Skip the dragging item
			if (note.data('resource') === items[i]) {
				continue;
			}
			// Get col to draw into
			var col = _getSmallestCol(columns);
			// Get variables
			var mouseX = mouse.x - offsetLeft;
			var mouseY = mouse.y - offsetTop;
			var itemX = ((config.itemWidth + config.gap) * col);
			var itemY = columns[col];
			var noteItemHeight = note.height();
			// If the mouse is in a place where a note can be drawn, skip the place
			if (mouseX >= itemX && mouseX <= itemX + config.itemWidth && mouseY >= itemY && mouseY <= itemY + noteItemHeight) {
				// Add the note in the column (without drawing it, so it is skipped)
				columns[col] += config.gap + noteItemHeight;
				// Redraw the current element we have not drawn
				i--;
				// The dragged note is just after the last drawn item
				afterItem = lastDrawn ? lastDrawn : null;
				// No note drawn this time
				lastDrawn = undefined;
				// A note place has been skipped
				skipped = true;
			}
			// If
			else if (afterItem !== undefined && afterItem === lastDrawn) {
				// Add the note in the column (without drawing it, so it is skipped)
				columns[col] += config.gap + noteItemHeight;
				// Redraw the current element we have not drawn
				i--;
				// No note drawn this time
				lastDrawn = undefined;
				// A note place has been skipped
				skipped = true;
			}
			// Draw item
			else {
				// Set position and css
				items[i].__view.get(0).style.top = itemY + 'px';
				items[i].__view.get(0).style.left = itemX + 'px';
				items[i].__view.addClass('note-visible');
				// Add the note height in the column
				columns[col] += config.gap + items[i].__view.height();
				// Keep the last item drawn
				lastDrawn = items[i].__view;
			}
		}
		// If no place for note were skipped, then the note must be set at the end of the grid
		if (!skipped) {
			afterItem = lastDrawn;
		}
	};

	// Export public methods
	return {
		draw:	draw
	};

};