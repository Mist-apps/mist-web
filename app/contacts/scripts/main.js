/* global ApplicationController, ContactsController */
'use strict';


// Perform bindings
ApplicationController.bind();
ContactsController.bind();
// Recover the session and get the notes
ApplicationController.recoverSession().done(function () {
	ContactsController.load();
});