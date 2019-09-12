var PORT = 9090;
var HOST = '127.0.0.1';
var dgram = require('dgram');
var message = new Buffer('\x7e' + '\x05\x00\x00' + '\x7f'); //<-----------tut
var client = dgram.createSocket('udp4');
function hexdump(msg){  
  var tmp='.';
  for (var i=0;i<msg.length;i++) tmp+=(msg[i].toString(16)) + '.';
  return tmp;
}
var ts = new Date();
console.log(ts.getTime()+ ' Client start.');
client.send(message, 0, message.length, PORT, HOST, function(err, bytes) {
  if (err) throw err;
  ts = new Date();
  console.log(ts.getTime()+' SND UDP client message [' +hexdump(message)+ '] sent to ' + HOST +':'+ PORT);
});
client.on('message', function (message, remote) {
  ts = new Date();
  console.log(ts.getTime()+' RCV '+remote.address + ':' + remote.port +' - [' + hexdump(message)+']');
  client.close();
});

