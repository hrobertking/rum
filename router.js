/**
 * @author: hrobertking@cathmhoal.com
 *
 * @exports root_dir as dir
 * @exports route as route
 * @exports routes as routes
 * @exports subscribe as on
 *
 * @emits    route-complete
 * @emits    route-error
 *
 * @see The <a href="https://github.com/hrobertking/node-experiments">node-experiments</a> repo for information about the writer module
 * @see The <a href="https://github.com/hrobertking/node-experiments">node-experiments</a> repo for information about the message module
 */

var events = require('events')
  , writer = require('./writer')
  , emitter = new events.EventEmitter()     // event emitter
  , root_dir = process.cwd()                // the root directory for the web server
  , routes = { }                            // routing table
  , uri                                     // the uri requested - http://nodejs.org/api/url.html
;

/* v ---------------------- ROUTING HANDLERS ---------------------------- v */
// routes['/favicon.ico'] = ignored;

// add application-specific code here --
// Examples:
// routes['/foo-bar'] = function(message) {
//    var path = require('path')
//      , querystring = require('querystring')
//    ;
//    // set the log filename when events should be logged
//    err_log = path.join(__dirname, './logs/error.log');
//
//    // handle the request
//    emitter.emit('route-complete', writer.writeNotFound(message));
// };
// routes['/ReST/user'] = function(message) {
//    var sql = require('node-sqlserver')
//      , connection_string = ''
//      , query = 'select * from users where id = ' + message.request.cgi.id
//    ;
//    sql.query(connection_string, query, function (err, results) {
//      if (err) {
//        emitter.emit('route-complete', writer.writeServerError(message, err));
//        return;
//      }
//      emitter.emit('route-complete', writer.writeDataJson(message, results));
//    });
// };
/* ^ ---------------------- ROUTING HANDLERS ---------------------------- ^ */

/**
 * The base directory used to serve the requests
 *
 * @type     {string}
 */
Object.defineProperty(exports, 'dir', {
  get: function() {
    return root_dir;
  },
  set: function(value) {
    // if the directory exists, use it
    var fs = require('fs');
    if (typeof value === 'string') {
      try { 
        if (fs.statSync(value).isDirectory()) {
          root_dir = value;
        }
      } catch (ignore) {
        console.log(value + ' is not a valid directory');
      }
    }
  }
});

/**
 * The routing table
 *
 * @type     {object}
 */
Object.defineProperty(exports, 'routes', {
  get: function() {
    return routes;
  }
});

/**
 * Ignores the request by sending back an empty document with a 200 status code
 *
 * @return   {message}
 *
 * @param    {server.Message} message
 *
 * @emits    route-complete
 */
function ignored(message) {
  emitter.emit('route-complete', writer.writeEmptyDocument(message));
}

/**
 * Waits for a specified period of time, in milliseconds, to elapse
 *
 * @return   {void}
 *
 * @param    {integer} ms
 */
function sleep(ms) {
  var end = (new Date()).getTime() + (isNaN(ms) ? 0 : Math.floor(ms))
    , tick = 0
  ;
  while ((new Date()).getTime() < end) {
    tick += 1;
  }
  return;
}

/**
 * Handles requests not otherwise routed
 *
 * @return   {message}
 *
 * @param    {server.Message} message
 *
 * @emits    route-complete
 * @emits    route-error
 */
function unhandled(message) {
  var fs = require('fs')
    , path = require('path')
    , filename = path.join(root_dir, uri.pathname)
  ;

  /**
   * Serves the file
   */
  function serveFile() {
    var contents = '';
    try {
      contents = fs.readFileSync(filename, 'binary');
      if (Buffer.byteLength(contents, 'binary') > 0) {
        emitter.emit('route-complete', writer.writeAsFile(message,
                 contents,
                 path.extname(filename).replace(/^\./, ''))
        );
      } else {
        emitter.emit('route-complete', writer.writeNotFound(message));
      }
    } catch(err) {
      emitter.emit('route-complete', writer.writeNotFound(message));
    }
  }

  try {
    // check the path against the file system
    if (fs.existsSync(filename) && fs.statSync(filename).isDirectory()) {
      filename += '/index.htm';
      filename += !fs.existsSync(filename) ? 'l' : '';
    }
    serveFile();
  } catch (err) {
    emitter.emit('route-error', writer.writeServerError(message, err));
  }
}

/**
 * Routes a request to a response
 *
 * @return   {void}
 *
 * @param    {server.Message} message
 *
 * @emits    route-error
 */
function route(message) {
  var url = require('url')
    , handler
  ;

  // sleep if it's requested
  if (message.request && message.request.cgi && message.request.cgi.latency) {
    sleep(message.request.cgi.latency);
  }

  // check to see if the request is authorized
  if (message.request.forbidden) {
    emitter.emit('route-error', writer.writeNotAuthorized(message));
  } else {
    // set the URI used by all the functions
    uri = url.parse(message.request.url);

    // get the handler for the requested resource
    handler = routes[uri.pathname] || unhandled;

    if (typeof handler === 'function') {
      handler(message);
    } else {
      // oops.
      emitter.emit('route-error', writer.writeServerError(message, 
         'Unable to route request')
      );
    }
  }
}
exports.route = route;

/**
 * Registers event handlers for request-received, route-complete, and route-error events
 *
 * @return   {void}
 *
 * @param    {string} eventname
 * @param    {function} handler
 */
function subscribe(eventname, handler) {
  if ((/request\-received|response\-sent|route\-error/).test(eventname)) {
    emitter.removeListener(eventname, handler);
    emitter.on(eventname, handler);
  }
}
exports.on = subscribe;
