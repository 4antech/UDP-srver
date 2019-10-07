var ver='191003-01'
var PORT = 9090;
var HOST='127.0.0.1';

var dgram = require('dgram');
var incmd = 7; // 0..11
var target = 43210;
var speed  = 0b00000011; 
var cmd =incmd.toString(16); // 00..0a

var message = new Buffer(4)
message[0]=0x7e;
message[1]=incmd;
message[2]=speed;
message[3]=0x7f;

var client = dgram.createSocket('udp4');
function hexdump(msg){  
  var tmpstr='.';
  for (var i=0;i<msg.length;i++) {
    if (msg[i]<16 ) tmpstr+='0'+(msg[i].toString(16)) + '.';
    else tmpstr+=(msg[i].toString(16)) + '.';
  }
  return tmpstr;
}
var ts = new Date();
console.log(ts.getTime()+ ' Client start.');
client.send(message, 0, message.length, PORT, HOST, function(err, bytes) {
  if (err) throw err;
  ts = new Date();
  console.log(ts.getTime()+' Start command [DRIVE_STOP_CMD] N'+ incmd +'('+cmd+') args:' + 
  speed +'(0x'+ speed.toString(16) +')');
  console.log(ts.getTime()+  ' MASK=000000'+speed.toString(2)+'(bin)');
  console.log(ts.getTime()+' SND UDP client message [' +hexdump(message)+ '] sent to ' + HOST +':'+ PORT);
});
client.on('message', function (message, remote) {
  ts = new Date();
  console.log(ts.getTime()+' RCV '+remote.address + ':' + remote.port +' - [' + hexdump(message)+']');
  client.close();
});

