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
  if (message[0]!=0x7e || message[message.length-1]!=0x7f ) console.log('----');return -1;
  else return 1;
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

  return (cmd +'good')
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
  var validstatus=validation(message)
  if (validstatus==0) msgResponse="\x7e"+ message[1] + "\x01\x7f";//bad argument
  if (validstatus<0) msgResponse="\x7e\x0b\x01\x7f";//bad packet
  else msgResponse=goodanswer(command,message);
  msgResponse=msgResponse + ':1234';
///////// response function
  server.send(msgResponse, 0, msgResponse.length, remote.port, remote.address, function(err, bytes) {
    ts = new Date();
    if (err) throw err;
    consolelog(ts.getTime() + ' UDP server message sent to ' + remote.address + ':' + remote.port);
  });  
});

server.bind(PORT, HOST);


