'use strict';


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
};
$.fn.focusStart = function() {
	$(this).focusPosition(0);
};
$.fn.focusEnd = function() {
	$(this).focusPosition($(this).val().length);
};

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