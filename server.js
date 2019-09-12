/// UDP server       ///////////////////////
var version=190907.1
var debug=1;
var PORT = 9090;
var HOST = '127.0.0.1';
var dgram = require('dgram');
var server = dgram.createSocket('udp4');
///////////////////////my variables
//var msgResponse="init";
var ts = new Date();
var dmsg="";
///////////////////////my function
function consolelog(msg){if (debug) console.log(msg);}
function hexdump(msg){  
  var tmp='.';
  for (var i=0;i<msg.length;i++) tmp+=(msg[i].toString(16)) + '.';
  return tmp;
}
//////////////////////////////////// Verification incoming data
function validation(cmd,message){
  if (message[0]!=126 || message[message.length-1]!=127 ) return -1;//0x7e 0x7f
//detection packet size
  var cmd=message[1];
  if (cmd<0 || cmd>11) return 0; //unknown command
  if (cmd==0 && message.length!=3) return 0; //eror size packet 1+1      +1=3. 
  if (cmd==1 && message.length!=8) return 0; //eror size packet 1+1+ 3+2 +1=8.
  if (cmd==2 && message.length!=8) return 0; //eror size packet 1+1+ 3+2 +1=8.
  if (cmd==3 && message.length!=5) return 0; //eror size packet 1+1+ 2   +1=5.
  if (cmd==4 && message.length!=5) return 0; //eror size packet 1+1+ 2   +1=5.
  if (cmd==5 && message.length!=8) return 0; //eror size packet 1+1+ 3+2 +1=8.
  if (cmd==6 && message.length!=8) return 0; //eror size packet 1+1+ 3+2 +1=8.
  if (cmd==7 && message.length!=4) return 0; //eror size packet 1+1+ 1   +1=4.
  if (cmd==8 && message.length!=4) return 0; //eror size packet 1+1+ 1   +1=4.
  if (cmd==9 && message.length!=3) return 0; //eror size packet 1+1      +1=3.
  if (cmd==10 && message.length!=22) return 0; //eror 1+1+3+3+3+3+1+3+3  +1=22
///////// packetsize ok! 
///////// validating argument value range
//TODO test Big-Litle Endian
  if (cmd==1 || cmd==2){ //                  EL_MOVETO_CMD  +  AZ_MOVETO_CMD
    var target=message[2]*256*256+message[3]*256+message[4];
    var speed=message[5]*256+message[6];
    if (speed<-1000 || speed>1000 ||target<-524288 ||target>524288)return 0;
  } 
  if (cmd==3 || cmd==4){ //                     EL_MOVE_CMD  +  AZ_MOVE_CMD
    var speed=message[2]*256+message[3];
    if (speed<-1000 || speed>1000)return 0;
  } 
  if (cmd==5 || cmd==6){ //                  EL_MOVESTEP_CMD + AZ_MOVESTEP_CMD  
    var step=message[2]*256*256+message[3]*256+message[4];
    var speed=message[5]*256+message[6];
    if (speed<0 || speed>1000 || step>1048576 ||step<0)return 0;
  } 
  if (cmd==7 && (message[2]>3 || message[2]<0)) return 0;  //DRIVE_STOP_CMD
  if (cmd==8 && message[2]!=1 && message[2]!=0) return 0;  //AZ_BRAKE_CMD
  if (cmd==10){
    var  AZ_SOFTLIMIT_CW  =message[2]*256*256+message[3]*256+message[4];
    var  AZ_SOFTLIMIT_CCW =message[5]*256*256+message[6]*256+message[7];
    var  EL_SOFTLIMIT_UP  =message[8]*256*256+message[9]*256+message[10];
    var  EL_SOFTLIMIT_DOWN=message[11]*256*256+message[12]*256+message[13];
    var  SOFTLIMITS_MASK  =message[14];
    var  AZ_OFFSET =message[15]*256*256+message[16]*256+message[17];
    var  EL_OFFSET =message[18]*256*256+message[19]*256+message[20];        
    if (AZ_SOFTLIMIT_CW < 0 || 
        AZ_SOFTLIMIT_CW > 1048576 ||
        AZ_SOFTLIMIT_CCW < 0 || 
        AZ_SOFTLIMIT_CCW >1048576  ||
        EL_SOFTLIMIT_UP < -524288 ||
        EL_SOFTLIMIT_UP > 524288  ||
        EL_SOFTLIMIT_DOWN < -524288 ||
        EL_SOFTLIMIT_DOWN > 524288  ||
        SOFTLIMITS_MASK <0 ||
        SOFTLIMITS_MASK >15 ||       
        AZ_OFFSET < -1048576 ||
        AZ_OFFSET > 1048576 ) return 0;
  }
  return 1;
};
/////////////////////////////////////////////////////////////////////////
function getdata0(){return "12345678901234567890123456789012"};
function getdata9(){return "123456789012"};
function goodanswer(cmd,message){  
  if (cmd!=0 && cmd!=9) return ('\x7e'+String.fromCharCode(cmd)+'\x00\x7f')  
  if (cmd==0) return getdata0();
  if (cmd==9) return getdata9();
  return '';
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
  var packetResponse=new Buffer('');
  var msglog='';
  ts = new Date();
  consolelog(ts.getTime() + ' rcv from ' + remote.address + ':' + remote.port + ' - [' + hexdump(message) + ']');
  var command=message[1];
  var validstatus=validation(command,message);
  if (validstatus==0) {     //bad argument
      msgResponse="\x7e"+String.fromCharCode(command)+"\x01\x7f";//String.fromCharCode(command)
      msglog=("error packet args ["+ hexdump(message) +"]");
  }
  if (validstatus<0) {      //bad incoming packet
    msgResponse="\x7e\x0b\x01\x7f";        
    msglog=("error packet size:" + message.length +" for this command:["+cmd.toString(16)+"]");  
  }
  if (validstatus>0) {      //packet & argument Ok!
    msgResponse=goodanswer(command,message);
    msglog=('CMD Ok [' + command + ']');
  }
  ts = new Date();
  consolelog(ts.getTime() + ' ' + msglog +' from ' + remote.address + ':' + remote.port);
  packetResponse=new Buffer(msgResponse);  
///////// response function
  server.send(packetResponse, 0, packetResponse.length, remote.port, remote.address, function(err, bytes) {
    ts = new Date();
    if (err) throw err;
    consolelog(ts.getTime() + ' snt UDP server message response to ' + remote.address + ':' + remote.port +' [' + hexdump(packetResponse) + ']');
  });  
});

server.bind(PORT, HOST);


