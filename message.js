/**
 * A server message with request and response
 *
 * @author  hrobertking@cathmhaol.com
 *
 * @emits 'request-received'
 * @emits 'response-sent'
 * 
 * @exports Message as create
 * @exports subscribe as on
 */

var events = require('events')              // nodejs core
  , emitter = new events.EventEmitter()     // event emitter
;

/**
 * Creates a request/response pair
 *
 * @return   {object}
 *
 * @param    {http.IncomingMessage} request
 * @param    {http.IncomingMessage} response
 */
function Message(request, response) {
  /**
   * The log entry data
   */
  this.log = { };

  /**
   * Returns a log entry given a format and optionally, fields
   *
   * @return   {string}
   *
   * @param    {string} format
   * @param    {string[]} fields
   */
  this.toString = function(format, fields) {
    var entry = ''
    ;

    format = format || '';
    fields = fields || [ ];

    /**
     * Returns the NCSA, or common log format with extended information
     *
     * @return   {string}
     */
    function __NCSA() {
      var ncsa = new Date(self.log['date']);

      function __ncsaDateFormat(dt) {
        var mons = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        return dt.getDate() + '/' +                                               // Get completion time date
               mons[dt.getMonth()] + '/' +                                        // Get completion time month name
               dt.getFullYear() + ':' +                                           // Get completion time year
               ('0' + dt.getHours()).substr(-2) + ':' +                           // Get completion time hours
               ('0' + dt.getMinutes()).substr(-2) + ':' +                         // Get completion time minutes
               ('0' + dt.getSeconds()).substr(-2) + ' ' +                         // Get completion time seconds
               (
                 (dt.getTimezoneOffset() > 0 ? '-' : '') +                        // flip the sign - JS represents offset backwards
                 ('0' + Math.floor(dt.getTimezoneOffset() / 60)).substr(-2) +     // Get the hours in the timezone offset
                 ('0' + (dt.getTimezoneOffset() % 60)).substr(-2)                 // Get the minutes in the timezone offset
                );                                                                // Time response finished, format %d/%b/%Y:%H:%M:%S %z
      }

      return ( self.log['c-ip'] || '-' ) + '\t' +                                               // Get the IP of the user-agent
          ( '-' ) + '\t' +                                                                      // RFC 1413 identity of client (not usually known)
          ( self.log['cs-username'] || '-' ) + '\t' +                                           // user id of end-user (not usually known)
          ( '[' + __ncsaDateFormat(ncsa) + ']' ) + '\t' +                                       // Time response finished, format %d/%b/%Y:%H:%M:%S %z
          ( '"' + (self.log['cs-method'] || 'GET' ) + ' ' +                                     // Get the HTTP verb from the request
                  ((
                    (self.log['cs-uri-stem'] || '') + 
                    (self.log['cs-uri-query'] || '')
                   ) || '-' 
                  ) + ' ' +                                                                     // Get the url from the request
                  ('HTTP/' + (self.log['cs-version'] || '1.0')) +                               // Get the HTTP version from the request
                  ('"') ) + '\t' +                                                              // Request line
          ( self.log['sc-status'] || '-' ) + '\t' +                                             // HTTP status code
          ( self.log['sc-bytes'] || '-' )                                                       // Bytes transfered to the client
          ;
    }

    /**
     * Returns the W3C log format
     *
     * @return   {string}
     */
    function __W3C(elements) {
      var field;

      for (field in elements) {
        field = field.toLowerCase();
        elements[field] = self.log[field] || '-';
      }

      return elements.join(' ');
    }

    switch (format.toLowerCase()) {
      case 'common':
        entry = __NCSA();
        break;
      case 'extended':
        entry = [__NCSA(), __W3C(['cs(Referer)', 'cs(User-Agent)'])].join('\t');
        break;
      case 'w3c':
        entry = __W3C(fields);
        break;
      default:
        entry = [__NCSA(), __W3C(['cs(Referer)', 'cs(User-Agent)', 'time-taken'])].join('\t');
        break;
    }

    return entry;
  };

  /* ---------- Constructor ---------- */
  var qs = require('querystring')
    , url = require('url')
    , self = this
  ;

  function __generateId() {
    var guid = '',
      rchar = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789',
      rseed = 0,
      guid_length = 6;

    while (guid.length < guid_length) {
      guid += rchar.substr(Math.floor( Math.random() * (rchar.length - 1) ), 1);
    }

    return (new Date()).getTime() + guid;
  }
  self.id = __generateId();

  function __log() {
    var os = require('os')
      , t = /(\d{2}\:\d{2}\:\d{2})/
    ;

    function __iso8601(dt) {
      if (dt && !isNaN(dt.getTime())) {
        return (dt.getFullYear()) + '-' + 
               ('0' + (dt.getMonth() + 1)).substr(-2) + '-' +
               ('0' + dt.getDate()).substr(-2) + 'T' +
               ('0' + dt.getHours()).substr(-2) + ':' +
               ('0' + dt.getMinutes()).substr(-2) + ':' +
               ('0' + dt.getSeconds()).substr(-2) + '.' +
               ('000' + dt.getMilliseconds()).substr(-3);
      } else {
        return '-';
      }
    }

    self.log['c-ip'] = request.connection.remoteAddress;
    self.log['cs-bytes'] = Buffer.byteLength(request.data);
    self.log['cs-host'] = request.headers['host'];
    self.log['cs-method'] = request.method;
    self.log['cs-uri-query'] = request.url.split('?')[1];
    self.log['cs-uri-stem'] = request.url.split('?')[0];
    self.log['cs-username'] = request.username;
    self.log['cs-version'] = request.httpVersion;
    self.log['date'] = __iso8601(response.date);
    self.log['s-computername'] = os.hostname();
    self.log['s-ip'] = request.connection.localAddress;
    self.log['s-port'] = request.connection.localPort;
    self.log['s-sitename'] = '';
    self.log['sc-bytes'] = response.bytes;
    self.log['sc-status'] = response.statusCode;

    self.log['time-taken'] = (self.response.date || new Date()).getTime() - (self.request.date || new Date()).getTime();

    t = t.exec(self.log['date']);
    self.log['time'] = t ? t[1] : '';
  }

  // set the date-time the request is received
  request.date = new Date();
  response.date = new Date();

  // set the encoding
  request.setEncoding('utf8');
  // get the Basic Authorization username if it's present
  request.username = (new Buffer(((request.headers['authorization'] || '').split(/\s+/).pop() || ''), 'base64')).toString().split(/:/)[0];
  // set the request data handlers
  request.data = '';
  request.on('data', function(chunk) {
    request.data += chunk;
  });
  request.on('end', function() {
    request.cgi = qs.parse(request.method.toUpperCase() === 'POST' ? request.data : url.parse(request.url).query);
    __log();
    // emit the request event
    emitter.emit('request-received', self);
  });

  // set the data handlers
  response.data = '';
  // override the write method because there aren't events fired when data is written to the stream
  response.send = response.write;
  response.write = function(chunk, encoding, callback) {
    response.data += chunk;
    response.send(chunk, encoding, callback);
  };
  response.on('finish', function() {
    response.date = new Date();
    __log();
    emitter.emit('response-sent', self);
  });

  self.request = request;
  self.response = response;
  return self;
}
exports.create = Message;

/**
 * Registers event handlers for request-received and response-sent
 *
 * @return   {void}
 *
 * @param    {string} eventname
 * @param    {function} handler
 */
function subscribe(eventname, handler) {
  if ((/request\-received|response\-sent/).test(eventname)) {
    emitter.removeListener(eventname, handler);
    emitter.on(eventname, handler);
  }
}
exports.on = subscribe;
