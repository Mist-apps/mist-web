Mist Web Application
====================

The Mist web application is the main front-end for the Mist API. It offers currently only a Notes management application. The front-end is a HTML5/CSS/JavaScript web application based on the AngularJS Framework. It is available on recent browsers only (tested Firefox/Chromium)

## Installation

The web application is very easy to install. It only needs a web-server to serve the static files. If you already installed the mist-api, follow these steps:

#### For a production installation:
* install nginx: `sudo apt-get install nginx`
* add the vhost: `sudo mv mist-web /etc/nginx/etc/sites-available/mist-web && sudo chown root:root /etc/nginx/etc/sites-available/mist-web`
* enable the vhost: `sudo ln -s /etc/nginx/etc/sites-available/mist-web /etc/nginx/etc/sites-enabled/mist-web`
* copy the content of the "dist" folder of a dev installation, or the release taken on the github page, into the web server folder: `sudo rsync -a --delete /path/to/sources/dist/ /var/www/mist-web`
* change the ownership of the files: `sudo chown -R www-data:www-data /var/www/mist-web`
* reload nginx: `sudo service nginx reload`

It's done ! You may access the web application on http://localhost, change the server name in the vhost if you have your own domain... To update the site, only rsync the files again and set the rights.

#### For a development installation:
* install nodejs: `sudo apt-get install nodejs`
* clone the repository where you want: `git clone https://github.com/Mist-apps/mist-web.git /path/to/sources`
* install the grunt client, and bower: `sudo npm install -g grunt-cli bower`
* go into the sources folder: `cd /path/to/sources`
* install the bower dependencies: `bower install`
* install the node dependencies: `npm install`

It's done ! You may start develop the web application:
* The web application sources are in the `app` folder
* To use a built-in web server and watch changes in the sources, use `grunt serve` in the root folder
* To build a distribution release of the application, use `grunt` in the root folder. The release will be generated in the `dist` folder.
