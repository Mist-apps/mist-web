/* exported DownloadService */
'use strict';


/**
 * Download service
 * Provide a convenient manner to start a download for the user.
 * Prompt a download page to start the download.
 */
var DownloadService = {

	/**
	 * Start a download for the user
	 *
	 * @param name The name of the file to download
	 * @param data The file contents (href)
	 */
	download: function (name, data) {
		var link = $('#download-link').get(0);
		link.href = data;
		link.target = '_blank';
		link.download = name;
		link.click();
		link.href = '';
		link.target = '';
		link.download = '';
	}

};