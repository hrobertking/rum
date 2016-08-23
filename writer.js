/**
 * @author: hrobertking@cathmhoal.com
 *
 * @exports filename as filename
 * @exports writeDataCsv as writeAsCSV
 * @exports writeResponseFile as writeAsFile
 * @exports writeDataHtml as writeAsHTML
 * @exports writeDataJson as writeAsJSON
 * @exports writeDataXml as writeAsXML
 * @exports writeResponseContents as writeContents
 * @exports writeResponseHead as writeContentType
 * @exports writeResponseEmpty as writeEmptyDocument
 * @exports writeResponse403 as writeNotAuthorized
 * @exports writeResponse404 as writeNotFound
 * @exports writeResponseError as writeServerError
 * @exports writeToFileSystem as writeToFileSystem
 *
 * @see The <a href="https://github.com/hrobertking/node-experiments">node-experiments</a> repo for information about the server module
 */

var fs = require('fs')
  , path = require('path')
  , filename = ''
;

/**
 * The default filename to write data to relative to the working directory of the process, e.g., 'sample-splunk-data.json'
 *
 * @type     {string}
 */
Object.defineProperty(exports, 'filename', {
  get: function() {
    return filename;
  },
  set: function(value) {
    if (typeof value === 'string') {
      filename = value;
    }
  }
});

/**
 * Writes the data set out as a CSV and returns the message object
 *
 * @return   {server.Message}
 *
 * @param    {server.Message} message
 * @param    {object[]) data
 */
function writeDataCsv(message, data) {
  var fname = filename.replace(/\.[\w]+$/, '.csv')
    , i           // array loop index
    , key         // hash index
    , keys = []   // a hash of all the keys
    , head = []   // output array
    , lines = []  // output array
    , datum       // an individual data element
    , size        // size of content in bytes
    , str = ''    // the content to write out
  ;

  if (message.response) {
    if (data) {
      // Generate a keys object
      for (i in data) {
        line = data[i];
        for (key in line) {
          keys[key] = (typeof line[key]);
        }
      }

      // put the data in a consistent order
      for (key in keys) {
        // There isn't really a good way to represent arrays or objects in
        // a CSV, because the internal representation is going to be 
        // comma-separated too, making the header not correspond to the data 
        // items, so we're just going to dump out the primitive types.
        if (keys[key] === 'boolean' || 
            keys[key] === 'number' || 
            keys[key] === 'string') {
          head.push(key);
          for (i in data) {
            datum = data[i][key];
            if (!lines[i]) {
              lines[i] = [];
            }
            lines[i].push( datum )
          }
        }
      }

      // write the head (column definition)
      str += head.join(',')+'\n';

      // write the lines
      for (i in lines) {
        str += lines[i].join(',')+'\n';
      }

      // set the size
      size = Buffer.byteLength(str);

      writeResponseHead(message.response, 'csv', size)
      message.response.end(str);

      writeToFileSystem(str, fname);
    }

    message.response.bytes = size;
    message.response.date = new Date();
  }
  return message;
}
exports.writeAsCSV = writeDataCsv;

/**
 * Writes the data set out as HTML and returns the message object
 *
 * @return   {server.Message}
 *
 * @param    {server.Message} message
 * @param    {object[]) data
 */
function writeDataHtml(message, data) {
  var fname = filename.replace(/\.[\w]+$/, '.html')
    , i           // array loop index
    , line        // line out
    , item        // data item
    , key         // item key index
    , size        // size of content in bytes
    , str = ''    // the content to write out
  ;

  if (message.response) {
    if (data) {
      str += '<!DOCTYPE html>\n';
      str += '<body>\n';
      str += '<ul>\n';
      for (i in data) {
        item = data[i];
        line = [];
        for (key in item) {
          line.push('data-' + key + '="' + item[key] + '"');
        }
        str += '\t<li ' + line.join(' ') + '>' + i + '</li>\n';
      }
      str += '</ul>\n';
      str += '</body>\n';
      str += '</html>\n';

      size = Buffer.byteLength(str);

      writeResponseHead(message.response, 'html', size)
      message.response.end(str);

      writeToFileSystem(str, fname);
    }

    message.response.bytes = size;
    message.response.date = new Date();
  }
  return message;
}
exports.writeAsHTML = writeDataHtml;

/**
 * Writes the data set out as JSON encoded and returns the message object
 *
 * @return   {server.Message}
 *
 * @param    {server.Message} message
 * @param    {object[]) data
 */
function writeDataJson(message, data) {
  var fname = filename.replace(/\.[\w]+$/, '.json')
    , i           // array loop index
    , size        // size of content in bytes
    , str = [ ]   // the content to write out
  ;

  if (message.response) {
    if (data) {
      for (i in data) {
        str.push(JSON.stringify(data[i], null, '\t'));
      }

      str = '[\n' + str.join(',\n') + ']\n';

      size = Buffer.byteLength(str);

      writeResponseHead(message.response, 'json', size)
      message.response.end(str);

      writeToFileSystem(str, fname);
    }

    message.response.bytes = size;
    message.response.date = new Date();
  }
  return message;
}
exports.writeAsJSON = writeDataJson;

/**
 * Writes the data set out as an XML document and returns the message object
 *
 * @return   {server.Message}
 *
 * @param    {server.Message} message
 * @param    {object[]) data
 * @param    {string} tagNameRoot
 * @param    {string} tagNameChild
 */
function writeDataXml(message, data, tagNameRoot, tagNameChild) {
  var fname = filename.replace(/\.[\w]+$/, '.xml')
    , attr = [ ]  // attributes
    , i           // array loop index
    , item        // data item
    , key         // item key index
    , line        // line out
    , schema = '' // xml-schema
    , size        // size of content in bytes
    , str = ''    // the content to write out
  ;

  tagNameRoot = tagNameRoot || 'root';
  tagNameChild = tagNameChild || 'child';

  if (message.response) {
    if (data) {
      str += '<?xml version="1.0" encoding="UTF-8"?>\n';
      str += '<' + tagNameRoot + '>\n';
      for (i in data) {
        item = data[i];
        line = [];
        for (key in item) {
          line.push(key + '="' + item[key] + '"');
          switch (typeof item[key]) {
            case 'boolean':
              attr[key] = 'xs:boolean';
              break;
            case 'number':
              // use == because we must only check the value
              attr[key] = Math.floor(item[key]) == item[key] ? 
                              'xs:integer' : 
                              'xs:decimal';
              break;
            case 'string':
              attr[key] = 'xs:string';
              break;
            default:
              attr[key] = item[key] instanceof Date ? 
                              'xs:dateTime' : 
                              'xs:string';
              break;
          }
        }
        str += '\t<' + tagNameChild + line.join(' ') + '/>\n';
      }
      str += '</' + tagNameRoot + '>\n';

      // create the schema
      schema += '<?xml version="1.0"?>\n';
      schema += '<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">\n';
      schema += '<xs:element name="' + tagNameRoot +'">\n';
      schema += '\t<xs:complexType>\n';
      schema += '\t\t<xs:sequence>\n';
      schema += '\t\t\t<xs:element name="' + tagRootChild + '">\n';
      schema += '\t\t\t\t<xs:complexType>\n';
      for (key in attr) {
        schema += '\t\t\t\t\t<xs:attribute name="';
        schema += key;
        schema += '" type="' + attr[key] + '"/>\n';
      }
      schema += '\t\t\t\t</xs:complexType>\n';
      schema += '\t\t\t</xs:element>\n';
      schema += '\t\t</xs:sequence>\n';
      schema += '\t</xs:complexType>\n';
      schema += '</xs:element>\n';
      schema += '</xs:schema>\n';

      size = Buffer.byteLength(str);
      writeResponseHead(message.response, 'xml', size)
      message.response.end(str);

      writeToFileSystem(str, fname);
    }

    message.response.bytes = size;
    message.response.date = new Date();
  }
  return message;
}
exports.writeAsXML = writeDataXml;

/**
 * Writes the contents directly to the stream and returns the message object
 *
 * @return   {server.Message}
 *
 * @param    {server.Message} message
 * @param    {string} data
 */
function writeResponseContents(message, data) {
  var str = ''
    , size
  ;

  if (message.response) {
    if (data) {
      str += data.toString('utf8');
    }
    message.response.end(str);

    size = (message.response.bytes || 0) + Buffer.byteLength(str);
    message.response.bytes = size;
    message.response.date = new Date();
  }
  return message;
}
exports.writeContents = writeResponseContents;

/**
 * Writes a 403 response error and returns the message object
 *
 * @return   {server.Message}
 *
 * @param    {server.Message} message
 */
function writeResponse403(message) {
  var str = ''
  ;

  if (message.response) {
    str += '<!DOCTYPE html>';
    str += '\t<head><title>403 - Not Authorized</title></head>\n';
    str += '\t<body>\n';
    str += '\t\t<h1>403 - Not Authorized</h1>\n';
    str += '\t\t<p>\n';
    str += '\t\t\t I am sorry, but the resource you requested is restricted\n';
    str += '\t\t\t to authorized requests only.\n';
    str += '\t\t</p>\n';
    str += '\t</body>\n';
    str += '</html>\n';

    message.response.writeHead(403, {'Content-Type': 'text/html',
      'Content-Length': Buffer.byteLength(str)});
    message.response.end(str);

    message.response.bytes = Buffer.byteLength(str);
    message.response.date = new Date();
  }
  return message;
}
exports.writeNotAuthorized = writeResponse403;

/**
 * Writes a 404 response error and returns the message object
 *
 * @return   {server.Message}
 *
 * @param    {server.Message} message
 */
function writeResponse404(message) {
  var str = ''
  ;

  if (message.response) {
    str += '<!DOCTYPE html>';
    str += '\t<head><title>404 - Not Found</title></head>\n';
    str += '\t<body>\n';
    str += '\t\t<h1>404 - Not Found</h1>\n';
    str += '\t\t<p>\n';
    str += '\t\t\t I am sorry, the resource you requested does not exist.\n';
    str += '\t\t</p>\n';
    str += '\t</body>\n';
    str += '</html>\n';

    message.response.writeHead(404, {'Content-Type': 'text/html',
      'Content-Length': Buffer.byteLength(str)});
    message.response.end(str);

    message.response.bytes = Buffer.byteLength(str);
    message.response.date = new Date();
  }
  return message;
}
exports.writeNotFound = writeResponse404;

/**
 * Writes an empty document
 *
 * @return   {server.Message}
 *
 * @param    {server.Message} message
 */
function writeResponseEmpty(message) {
  if (message.response) {
    writeResponseHead(message.response, 'html', 0);

    message.response.bytes = 0;
    message.response.date = new Date();
  }
  return message;
}
exports.writeEmptyDocument = writeResponseEmpty;

/**
 * Writes an error to the response and returns the message object
 *
 * @return   {server.Message}
 *
 * @param    {server.Message} message
 * @param    {string} err
 */
function writeResponseError(message, err) {
  var str = ''
  ;

  if (message.response) {
    str = (err || 'Ouch. A server error has occurred') + '\n';

    message.response.writeHead(500, {'Content-Type': 'text/plain',
      'Content-Length': Buffer.byteLength(str)});
    message.response.end(str);

    message.response.bytes = Buffer.byteLength(str);
    message.response.date = new Date();
  }
  return message;
}
exports.writeServerError = writeResponseError;

/**
 * Writes a file to the response and returns the message object
 *
 * @return   {server.Message}
 *
 * @param    {server.Message} message
 * @param    {string} data
 * @param    {string} type
 */
function writeResponseFile(message, data, type) {
  var str = ''
    , size        // size of content in bytes
  ;

  type = (type || '').toLowerCase();

  if (message.response) {
    if (data) {
      str += data.toString('binary');

      size = Buffer.byteLength(str, 'binary');

      writeResponseHead(message.response, type, size);
      message.response.end(str, 'binary');
    }

    message.response.bytes = size;
    message.response.date = new Date();
  }
  return message;
}
exports.writeAsFile = writeResponseFile;

/**
 * Writes the response headers
 *
 * @return   {void}
 *
 * @param    {HTTPResponse} response
 * @param    {string} type
 * @param    {number} length
 */
function writeResponseHead(response, type, length) {
  var headers = {
        'Access-Control-Allow-Origin':'*'
      }
  ;

  if (length) {
    headers['Content-Length'] = length;
  }

  if (response) {
    switch (type.toLowerCase()) {
      case 'avi':
        headers['Content-Type'] = 'video/avi';
        break;
      case 'bmp':
        headers['Content-Type'] = 'image/bmp';
        break;
      case 'css':
        headers['Content-Type'] = 'text/css';
        break;
      case 'csv':
        headers['Content-Type'] = 'text/csv';
        break;
      case 'gif':
        headers['Content-Type'] = 'image/gif';
        break;
      case 'htm':  //fall through to html
      case 'html':
        headers['Content-Type'] = 'text/html';
        break;
      case 'ico':
        headers['Content-Type'] = 'image/x-icon';
        break;
      case 'jpeg': //fall through to jpg
      case 'jpg':
        headers['Content-Type'] = 'image/jpeg';
        break;
      case 'js':
        headers['Content-Type'] = 'application/javascript';
        break;
      case 'json':
        headers['Content-Type'] = 'application/json';
        break;
      case 'mp4':
        headers['Content-Type'] = 'audio/mp4';
        break;
      case 'mp3':  //fall through to mpeg
      case 'mpeg':
        headers['Content-Type'] = 'audio/mpeg';
        break;
      case 'pdf':
        headers['Content-Type'] = 'application/pdf';
        break;
      case 'png':
        headers['Content-Type'] = 'image/png';
        break;
      case 'rtf':
        headers['Content-Type'] = 'text/rtf';
        break;
      case 'svg':
        headers['Content-Type'] = 'image/svg+xml';
        break;
      case 'tiff':
        headers['Content-Type'] = 'image/tiff';
        break;
      case 'txt':
        headers['Content-Type'] = 'text/plain';
        break;
      case 'woff':
        headers['Content-Type'] = 'application/font-woff';
        break;
      case 'xml':
        headers['Content-Type'] = 'application/xml';
        break;
      default:
        break;
    }
    response.writeHead(200, headers);
  }
}
exports.writeContentType = writeResponseHead;

/**
 * Writes to the file system
 *
 * @return   {void}
 *
 * @param    {string} contents
 * @param    {string} fname
 */
function writeToFileSystem(contents, fname) {
  fs.writeFile(fname, contents, function (err) {
    if (err) {
      console.warn(err);
    }
  });
}
exports.writeToFileSystem = writeToFileSystem;
