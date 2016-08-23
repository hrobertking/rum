/**
 * This nodejs application is a simple web server
 * Example: index.js -port 8080 -dir /srv/share/wwwroot/
 *
 * Syntax: node index.js [OPTIONS]
 *
 * @author: hrobertking@cathmhaol.com
 *
 * uses: cli-opts.js, message.js, router.js, server.js, writer.js
 */

var path = require('path')
  , invoked = process.argv[1].split(path.sep).pop()
  , opts = require('./cli-opts')
  , server = require('./server')
  , cli_args = opts.args;
;

server.log = cli_args.log ? cli_args.log : 'logs/server.log';
server.port = cli_args.p || cli_args.port || 8000;
server.router.dir = cli_args.d || cli_args.dir || cli_args.directory;

if (cli_args.no_log) {
  server.logging = false;
}

// Usage information
function usage() {
  console.log('Syntax: ' + invoked.split(path.sep).pop() + ' <PARAMETERS>');
  console.log('');
  console.log('-[-]d[ir[ectory]] <PATH>   Sets the directory from where pages are served. Default is ' + process.cwd());
  console.log('-[-]h[elp]                 Show this usage message');
  console.log('-[-]log] <FILENAME>        Sets the filename for the server log. Default is server.log in the app directory');
  console.log('-[-]no_log                 Turns off logging');
  console.log('-[-]p[ort] <PORT_NUMBER>   Sets the port the application listens on. Default is 8000');
  console.log('');
}

if (cli_args.h || cli_args.help) {
  usage();
} else {
  server.start();
  console.log('Server started on ' + server.host + ':' + server.port + '\n');
  if (server.log) {
    console.log('Logging to ' + server.log);
  }
}
