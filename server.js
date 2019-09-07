/// UDP server       ///////////////////////
var version=190906.1
var debug=1;
var PORT = 9090;
var HOST = '127.0.0.1';
var dgram = require('dgram');
var server = dgram.createSocket('udp4');
///////////////////////my variables
var msgResponse="first";
var ts = new Date();
///////////////////////my function
function validation(message){return 1;};
//function badanswer(command){return (command + 'bad');};
function goodanswer(command,message){return (command +'good')};
function consolelog(msg){if (debug) console.log(msg);}
///////////////////////server function
server.on('listening', function () {
  var address = server.address();
  consolelog('UDP Server listening on ' + address.address + ":" + address.port);
});
server.on('message', function (message, remote) {
  ts = new Date();
  consolelog(remote.address + ':' + remote.port +' - ' + message);
  var command=message[1];
  if (!validation(message)) msgResponse='\0x7e'+ message[1] + '\0x01\0x7f ' + ts.getTime();
  else msgResponse=goodanswer(command,message) + ts.getTime();
  

//  msgResponse="OK";
  server.send(msgResponse, 0, msgResponse.length, remote.port, remote.address, function(err, bytes) {
    ts = new Date();
    if (err) throw err;
    consolelog(ts.getTime()+' UDP server message sent to ' + remote.address +':'+ remote.port);
  });
});
server.bind(PORT, HOST);

/*
server.on('listening', function () {
  var address = server.address();
  console.log(ts.getTime() + ' UDP Server listening on ' + address.address + ":" + address.port);
});

server.on('message', function (message, remote) {
  var command=message[0];
  if (!validation(message)) answer=badanswer(command);
  else {
    answer=goodanswer(command,message);
  }
  ts = new Date();
  console.log(ts.getTime() + '-client(' + remote.address + '):' + remote.port +' - [' + message+'] :' + command + ' {' + answer +'}');
  
  server.send (answer, 0, answer.length, remote.port, remote.address, function(err, bytes) {
    console.log('sending['+answer+'] to '+remote.address+':'+remote.port); 
//    server.close();
  });
});
*/

