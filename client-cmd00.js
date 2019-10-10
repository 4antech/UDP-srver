
//TODO out requested variables 

var ver='191003-03'
var PORT = 9090;
var HOST='127.0.0.1';

var dgram = require('dgram');
var incmd = 0; // 0..11
var cmd =incmd.toString(16); // 00..0a
if (cmd<15) cmd='0' + cmd;
var cmdname=['GETSTATUS_CMD',  //no args
             'AZ_MOVETO_CMD',  //3-target 2-speed
             'EL_MOVETO_CMD',  //3-target 2-speed
             'AZ_MOVE_CMD',    //3-target 2-speed
             'EL_MOVE_CMD',    //3-target 2-speed
             'AZ_MOVESTEP_CMD',//3-step
             'EL_MOVESTEP_CMD',//3-step
             'DRIVE_STOP_CMD', //1-mask
             'AZ_BRAKE_CMD',   //1-CTRL_PARAM
             'GETSYSPARAMS_CMD',//noargs
             'SETSYSPARAMS_CMD' // [AZ_SOFTLIMIT_CW ] 
            ]; 
var message = new Buffer(3)
message[0]=0x7e;
message[1]=incmd;
message[2]=0x7f;

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
  console.log(ts.getTime()+' Start command N' + incmd +'('+cmd+') ' + cmdname[incmd]);
  console.log(ts.getTime()+' SND UDP client message [' +hexdump(message)+ '] sent to ' + HOST +':'+ PORT);
});
client.on('message', function (message, remote) {
  ts = new Date();
  console.log(ts.getTime()+' RCV '+remote.address + ':' + remote.port +' - [' + hexdump(message)+']');
  client.close();
});

