/// UDP server       ///////////////////////
var version=190927.1
var debug=1;
var PORT = 9090;
//var HOST = '172.22.22.102';
var HOST='127.0.0.1';
var dgram = require('dgram');
var server = dgram.createSocket('udp4');
///////////////////////my variables
//var msgResponse="init";
var statemove_el = 0;
var statemove_az = 0;

var ts = new Date();
var dmsg="";
///////////////////////my function
function consolelog(msg){
  if (debug) {
    ts = new Date();
    console.log(ts.getTime()+' ' + msg);
  }
}

function hexdump(msg){  
  var tmpstr='.';
  for (var i=0;i<msg.length;i++) {
    if (msg[i]<16 ) tmpstr+='0'+(msg[i].toString(16)) + '.';
    else tmpstr+=(msg[i].toString(16)) + '.';
  }
  return tmpstr;
}

function num2hex1(num){if (num<255) return String.fromCharCode(num); }
//TODO: dodelat
function num2hex2(num){
  if (num>65535); 
}
function num2hex3(num){
}
//////////////////// Math
// Elevation
const m=1860                         ;//              /|
const n=720                          ;//             / |
const a=1860                         ;//            /  |
const a2=a*a                         ;//           /   |a
const b=Math.sqrt(m*m + n*n)         ;//         c/    |
const b2=(m*m + n*n)                 ;//         /     |
const phi=Math.atan2(n,m)            ;//   _____/______|______
const r = a2 + b2                    ;//       /    _/   
const p = 2 * a * b                  ;//      /  _/b     n
const pi_phi =  Math.PI  + phi       ;//     /_/      _| 
const pi05_phi = Math.PI/2 + phi     ;//         m  
function alpha(c)  {return (pi_phi   - Math.acos((r-c*c)/p));}
function zeta(c)   {return (pi05_phi - Math.acos((r-c*c)/p));} // alpha-Pi/2
//////////////////// Mech
//  ax2 1 round = 10 mm lenght of shtock
//  ax2 1 round = ax1 31.738x4.55= 144.4079 Round=144round+146º50'38.4"
//  1 mm lenght of shtock    = ax1 14.40079 Round=14round+158º41'3.84"
//  ax1 1444079 = ax2 10000
//
function div2rad(mega){ 
  if (mega>=0 && mega<=1048576) return mega*Math.PI*2/1048576;
  else return -1;
}
function rad2div(ang){ 
  if (ang==0) return 0;
  else return Math.round((Math.PI*2/ang)*1048576);
}
function div2rad_neg(mega){ 
  if (mega>524288 || mega<-524288) console.log("error value for franslate to radian");
  else  return ((mega*Math.PI*2/1048576)-Math.PI/2);
}
function rad2div_neg(ang){return (rad2div(ang+Math.PI/2)-524288);}


const shtok_min=720;   // zeta(720)=0.
const shtok_max=3190;  // zeta(3190)= -30' ; zeta(3180)=+2'
function shtoksize(z){ return Math.sqrt(r - p*Math.cos(pi05_phi-z));} //
//////////////////////////////////// Verification incoming data
function validation(cmd,message){
  if (message[0]!=126 || message[message.length-1]!=127 ) return -1;//0x7e 0x7f
//detection packet size
  var cmd=message[1];
  if (cmd<0 || cmd>10) return 0; //unknown command
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
    var target=(message[2]*256*256) + (message[3]*256) + message[4];
    if (message[2]>127) target=-(0x1000000-target);
    var speed=(message[5]*256) + message[6];
    if (message[5]>127) speed=-(0x10000-speed);
    consolelog('* cmd=' +cmd +' args: target='+target +' speed='+ speed);        
    if (speed<-1000 || speed>1000 ||target<-524288 ||target>524288){
      consolelog('! ERROR target=' + target + ' speed='+ speed);
      return 0;
    }
  }///// CMD01 & CMD 02 testeted with myclient
  
  if (cmd==3 || cmd==4){ //                     EL_MOVE_CMD  +  AZ_MOVE_CMD
    var speed=message[2]*256+message[3];
    if (message[5]>127) speed=-(0x10000-speed);
    if (speed<-1000 || speed>1000)return 0;
  } 
  
  if (cmd==5 || cmd==6){ //                  EL_MOVESTEP_CMD + AZ_MOVESTEP_CMD  
    var step=(message[2]*256*256) + (message[3]*256) + message[4];
    var speed=(message[5]*256)+message[6];
    if (speed<0 || speed>1000 || step>1048576 ||step<0)return 0;
  } 
  
  if (cmd==7 && (message[2]>3 || message[2]<0)) return 0;  //DRIVE_STOP_CMD
  if (cmd==8 && message[2]!=1 && message[2]!=0) return 0;  //AZ_BRAKE_CMD

  if (cmd==10){
//TODO: positive|negative value?  
    var  AZ_SOFTLIMIT_CW   = message[2]*256*256+message[3]*256+message[4];
    var  AZ_SOFTLIMIT_CCW  = message[5]*256*256+message[6]*256+message[7];
    var  EL_SOFTLIMIT_UP   = message[8]*256*256+message[9]*256+message[10];
    if (message[8]>127) EL_SOFTLIMIT_UP=-(0x1000000-EL_SOFTLIMIT_UP);

    var  EL_SOFTLIMIT_DOWN = message[11]*256*256+message[12]*256+message[13];  
    if (message[11]>127) EL_SOFTLIMIT_DOWN=-(0x1000000-EL_SOFTLIMIT_DOWN);

    var  SOFTLIMITS_MASK   = message[14];
    var  AZ_OFFSET = message[15]*256*256+message[16]*256+message[17];
    var  EL_OFFSET = message[18]*256*256+message[19]*256+message[20];        
    if (message[15]>127) AZ_OFFSET=-(0x1000000-AZ_OFFSET);
    if (message[15]>127) EL_OFFSET=-(0x1000000-EL_OFFSET);

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
      EL_OFFSET < -1048576 ||
      EL_OFFSET > 1048576
      AZ_OFFSET < -1048576 ||
      AZ_OFFSET > 1048576 )
      
       return 0;
  }
  return 1;
};
/////////////////////////////////////////////////////////////////////////
function getdata0(){
/*
0-STX=0x7E STX  - маркер начала пакета данных (код символа 0x7E)
1-GETSTATUS_CMD=0x00
2-REPLY_PARAM=0x02 - признак ответа на запрос параметров 
3,4,5-AZ_COORD текущие показания азимутального датчика угла поворота 0..1048576 
  3 байта. значения в диапазоне 0..1048576, соответствующие углам 0 ... 360°
6,7,8-EL_COORD текущие показания угломестного датчика угла поворота ОПУ 
  3 байта, значения в диапазоне -524288 ... 524288, соответствующие углам 
  -180° ... 180°
9,10-AZ_SPEED текущее значение угловой скорости азимутального привода ОПУ
  2 байта, значение в диапазоне -1000..1000, соответствующее максимальной 
  скорости привода в %*10 
  со знаком "+" в направлении CW; со знаком "-" в направлении CCW.  
11,12-EL_SPEED текущее значение угловой скорости угломестного привода ОПУ
  2 байта, значение в диапазоне -1000 ... 1000, соответствующее максимальной 
  скорости привода в %*10 
  со знаком "+" в направлении UP; со знаком "-" в направлении DOWN
13-AZ_DRIVESTATE текущий режим работы азимутального привода ОПУ
          0х00 -STOP,
          0х01 - CW,
          0х02 - CCW
14-EL_DRIVESTATE текущий режим работы угломестного привода ОПУ
          0х00 -STOP,
          0х01 - UP,
          0х02 - DOWN
15-AZ_LIMITS Текущее состояние ограничителей углов поворота 
  азимутального привода ОПУ
  Программный ограничитель :
        бит 0 –  CW;
        бит 1 –  CСW.
  Аппаратный конц. выключатель:
        бит 2 –  CW;
        бит 3 –  CCW. 
  Значения :
  0 – нет ограничения;
  1- срабатывание ограничителя
  1 байт,
  Значение какого-либо из упомянутых выше бит, равное 0, соответствует 
  отсутствию ограничения, значение равное 1 соответствует срабатыванию 
  соответствующего ограничителя
16 EL_LIMITS текущее состояние ограничителей углов поворота 
  азимутального привода ОПУ
  Программный ограничитель :
       бит 0 –  UP;
       бит 1 –  DOWN.
  Аппаратный конц. выключатель:
       бит 2 –  UP;
       бит 3 – DOWN. 
  Значения :
  0 –нет ограничения;
  1- срабатывание ограничителя
  1 байт,
17-AZ_ERRORS текущая индикация ошибок азимутального привода ОПУ
  Код ошибки : 
    биты 0 и 1 - датчика угла поворота по азимуту; 
    биты 2, 3, 4 -  первого частотного преобразователя; 
    биты 5, 6, 7-  второго частотного преобразователя. 
    1 байт, 
18-EL_ERRORS текущая индикация ошибок угломестного привода ОПУ
  Код ошибки:
    биты 0 и 1- датчика угла поворота по углу места;
    биты 2, 3,4 - частотного преобразователя. 
  1 байт, 
  Значение группы битов, равное 0 сигнализирует об отсутствии ошибки, 
  значение не равное 0 сигнализирует об ошибке  с соответствующим кодом
19-AZ_BRAKE текущее состояние электромагнитного 
  тормоза азимутального привода ОПУ        
           0х00 – OFF;
           0х01 – ON
20-ETX=0x7F ETX - маркер конца пакета данных (код символа 0x7F)
*/
//  STX              1=7e
//  [GETSTATUS_CMD]  1=00
//  [REPLY_PARAM]    1=02
//  [AZ_COORD]       3
//  [EL_COORD]       3
//  [AZ_SPEED]       2
//  [EL_SPEED]       2                                                      
//  [AZ_DRIVESTATE]  1 
//  [EL_DRIVESTATE]  1 
//  [AZ_LIMITS]      1
//  [EL_LIMITS]      1
//  [AZ_ERRORS]      1
//  [EL_ERRORS]      1
//  [AZ_BRAKE]       1
//  ETX              1=7f
//      E=21Byte
    var   tmp='\x7e\x09\x02'+'12345678901234567'+'\x7f';
  return tmp;
}; //debug
function getdata9(){
/* manual from original:
STX  - маркер начала пакета данных (код символа 0x7E)
[GETSYSPARAMS_CMD]  – код команды GETSYSPARAMS_CMD, (1 байт, значение 0x09)
[REPLY_PARAM] - признак ответа на запрос параметров (1 байт, значение 0x02) 
[AZ_SOFTLIMIT_CW] - величина программного ограничения угла поворота ОПУ по 
      азимуту в направлении CW (3 байта, значения в диапазоне 0 ... 1048576, 
      соответствующие углам 0 .. 360°)
[AZ_SOFTLIMIT_СCW] - величина программного ограничения угла поворота ОПУ по 
      азимуту в направлении СCW (3 байта, значения в диапазоне 0 ... 1048576, 
      соответствующие углам 0 ... 360°)
[EL_SOFTLIMIT_UP] - величина программного ограничения угла поворота ОПУ по углу 
      места в направлении UP (3 байта, значения в диапазоне -524288 ... 524288, 
      соответствующие углам -180° ... 180°)
[EL_SOFTLIMIT_DOWN] -величина программного ограничения угла поворота ОПУ по углу 
      места в направлении DOWN (3 байта, значения в диапазоне -524288 .. 524288, 
      соответствующие углам -180° ... 180°)
[SOFTLIMITS_MASK] - маска блокировки программного ограничения углов поворота ОПУ
     (1 байт, биты 0 и 1 управляют ограничением угла поворота по азимуту в 
     направлениях CW и СCW соответственно, биты 2 и 3 управляют ограничением 
     угла поворота по углу места в направлениях UP и DOWN соответственно, 
     значения битов, равные 1, отображают активированное состояние программного 
     ограничения, значения битов, равные 0, отображают отключенное программное 
     ограничение)
[AZ_OFFSET] -  величина поправки к показанию азимутального датчика угла поворота 
     ОПУ (3 байта, значения в диапазоне -1048576 … 1048576, соответствующие 
     углам -360° ... 360°) 
[EL_OFFSET] -  величина поправки к показанию угломестного датчика угла поворота 
     ОПУ (3 байта, значения в диапазоне -1048576 ... 1048576, соответствующие 
     углам -360° ... 360°) 
ETX - маркер конца пакета данных (код символа 0x7F)
*/
//  STX                 1=7e
//  [GETSYSPARAMS_CMD]  1=09
//  [REPLY_PARAM]       1=02
//  [AZ_SOFTLIMIT_CW ]  3
//  [AZ_SOFTLIMIT_СCW]  3
//  [EL_SOFTLIMIT_UP]   3
//  [EL_SOFTLIMIT_DOWN] 3
//  [SOFTLIMITS_MASK]   1
//  [AZ_OFFSET]         3 
//  [EL_OFFSET]         3
//  ETX                 1=7f
  // E=23Byte
  var   tmp='\x7e\x09\x02'+'1234567890123456789'+'\x7f';
  return tmp;
};    //debug
function goodanswer(cmd,message){  
  if (cmd!=0 && cmd!=9) return ('\x7e'+String.fromCharCode(cmd)+'\x00\x7f')  
  if (cmd==0) return getdata0();
  if (cmd==9) return getdata9();
  return '';
};
///////////////////////command processor
function startcommand(message){

  consolelog('* start command ' + message[1]);
};
///////////////////////server function
server.on('listening', function () {
  lastcmd=0;
  var address = server.address();
  consolelog('* Start UDP Server listening on ' + address.address + ":" + address.port);
});
server.on('message', function (message, remote) {
  var packetResponse=new Buffer('');
  var msglog='';
  consolelog('< rcv from ' + remote.address + ':' + remote.port + ' - [' + hexdump(message) + ']');
  var command=message[1];
  var validstatus=validation(command,message);
  if (validstatus==0) {     //bad argument
      msgResponse="\x7e"+String.fromCharCode(command)+"\x01\x7f";//String.fromCharCode(command)
      msglog=("! Error packet args ["+ hexdump(message) +"]");
  }
  if (validstatus<0) {      //bad incoming packet
    msgResponse="\x7e\x0b\x01\x7f";        
    msglog=("! error packet size:" + message.length +" for this command:["+cmd.toString(16)+"]");  
  }
  if (validstatus>0) {      //packet & argument Ok!
    msgResponse=goodanswer(command,message);
    startcommand(message);
    msglog=('* CMD Ok [' + command + ']');
//    lastcmd=message;
  }
  consolelog('< ' + msglog +' from ' + remote.address + ':' + remote.port);
  packetResponse=new Buffer(msgResponse);  
///////// response function
  server.send(packetResponse, 0, packetResponse.length, remote.port, remote.address, function(err, bytes) {
    if (err) throw err;
    consolelog('> snt UDP server message response to ' + remote.address + ':' + remote.port +' [' + hexdump(packetResponse) + ']');
    consolelog('____________');
  });  
});
server.bind(PORT, HOST);

console.log('-----------------------------');
//for (var i=shtok_min;i<shtok_max;i++) consolelog(' '+i+' alp=' +(alpha(i)*180/Math.PI)+' zeta='+(zeta(i)*180/Math.PI));
//console.log(shtoksize(0) + ' ' + shtoksize(Math.PI/2));
//consolelog('rad 0   ='+rad2div(0)+'  0       ='+ div2rad(0));
//consolelog('rad Pi/2='+rad2div(Math.PI/2)+' 524288='+div2rad(524288));
//consolelog('rad Pi  ='+rad2div(Math.PI)+'  1048576='+div2rad(524288+524288));
