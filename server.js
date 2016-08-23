/**
 * A web server
 *
 * @author: hrobertking@cathmhoal.com
 *
 * @exports cert as cert
 * @exports host as host
 * @exports ip_auth as ip
 * @exports log_file as log
 * @exports log_status as logging
 * @exports port as port
 * @exports router as router
 * @exports start as start
 * @exports subscribe as on
 *
 * @see The <a href="https://github.com/hrobertking/node-experiments">node-experiments</a> repo for information about the router module
 */

var events = require('events')                        // nodejs core
  , fs = require('fs')                                // nodejs core
  , http = require('http')                            // nodejs core
  , message = require('./message')                    // message module
  , router = require('./router')                      // router module
  , emitter = new events.EventEmitter()               // event emitter
  , host                                              // the hostname or host address
  , io                                                // socket.io interface
  , ip_auth = [ ]                                     // array of IPv4 clients authorized
  , log_file                                          // filename of the log
  , log_status = true                                 // write log entry if true
  , port                                              // port used by web-server to listen
  , server                                            // http(s) server
  , ssl_options = { cert:null, key:null, pfx:null }   // ssl options object to contain 'key' and 'cert'
;

const TOO_MANY_MILLISECONDS = 500;

/**
 * The address the server will created on
 *
 * @type     {string}
 */
Object.defineProperty(exports, 'host', {
  get: function() {
    return host;
  },
  set: function(value) {
    if (typeof value === 'string' && value !== '') {
      host = value;
    }
  }
});

/**
 * The IP addresses authorized to access the server
 *
 * @type     {string}
 */
Object.defineProperty(exports, 'ip', {
  get: function() {
    return ip_auth.join(',');
  },
  set: function(value) {
    function isValid(ip) {
      var seg = ip.split('.')
        , i
        , ok = (seg.length > 0)
      ;
      for (i = 0; i < seg.length; i += 1) {
        if (isNaN(seg[i])) {
          ok = ok && seg[i] === '*';
        } else {
          ok = ok && (parseFloat(seg[i]) > -1 && parseFloat(seg[i]) < 256);
        }
      }
      return ok;
    }
    var autho, c;
    if (typeof value === 'string' && value !== '') {
      autho = value.split(',');
      for (c = 0; c < autho.length; c += 1) {
        if (!isValid(autho[c])) {
          autho.splice(c, 1);
        }
      }
      if (autho.length) {
        ip_auth = autho;
      }
    }
  }
});

/**
 * The filename the server will log to
 *
 * @type     {string}
 */
Object.defineProperty(exports, 'log', {
  get: function() {
    return log_file;
  },
  set: function(value) {
    if (typeof value === 'string' && value !== '') {
      log_file = value;
    }
  }
});

/**
 * The status of the log - on or off
 *
 * @type     {boolean}
 */
Object.defineProperty(exports, 'logging', {
  get: function() {
    return log_status;
  },
  set: function(value) {
    log_status = (value ? true : false);
  }
});

/**
 * The port the server will listen on
 *
 * @type     {number}
 */
Object.defineProperty(exports, 'port', {
  get: function() {
    return port;
  },
  set: function(value) {
    // use a 16-bit unsigned int, positive values only
    if (!isNaN(value) && value > 0 && value < 65536) {
      port = Math.floor(value);
    }
  }
});

/**
 * Expose the router interface
 *
 * @type     {object}
 */
Object.defineProperty(exports, 'router', {
  get: function() {
    return router;
  },
  set: function(value) {
    router = value;
  }
});

/**
 * Checks the client IP against authorized clients
 *
 * @return   {boolean}
 *
 * @param    {request} req
 */
function authorizedClient(req) {
  var ndx
    , ok = (ip_auth.length === 0) // assume it isn't authorized
    , ip
    , regex
  ;
  for (ndx = 0; ndx < ip_auth.length; ndx += 1) {
    ip = '^' + ip_auth[ndx].replace(/\./g, '\\.').replace(/\*/g, '\\d{1,3}');
    regex = new RegExp(ip);
    ok = ok || regex.test(req.connection.remoteAddress);
  }
  return ok;
}

/**
 * Sets the ssl options
 *
 * @return   {void}
 *
 * @param    {string} key
 * @param    {string} certificate
 */
function cert(key, certificate) {
  var path = require('path')
    , base64 = /^([A-Z0-9\+\/]{4})*([A-Z0-9\+\/]{4}|[A-Z0-9\+\/]{3}=|[A-Z0-9\+\/]{2}==)$/i
    , contents = {
        cert:null,
        key:null,
        pfx:null
      }
  ;

  // check the 'key' to see if it's likely that it's base64 encoded
  if (base64.test(key)) {
    contents.key = key;
  } else {
    // figure out if we have a pfx or a key/certificate pair
    switch (path.extname(key).replace(/^\./, '')) {
      case 'pem':
        try {
          contents.key = fs.readFileSync(key);
        } catch(ignore) {
        }
        break;
      case 'pfx':
        try {
          contents.pfx = fs.readFileSync(key);
        } catch(ignore) {
        }
        break;
    }
  }

  // check the 'certificate' to see if it's likely that it's base64 encoded
  if (base64.test(certificate)) {
    contents.cert = certificate;
  } else {
    // figure out if we have a pfx or a key/certificate pair
    switch (path.extname(certificate).replace(/^\./, '')) {
      case 'pem':
        try {
          contents.cert = fs.readFileSync(certificate);
        } catch(ignore) {
        }
        break;
      case 'pfx':
        try {
          contents.pfx = fs.readFileSync(certificate);
        } catch(ignore) {
        }
        break;
    }
  }

  // set the ssl_options - test truthy so we skip empty strings
  if (contents.cert) {
    ssl_options.cert = contents.cert;
  }
  if (contents.key) {
    ssl_options.key = contents.key;
  }
  if (contents.pfx) {
    ssl_options.pfx = contents.pfx;
  }
}
exports.cert = cert;

/**
 * Logs the data
 *
 * @return   {void}
 *
 * @param    {server.Message} entry
 *
 * @emits    log-error
 */
function writeLog(entry) {
  var EOL = require('os').EOL;

  entry = entry.toString() + EOL;

  if (log_status) {
    if (log_file && log_file !== '') {
      // appendFile will append the file as long as the path exists
      fs.appendFile(log_file, entry, function(err) {
        var path = require('path')
          , f_path
          , index = 0
        ;

        function buildPath() {
          var r_path = f_path.slice(0, index + 1).join(path.sep);
          if (index < f_path.length) {
            fs.stat(r_path, function(err, stats) {
                if (err) {
                  if (err.code === 'ENOENT') { // not exists
                    fs.mkdir(r_path, buildPath);
                  }
                } else if (stats) {
                  if (stats.isDirectory()) {
                    index += 1;
                    buildPath();
                  }
                }
              });
          }
        }

        // the most likely event is a file that doesn't exist, so try to
        // fix it if that's the case
        if (err) {
          if (err.code === 'ENOENT') {
            f_path = path.dirname(log_file).split(path.sep);
            buildPath();
          } else {
            emitter.emit('log-error', { error: err, entry:entry, file:log_file });
          }
        }
      });
    } else {
      console.log(entry);
    }
  }
}

/**
 * Starts the server
 *
 * @return   {void}
 *
 * @param    {integer} listento
 *
 * @emits    request-received
 * @emits    response-sent
 */
function start(listento) {
  // set the port if it's passed in
  if (listento) {
    if (!isNaN(listento) && listento > 0 && listento < 65536) {
      port = Math.floor(listento);
    }
  }

  // set the host if it isn't already and we can figure it out
  if (!host) {
    var os = require('os')
      , cards = os.networkInterfaces()
      , index
    ;
    cards = cards['Local Area Connection'];
    index = cards.length - 1;
    while (index > -1 && !host) {
      if (cards[index].family === 'IPv4' && cards[index].internal === false) {
        host = cards[index].address;
      }
      index -= 1;
    }
  }

  // request handler
  function onRequest(request, response) {
    var msg
    ;

    if (!authorizedClient(request)) {
      request.forbidden = true;
    }

    msg = message.create(request, response);

    msg.on('request-received', function(message) {
        var io_obj = message.log;

        // route the message
        router.route(message);

        // notify socket subscribers a request was received
        io_obj['id'] = message.id;
        io_obj['event-type'] = 'request';
        io.emit('communication-event', io_obj);
      });

    msg.on('response-sent', function(message) {
        var io_obj = message.log;

        // write the log entry
        writeLog(message);

        io_obj['id'] = message.id;
        io_obj['event-type'] = 'response';

        // notify socket subscribers the response was sent
        io.emit('communication-event', io_obj);

        // fire an error event if the response took more than
        // the const TOO_MANY_MILLISECONDS milliseconds
        if (!io_obj['time-taken'] ||
            io_obj['time-taken'] > TOO_MANY_MILLISECONDS ||
            io_obj['sc-status'] !== 200) {
          io.emit('error-event', {
              'id':message.id,
              'uri':message.request.url,
              'error': ( !io_obj['time-taken'] ? 418 :
                         io_obj['time-taken'] > TOO_MANY_MILLISECONDS ? 999 :
                         message.log['sc-status'] )
            });
        }
      });
  }

  // create the server to listen on the specified host and port
  if ((ssl_options.key && ssl_options.cert) || ssl_options.pfx) {
    // create a secure server
    server = https.createServer(ssl_options, onRequest).listen(port, host);
  } else {
    server = http.createServer(onRequest).listen(port, host);
  }

  // handle log errors
  emitter.on('log-error', function(params) {
    console.log('Error: ' + params.error);
    console.log(params.entry);
  });

  // set up RUM
  io = require('socket.io')(server);
  // Set socket.io listeners.
  io.on('connection', function(socket) {
      console.log('a user connected');
      socket.on('disconnect', function() {
        console.log('user disconnected');
      });
    });
  // set up RUM event bubbling
  router.on('route-error', function(message) {
      io.emit('error-event', {
          'id':message.id,
          'uri':message.request.url,
          'error':message.response.statusCode
        });
    });
}
exports.start = start;

/**
 * Registers event handlers for request-received, response-sent, and log-error events
 *
 * @return   {void}
 *
 * @param    {string} eventname
 * @param    {function} handler
 */
function subscribe(eventname, handler) {
  if ((/request\-received|response\-sent|log\-error/).test(eventname)) {
    emitter.removeListener(eventname, handler);
    emitter.on(eventname, handler);
  }
}
exports.on = subscribe;
