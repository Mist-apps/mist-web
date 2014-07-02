Mist Web Application
====================

The Mist web application is the main front-end for the Mist API. It offers currently only a Notes management application. The front-end is a HTML5/CSS/JavaScript web application based on the AngularJS Framework. It is available on recent browsers only (tested Firefox/Chromium)

## Installation

The webapplication is very easy to install. It only needs a web-server to serve the static files. If you already installed the mist-api, follow these steps:

#### All:
* install nginx: `sudo apt-get install nginx`
* add the vhost: `sudo mv mist-web /etc/nginx/etc/sites-available/mist-web && sudo chown root:root /etc/nginx/etc/sites-available/mist-web`
* enable the vhost: `sudo ln -s /etc/nginx/etc/sites-available/mist-web /etc/nginx/etc/sites-enabled/mist-web`
* reload nginx: `sudo service nginx reload`
* edit the deploy script: `sudo vim /usr/local/bin/deploy`
* change the constants to match your paths. DEPLOY_PATH_* = where the files will be deployed, defaults are good. DEV_PATH_* = where your dev sources are stored (git clone), no need to change them for a production installation. *_API_URL = the url of the api for the web application. You need to change the one that match your installation (prod/dev).

#### For a production installation:
* deploy the app: `deploy prod`

#### For a development installation:
* clone the repository where you want: `git clone https://github.com/lolo88l/mist-web.git /path/to/sources`
* deploy the app: `deploy dev`

That's all ! Updating can be done by executing only the command: `deploy dev/prod`
