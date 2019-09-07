/// UDP server       ///////////////////////
var version=190907.1
var debug=1;
var PORT = 9090;
var HOST = '127.0.0.1';
var dgram = require('dgram');
var server = dgram.createSocket('udp4');
///////////////////////my variables
var msgResponse="init";
var ts = new Date();
///////////////////////my function
function consolelog(msg){if (debug) console.log(msg);}
function validation(message){
  return 1;
};
function getdata(){};
function goodanswer(cmd,message){  
  if (cmd==0) getdata;
  else if (cmd==1) getdata;
  else if (cmd==2) getdata;
  else if (cmd==3) getdata;
  else if (cmd==4) getdata;
  else if (cmd==5) getdata;
  else if (cmd==6) getdata;
  else if (cmd==7) getdata;
  else if (cmd==8) getdata;
  else if (cmd==9) getdata;
  else if (cmd==10) getdata;

  return (command +'good')
};
///////////////////////command processor
function startcommand(message){

};
///////////////////////server function
server.on('listening', function () {
  var address = server.address();
  ts = new Date();  
  consolelog(ts.getTime() + ' Start UDP Server listening on ' + address.address + ":" + address.port);
});
server.on('message', function (message, remote) {
  ts = new Date();
  consolelog(ts.getTime() + ' ' + remote.address + ':' + remote.port + ' - ' + message);
  var command=message[1];
  if (validation(message)==0) msgResponse='\0x7e'+ message[1] + '\0x01\0x7f ';//response 4 byte
  if (validation(message)<0) msgResponse='\0x7e\0x0b\0x01\0x7f ';//response 4 byte
  else msgResponse=goodanswer(command,message);
///////// response function
  server.send(msgResponse, 0, msgResponse.length, remote.port, remote.address, function(err, bytes) {
    ts = new Date();
    if (err) throw err;
    consolelog(ts.getTime() + ' UDP server message sent to ' + remote.address + ':' + remote.port);
  });  
});

server.bind(PORT, HOST);


