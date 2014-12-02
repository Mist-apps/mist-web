Mist Web Application
====================

The Mist web application is the main front-end for the Mist API. It offers currently only a Notes and contacts management application. The front-end is a HTML5/CSS/JavaScript web application based on the AngularJS Framework. It is available on recent browsers only (tested Firefox/Chromium).

## Installation

The web application is very easy to install. It only needs a web-server to serve the static files. The web application only works if the Mist API is operational, else, you won't be able to connect. To install the Mist web application, follow these steps:

#### For a development installation:
* install build-essential: `sudo apt-get install build-essential`
* install nodejs: `sudo add-apt-repository ppa:chris-lea/node.js && sudo apt-get update && sudo apt-get install nodejs`
* install the grunt client: `sudo npm install -g grunt-cli`
* install bower: `sudo npm install -g bower`
* install ruby: `sudo apt-get install ruby ruby-dev`
* install compass: `sudo gem install compass`
* clone the repository where you want: `git clone https://github.com/Mist-apps/mist-web.git /path/to/sources`
* go into the sources folder: `cd /path/to/sources`
* install the bower dependencies: `bower install`
* install the node dependencies: `npm install`

It's done ! You may start develop the web application:
* the web application sources are in the `app` folder
* the api url is in the `path/to/sources/app/scripts/global/config.js` file. Change it to match yours, or use the default one if you used the api installation manual.
* to use a built-in web server and watch changes in the sources, use `grunt serve --force` in the root folder and the app will be served on http://localhost:9000
* to build a distribution release of the application, use `grunt` in the root folder. The release will be generated in the `dist` folder.

#### For a production installation:
* install nginx: `sudo apt-get install nginx`
* create the vhost file: `sudo vim /etc/nginx/etc/sites-available/mist-web`
* add these contents:
``` Nginx
server {

        listen 80;

        server_name my-web-domain-name;

        access_log   /var/log/nginx/mist-web.access.log;
        error_log    /var/log/nginx/mist-web.error.log;

        root /var/www/mist-web;
        index index.html;

        location / {
                try_files $uri /index.html;
        }

}
```
* set the rights on the vhost file: `sudo chown root:root /etc/nginx/etc/sites-available/mist-web`
* enable the vhost: `sudo ln -s /etc/nginx/etc/sites-available/mist-web /etc/nginx/etc/sites-enabled/mist-web`
* copy the content of the "dist" folder of a development installation into the web server folder: `sudo rsync -a --delete /path/to/sources/dist/ /var/www/mist-web`. The "dist" files can be generated on a developpment installation on the same host or on another. Use the command `grunt` to build the distribution release.
* change the API url to match yours: `sudo sed -i 's/http:\/\/localhost:8080\/http:\/\/my-api-domain-name\//g' /var/www/mist-web/scripts/scripts.*.js`
* change the ownership of the files: `sudo chown -R www-data:www-data /var/www/mist-web`
* reload nginx: `sudo service nginx reload`

It's done ! You may access the web application on http://my-web-domain-name/. To update the web application, only repeat the 4 last operations: copy the dist folder, change API and ownership, reload nginx.

#### Troubleshooting

* If you have an `EACCES` error during the `npm install` command, please remove the npm tmp cache folder located in your home: `rm -rf /home/username/.npm` and retry again. This is due to some cache items written with the root permissions, so when accessing the cache with normal user permissions, it fails.
* If you have a warning message when launching grunt "jcrop was not injected in your file", copy this file https://github.com/tapmodo/Jcrop/blob/master/bower.json in the JCrop component folder `/path/to/sources/bower_components/jcrop/`. This is because bower not include this file in the installation.
