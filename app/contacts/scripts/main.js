/* global ApplicationController */
'use strict';


// Perform bindings
ApplicationController.bind();
// Recover the session and get the notes
ApplicationController.recoverSession().done(function () {

});