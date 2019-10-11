var ver='191003-01'
var PORT = 9090;
var HOST='127.0.0.1';
var debug=1;
var dgram = require('dgram');
var incmd = 9; // 0..11
var speed  = -100; 
var cmd =incmd.toString(16); // 00..0a

function consolelog(msg){
  if (debug) {
    ts = new Date();
    console.log(ts.getTime()+' ' + msg);
  }
}


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
  console.log(ts.getTime()+' Start command N'+ incmd +' [GETSYSPARAMS_CMD] args: Noargs');
  console.log(ts.getTime()+' SND UDP client message [' +hexdump(message)+ '] sent to ' + HOST +':'+ PORT);
});
client.on('message', function (message, remote) {
  ts = new Date();
  console.log(ts.getTime()+' RCV '+remote.address + ':' + remote.port +' - [' + hexdump(message)+']');
  var  AZ_SOFTLIMIT_CW   = message[5]*256*256+message[4]*256+message[3];
  var  AZ_SOFTLIMIT_CCW  = message[8]*256*256+message[7]*256+message[6];
  var  EL_SOFTLIMIT_UP   =  message[11]*256*256+message[10]*256+message[9];
  if (message[11]>127) EL_SOFTLIMIT_UP=-(0x1000000-EL_SOFTLIMIT_UP); 
  var  EL_SOFTLIMIT_DOWN = message[14]*256*256+message[13]*256+message[12];  
  if (message[14]>127) EL_OFFSET=-(0x1000000-EL_OFFSET);
  var  SOFTLIMITS_MASK =message[15];
  var    AZ_OFFSET = message[18]*256*256+message[17]*256+message[16];
  if (message[18]>127) AZ_OFFSET=-(0x1000000-AZ_OFFSET);  
  var    EL_OFFSET = message[21]*256*256+message[20]*256+message[19];        
  if (message[21]>127) EL_OFFSET=-(0x1000000-EL_OFFSET);
  var cw =(SOFTLIMITS_MASK  & 0b00000001); // bit 0
  var ccw=(SOFTLIMITS_MASK  & 0b00000010)>>1; // bit 1
  var up =(SOFTLIMITS_MASK  & 0b00000100)>>2; // bit 2
  var down=(SOFTLIMITS_MASK & 0b00001000)>>3; // bit 3  
  consolelog('+ cmd N9 ANSWER from server:');
  consolelog('+ AZ_SOFTLIMIT_CW='+AZ_SOFTLIMIT_CW);
  consolelog('+ AZ_SOFTLIMIT_CCW='+AZ_SOFTLIMIT_CCW);
  consolelog('+ EL_SOFTLIMIT_UP='+EL_SOFTLIMIT_UP);
  consolelog('+ EL_SOFTLIMIT_DOWN='+EL_SOFTLIMIT_DOWN);
  consolelog('+ SOFTLIMITS_MASK='+SOFTLIMITS_MASK.toString(2));
  consolelog('+ * bit-mask: cw:'+ cw +' ccw:'+ ccw +' up:' + up +' down:'+down);
  consolelog('+ AZ_OFFSET='+AZ_OFFSET);
  consolelog('+ EL_OFFSET='+EL_OFFSET);    

  client.close();
});

