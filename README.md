# RUM
Real-time User Monitoring

Using the node-experiments libraries, this repo demonstrates how to build real-time user monitoring into
a node.js application using the Socket.IO libraries.

Clone the repo, start the application (node index.js), open a browser pointed to the address listed
in the node.js console (e.g., Server started on 192.168.2.10:8000) with the path "dashboard.htm" (e.g.,
http://192.168.2.10:8000/dashboard.htm). Then open a (different) browser window using the address
provided for the server (e.g., http://192.168.2.10:8000).

Alternatively, clone the repo, start the application (node index.js), open a browser window using the
address provided for the server (e.g., http://192.168.2.10:8000) and click the link at the top of the 
page to open the dashboard.

The request to load the default page (index.htm) will appear in the dashboard as a new row in the 
Communication RUM table with a red background. Once the response has been sent, the remainder of the
columns of the table will be populated and the background will turn green. If there is an 'error' - 
which will happen because the favicon.ico file automatically requested by the browser doesn't exist -
an entry will appear in the Error RUM table. An error also occurs when the time taken to respond
is greater than 500ms (this setting is in the server.js file) - a behavior you can trigger by adding the
'latency' CGI parameter (e.g., http://192.168.2.10:8000/?latency=1000).


