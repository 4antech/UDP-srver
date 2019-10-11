var ver='191003-01'
var PORT = 9090;
var HOST='127.0.0.1';
var debug=1;
var dgram = require('dgram');
var incmd = 10; // 0..11

var  AZ_SOFTLIMIT_CW   = 10;
var  AZ_SOFTLIMIT_CCW  = 20;
var  EL_SOFTLIMIT_UP   = -33;
var  EL_SOFTLIMIT_DOWN = -44;
var  SOFTLIMITS_MASK   = 0b000001111;
var  AZ_OFFSET = -100;
var  EL_OFFSET = -100;
 
function consolelog(msg){
  if (debug) {
    ts = new Date();
    console.log(ts.getTime()+' ' + msg);
  }
}


var cmd =incmd.toString(16); // 00..0a

var message = new Buffer(22);
message[0]=0x7e;
message[1]=incmd;
message[4]=(AZ_SOFTLIMIT_CW & 0x00ff0000)>>16;
message[3]=(AZ_SOFTLIMIT_CW & 0x0000ff00)>>8;
message[2]=AZ_SOFTLIMIT_CW  & 0x000000ff;

message[7]=(AZ_SOFTLIMIT_CW & 0x00ff0000)>>16;
message[6]=(AZ_SOFTLIMIT_CW & 0x0000ff00)>>8;
message[5]=AZ_SOFTLIMIT_CW  & 0x000000ff;

message[10]=(EL_SOFTLIMIT_UP & 0x00ff0000)>>16;
message[9]=(EL_SOFTLIMIT_UP & 0x0000ff00)>>8;
message[8]=EL_SOFTLIMIT_UP & 0x000000ff;

message[13]=(EL_SOFTLIMIT_DOWN & 0x00ff0000)>>16;
message[12]=(EL_SOFTLIMIT_DOWN & 0x0000ff00)>>8;
message[11]=EL_SOFTLIMIT_DOWN & 0x000000ff;

message[14]=SOFTLIMITS_MASK & 0b00001111;

message[17]=(AZ_OFFSET & 0x00ff0000)>>16;
message[16]=(AZ_OFFSET & 0x0000ff00)>>8;
message[15]=AZ_OFFSET & 0x000000ff;

message[20]=(EL_OFFSET & 0x00ff0000)>>16;
message[19]=(EL_OFFSET & 0x0000ff00)>>8;
message[18]=EL_OFFSET & 0x000000ff;

message[21]=0x7f;


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
  console.log(ts.getTime()+' Start command [SETSYSPARAMS_CMD] N'+ incmd +'('+cmd+') args:' );
  consolelog('- AZ_SOFTLIMIT_CW='+AZ_SOFTLIMIT_CW);
  consolelog('- AZ_SOFTLIMIT_CCW='+AZ_SOFTLIMIT_CCW);
  consolelog('- EL_SOFTLIMIT_UP='+EL_SOFTLIMIT_UP);
  consolelog('- EL_SOFTLIMIT_DOWN='+EL_SOFTLIMIT_DOWN);
  consolelog('- SOFTLIMITS_MASK='+SOFTLIMITS_MASK.toString(2)+'(bin)');
  consolelog('- AZ_OFFSET='+AZ_OFFSET);
  consolelog('- EL_OFFSET='+EL_OFFSET);

  
//  console.log(ts.getTime()+' Target='+target+' speed='+speed);
  console.log(ts.getTime()+' SND UDP client message [' +hexdump(message)+ '] sent to ' + HOST +':'+ PORT);
});
client.on('message', function (message, remote) {
  ts = new Date();
  console.log(ts.getTime()+' RCV '+remote.address + ':' + remote.port +' - [' + hexdump(message)+']');
  client.close();
});

