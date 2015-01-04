/* global ApplicationController, EditorController, MenuController, NotesController */
'use strict';


// Perform bindings
ApplicationController.bind();
EditorController.bind();
MenuController.bind();
NotesController.bind();
// Recover the session and get the notes
ApplicationController.recoverSession().done(function () {
	NotesController.load();
});