/// UDP server pion-bistrolet    ///////////////////////
var version=200421.1
var debug=3;
var PORT = 9090;
//var HOST = '172.22.22.102';
var HOST='127.0.0.1';
//var HOST='192.162.132.124'; // pumps
var dgram = require('dgram');
var server = dgram.createSocket('udp4');
const fs = require("fs");
///////////////////////my function
//function consolelog(msg){
//  if (debug) {
//    ts = new Date();
//    var textlog=(ts.getTime()+'. ' + msg);
//    console.log(textlog);
//    if (debug>1) fs.appendFileSync("./server.log", textlog);
//  }
//}
function consolelog(msg){
  if (debug) {
    ts = new Date();
    var textlog=(ts.getTime()+'. ' + msg);
    console.log(textlog)
    if (debug>2) textlog=textlog+' <br>';
    textlog=textlog+'\n';
    if (debug>1) fs.appendFileSync("./server.log", textlog);
  }
}

///////////////////////my variables
//var msgResponse="init";
//variable - flag-status of mooving drivs: 0-stay 1-mooving
var statemove_el = 0;
var statemove_az = 0;
//variable - flag-status brake-stat 0-off 1-brake-on
var statebrake_el = 0; //not used in pion
var statebrake_az = 0; 

//TODO: set to REAL DATA for device
var  AZ_SOFTLIMIT_CW   = 10;
var  AZ_SOFTLIMIT_CCW  = 20;
var  EL_SOFTLIMIT_UP   = 30;
var  EL_SOFTLIMIT_DOWN = 40;
var  SOFTLIMITS_MASK =15;
var  AZ_OFFSET = 60;
var  EL_OFFSET = 70;

//END TODO----------------------------

function xstop(){statemove_az=0;}
function ystop(){statemove_el=0;}
function xgoto(target,speed){statemove_az=1;}
function ygoto(target,speed){statemove_el=1;}
function xbrake(arg){}
function ybrake(arg){}
function xdelta(angle,speed){}
function xdelta(angle,speed){}

function AZ_COORD(){        // 3 bytes
  return 100
}

function EL_COORD(){        // 3 bytes
  return 100
}

function AZ_SPEED() {       // 2 bytes
  return 10
}

function EL_SPEED()  {      // 2 bytes                                                 
  return 100
}

function AZ_DRIVESTATE(){   // 1 bytes
  return 32
}

function EL_DRIVESTATE(){   // 1 bytes
  return 32
}

function AZ_LIMITS(){       // 1 bytes
  return 32
}

function EL_LIMITS(){       // 1 bytes
  return 32
}

function AZ_ERRORS(){       // 1 bytes
  return 32
}

function EL_ERRORS(){       // 1 bytes
  return 32
}

function AZ_BRAKE() {       // 1 bytes
  return 32
}

var ts = new Date();
var dmsg="";
///////////////////////////////////////////////////////

function hexdump(msg){  //return string in
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

//////////////////// Math & mech
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
///////////////////////////////////////////////////////////////////////



//////////////////////////////////// Verification incoming data
// returned errcode
// good data           1
// bad args            0
// non-formated       -1
// unknown command    -2
// bad packet size    -3
function validation(cmd,message){
//detection START-END Bytes 0x7e 0x7f
  if (message[0]!=126 || message[message.length-1]!=127 ) return -1;//0x7e 0x7f

//detection command number. valid range 0..10
  var cmd=message[1];
  if (cmd<0 || cmd>10) return -2; //unknown command

//detection packet size
  var cmdsize=[3,8,8,5,5,8,8,4,4,3,22];
  if (cmdsize[cmd] != message.length ) return -3;
//var cmdargs=[0,2,2,1,1,2,2,1,1,0,7];  
//  if (cmd==0 && message.length!=3) return -3; //eror size packet 1+1      +1=3. 0
//  if (cmd==1 && message.length!=8) return -3; //eror size packet 1+1+ 3+2 +1=8. 2
//  if (cmd==2 && message.length!=8) return -3; //eror size packet 1+1+ 3+2 +1=8. 2
//  if (cmd==3 && message.length!=5) return -3; //eror size packet 1+1+ 2   +1=5. 1
//  if (cmd==4 && message.length!=5) return -3; //eror size packet 1+1+ 2   +1=5. 1
//  if (cmd==5 && message.length!=8) return -3; //eror size packet 1+1+ 3+2 +1=8. 2
//  if (cmd==6 && message.length!=8) return -3; //eror size packet 1+1+ 3+2 +1=8. 2
//  if (cmd==7 && message.length!=4) return -3; //eror size packet 1+1+ 1   +1=4. 1
//  if (cmd==8 && message.length!=4) return -3; //eror size packet 1+1+ 1   +1=4. 1
//  if (cmd==9 && message.length!=3) return -3; //eror size packet 1+1      +1=3. 0
//  if (cmd==10 && message.length!=22) return -3; //eror 1+1+3+3+3+3+1+3+3  +1=22 7
///////// packetsize ok! 

///////// validating argument value range
//TODO test Big-Litle Endian

  if (cmd==1){ //    AZ_MOVETO_CMD
    var target=(message[4]*256*256) + (message[3]*256) + message[2];
//    if (message[2]>127) target=-(0x1000000-target);
    var speed=(message[6]*256) + message[5];
//    if (message[5]>127) speed=-(0x10000-speed);
    consolelog('* cmd=' +cmd +' args: target='+target +' speed='+ speed);        
    if (speed<0 || speed>1000 ||target<0 ||target>1048576){
      consolelog('! ERROR target=' + target + ' speed='+ speed);
      consolelog('! Valid args range: speed=[0..1000] target=[0..1048576]');
      return 0;
    }
  }
  
  if (cmd==2){ //   EL_MOVETO_CMD
    var target=(message[4]*256*256) + (message[3]*256) + message[2];
    if (message[4]>127) target=-(0x1000000-target);
    var speed=(message[6]*256) + message[5];
  //  if (message[5]>127) speed=-(0x10000-speed);
    consolelog('* cmd=' +cmd +' args: target='+target +' speed='+ speed);        
    if (speed<-1000 || speed>1000 ||target<-524288 ||target>524288){
      consolelog('! ERROR  Args! target=' + target + ' speed='+ speed);
      consolelog('! Valid args range: speed=[-1000..1000] target=[-524288..524288]');
      return 0;
    }
  }
  
  if (cmd==3 || cmd==4){ //                     EL_MOVE_CMD  +  AZ_MOVE_CMD
    var speed=message[3]*256+message[2];
    if (message[3]>127) speed=-(0x10000-speed);
    consolelog('* cmd=' +cmd +' args: speed='+ speed);        
    if (speed<-1000 || speed>1000)
    {
      consolelog('! ERROR Args! speed='+ speed +' Valid speed[-1000..1000]');        
      return 0;
    }
  }
   
  if (cmd==5 || cmd==6){ //                  EL_MOVESTEP_CMD + AZ_MOVESTEP_CMD  
    var step=(message[4]*256*256) + (message[3]*256) + message[2];
    if (message[4]>127) step=-(0x1000000-step);
    var speed=(message[6]*256)+message[5];
    if (message[6]>127) speed=-(0x10000-speed);
    consolelog('* cmd=' + cmd +' args: speed=' + speed + ' step=' + step);        
    if (speed<-1000 || speed>1000 || step>1048576 ||step<0){
      consolelog('! ERROR Args! Valid speed[-1000..1000] step[0..1048576]');        
      return 0;
    }
  }
   
  if (cmd==7){
    consolelog('* cmd=' +cmd +' args:'+ message[2].toString(2));        
    if (message[2]>3 || message[2]<0) {
      consolelog('! ERROR Args! STOP mask='+ message[2].toString(2) +' Valid mask[00..11]');
      return 0;  //DRIVE_STOP_CMD
    }
  }
  
  if (cmd==8){
    consolelog('* cmd=' +cmd +' args:'+ message[2].toString(2));        
    if (message[2]!=1 && message[2]!=0){
      consolelog('! ERROR Args! BRAKE mask='+ message[2].toString(2) +' Valid mask[00..01]');
      return 0;  //AZ_BRAKE_CMD
    }
  }
  
  if (cmd==10){
//TODO: TEST positive|negative value?
    consolelog('* cmd=' + cmd +' args:');   
    
    var  zAZ_SOFTLIMIT_CW   = message[4]*256*256+message[3]*256+message[2];
    consolelog('- AZ_SOFTLIMIT_CW='+zAZ_SOFTLIMIT_CW);
    
    var  zAZ_SOFTLIMIT_CCW  = message[7]*256*256+message[6]*256+message[5];
    consolelog('- AZ_SOFTLIMIT_CCW='+zAZ_SOFTLIMIT_CCW);
    
    var  zEL_SOFTLIMIT_UP   = message[10]*256*256+message[9]*256+message[8];
    if (message[10]>127) zEL_SOFTLIMIT_UP=-(0x1000000-zEL_SOFTLIMIT_UP);
    consolelog('- EL_SOFTLIMIT_UP='+zEL_SOFTLIMIT_UP);

    var  zEL_SOFTLIMIT_DOWN = message[13]*256*256+message[12]*256+message[11];  
    if (message[13]>127) zEL_SOFTLIMIT_DOWN=-(0x1000000-zEL_SOFTLIMIT_DOWN);
    consolelog('- EL_SOFTLIMIT_DOWN='+zEL_SOFTLIMIT_DOWN);

    var  zSOFTLIMITS_MASK   = message[14];
    consolelog('- SOFTLIMITS_MASK='+zSOFTLIMITS_MASK.toString(2));
    
    var  zAZ_OFFSET = message[17]*256*256+message[16]*256+message[15];
    var  zEL_OFFSET = message[20]*256*256+message[19]*256+message[18];        
    if (message[17]>127) zAZ_OFFSET=-(0x1000000-zAZ_OFFSET);
    if (message[20]>127) zEL_OFFSET=-(0x1000000-zEL_OFFSET);
    consolelog('- AZ_OFFSET='+zAZ_OFFSET);
    consolelog('- EL_OFFSET='+zEL_OFFSET);

    if (zAZ_SOFTLIMIT_CW < 0       || 
      zAZ_SOFTLIMIT_CW > 1048576   ||
      zAZ_SOFTLIMIT_CCW < 0        || 
      zAZ_SOFTLIMIT_CCW >1048576   ||
      zEL_SOFTLIMIT_UP < -524288   ||
      zEL_SOFTLIMIT_UP > 524288    ||
      zEL_SOFTLIMIT_DOWN < -524288 ||
      zEL_SOFTLIMIT_DOWN > 524288  ||
      zSOFTLIMITS_MASK <0   ||
      zSOFTLIMITS_MASK >15  ||       
      zEL_OFFSET < -1048576 ||
      zEL_OFFSET > 1048576  ||
      zAZ_OFFSET < -1048576 ||
      zAZ_OFFSET > 1048576 ){   
      consolelog('! ERROR Args valid range!'); 
      consolelog('! AZ_SOFTLIMIT_CW & AZ_SOFTLIMIT_CCW [0..1048576]'); 
      consolelog('! EL_SOFTLIMIT_UP & EL_SOFTLIMIT_DOWN [-524288..524288]'); 
      consolelog('! SOFTLIMIT_MASK [0..1111] bin'); 
      consolelog('! EL_OFFSET AZ_OFFSET [-1048576..1048576]'); 
      return 0;
    }
    else {
      AZ_SOFTLIMIT_CW=zAZ_SOFTLIMIT_CW;
      AZ_SOFTLIMIT_CCW=zAZ_SOFTLIMIT_CCW; 
      EL_SOFTLIMIT_UP=zEL_SOFTLIMIT_UP; 
      EL_SOFTLIMIT_DOWN=zEL_SOFTLIMIT_DOWN;
      SOFTLIMITS_MASK=zSOFTLIMITS_MASK;
      EL_OFFSET=zEL_OFFSET;
      AZ_OFFSET=zAZ_OFFSET;
    }
  }
  return 1;
};
/////////////////////////////////////////////////////////////////////////
function getdata0(){
//TODO 
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
    var   tmp='\x7e\x00\x02'+'12345678901234567'+'\x7f';
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
  var outstr = new Buffer.from(23)
  outstr[0]=0x7e;
  outstr[1]=9;
  outstr[2]=2;
  outstr[3]= ( AZ_SOFTLIMIT_CW & 0x000000ff);
  outstr[4]= ( AZ_SOFTLIMIT_CW & 0x0000ff00)>>8;
  outstr[5]= ( AZ_SOFTLIMIT_CW & 0x00ff0000)>>16;
  outstr[6]= ( AZ_SOFTLIMIT_CCW & 0x000000ff);
  outstr[7]= ( AZ_SOFTLIMIT_CCW & 0x0000ff00)>>8;
  outstr[8]= ( AZ_SOFTLIMIT_CCW & 0x00ff0000)>>16;
  outstr[9]=( EL_SOFTLIMIT_UP & 0x000000ff);  
  outstr[10]=( EL_SOFTLIMIT_UP & 0x0000ff00)>>8;
  outstr[11]= ( EL_SOFTLIMIT_UP & 0x00ff0000)>>16;
  outstr[12]=( EL_SOFTLIMIT_DOWN & 0x000000ff);
  outstr[13]=( EL_SOFTLIMIT_DOWN & 0x0000ff00)>>8;
  outstr[14]=( EL_SOFTLIMIT_DOWN & 0x00ff0000)>>16;  
  outstr[15]=( SOFTLIMITS_MASK & 0b00001111);   
  outstr[16]=( AZ_OFFSET & 0x000000ff);
  outstr[17]=( AZ_OFFSET & 0x0000ff00)>>8;
  outstr[18]=( AZ_OFFSET & 0x00ff0000)>>16;
  outstr[19]=( EL_OFFSET & 0x000000ff);
  outstr[20]=( EL_OFFSET & 0x0000ff00)>>8;  
  outstr[21]=( EL_OFFSET & 0x00ff0000)>>16;
  outstr[22]=0x7f;
  consolelog('+ cmd N9');
  consolelog('+ AZ_SOFTLIMIT_CW='+AZ_SOFTLIMIT_CW);
  consolelog('+ AZ_SOFTLIMIT_CCW='+AZ_SOFTLIMIT_CCW);
  consolelog('+ EL_SOFTLIMIT_UP='+EL_SOFTLIMIT_UP);
  consolelog('+ EL_SOFTLIMIT_DOWN='+EL_SOFTLIMIT_DOWN);
  consolelog('+ SOFTLIMITS_MASK='+SOFTLIMITS_MASK.toString(2));
  consolelog('+ AZ_OFFSET='+AZ_OFFSET);
  consolelog('+ EL_OFFSET='+EL_OFFSET);    
//  var   tmp='\x7e\x09\x02'+'1234567890123456789'+'\x7f';
  return outstr;
};    //debug


function goodanswer(cmd){  
  if (cmd!=0 && cmd!=9) {
    var answer = new Buffer.from(4)
    answer[0]=0x7e;
    answer[1]=cmd;
    answer[2]=0;
    answer[3]=0x7f;
    return answer; //('\x7e'+String.fromCharCode(cmd)+'\x00\x7f')  
  }
  if (cmd==0) return getdata0();
  if (cmd==9) return getdata9();
  return '';
}
///////////////////////command processor

function startcommand(message){

  consolelog('* start command ' + message[1]);
  if (message[1]==0){}            // GETSTATUS_CMD

  else if (message[1]==1) {       // [AZ_MOVETO_CMD] [TARGET] [SPEED] 
                                  // TARGET - 3 байта, 
                                  //значения в диапазоне 0 ... 1048576, 
                                  //соответствующие углам 0 ... 360°
                                  // SPEED 2 байта, значения в диапазоне 0..1000
     var target=(message[4]*256*256) + (message[3]*256) + message[2];
     var speed=(message[6]*256) + message[5];
     if (statemove_az) xstop();
     statemove_az; 
     xgoto(target,speed)                             
  }
  else if (message[1]==2) {       // [EL_MOVETO_CMD] [TARGET] [SPEED]
                                  //3 байта, 
                                  //значения в диапазоне -524288..524288, 
                                  //соответствующие углам -180° ... 180°
     var target=(message[4]*256*256) + (message[3]*256) + message[2];
     if (message[4]>127) target=-(0x1000000 - target);
     var speed=(message[6]*256) + message[5];
     if (statemove_el) ystop();
     statemove_el=1; 
     ygoto(target,speed)                             
  }
  else if (message[1]==3) {       // [AZ_MOVE_CMD]  [SPEED]
                                  // SPEED 2 байта,       
                                  // значения в диапазоне -1000 ... 1000,
                                  // соответствуют требуемой величине скорости в %*10
                                  // значение 0 означает остановку привода
    var speed=(message[3]*256) + message[2];
    if (message[3]>127) speed=-(0x10000-speed);
    if (speed==0) xstop();
    else {  
      if (speed<0) target=0;
      else if (speed>0) target=1048576;
      if (statemove_az!=0) xstop();
      xgoto(target,speed);
    }
  }  
  else if (message[1]==4) {       // [EL_MOVE_CMD]  [SPEED]
    var speed=(message[3]*256) + message[2];
    if (message[3]>127) speed=-(0x10000-speed);
    if (speed==0) ystop();
    else {  
      if (speed<0) target=0;
      else if (speed>0) target=1048576;
      if (statemove_el!=0) ystop();
      ygoto(target,speed);
    }
  }


//TODO: ->
//FIXME
  else if (message[1]==5) {       // [AZ_MOVESTEP_CMD]  [STEP] [SPEED]
                                  // STEP 3 байта, 
                                  // значения в диапазоне -1048576..1048576, 
                                  // соответствующие углам -360°..360°
                                  // SPEED 2 байта,       
                                  // значения в диапазоне 0..1000, 
                                  // значение 0 соответствует скорости, автоматически 
                                  // устанавливаемой и регулируемой контроллером, 
                                  // остальные значения соответствуют требуемой 
                                  // величине скорости в %*10
     var step =(message[4]*256*256) + (message[3]*256) + message[2];
     if (message[2]>127) step=-(0x1000000 - step);
     var speed=(message[6]*256) + message[5];
     if (message[6]>127) speed=-(0x10000-speed);
  }
  else if (message[1]==6) {       // [EL_MOVESTEP_CMD]  [STEP] [SPEED]
    
  }
//TODO: <-


  else if (message[1]==7) {       // [DRIVE_STOP_CMD] [DRIVES_MASK] 1 байт, 
                                  // бит 0 соответствует азимутальному приводу,
                                  // бит 1 соответствует угломестному приводу.
                                  // Значение какого-либо из упомянутых выше бит, 
                                  // равное 1, означает останов соответствующего 
                                  // привода, значение, равное 0, игнорируется
    if (message[2] & 1) xstop;
    if (message[2] & 3) ystop; 
  }
  else if (message[1]==8) {       // [AZ_BRAKE_CMD] [CTRL_PARAM]
                                  // установка значения 0х01 приводит к включению 
                                  // тормоза, установка значения 0х00 приводит к 
                                  // выключению тормоза
    xbrake(message[2]);
  }
  else if (message[1]==9) {       // [GETSYSPARAMS_CMD]
//////////TODO :
///
  }
  else if (message[1]==10) {      // [SETSYSPARAMS_CMD]   
                                  //[AZ_SOFTLIMIT_CW ]  3 bytes 0..1048576
                                  // [AZ_SOFTLIMIT_СCW] 3 bytes 0..1048576
                                  // [EL_SOFTLIMIT_UP]  3 bytes -524288..524288
                                  // [EL_SOFTLIMIT_DOWN]3 bytes -524288..524288  
                                  // [SOFTLIMITS_MASK]  1 bytes 
                                  // Ограничение угла поворота по азимуту:
                                  // бит 0 – CW;  бит 1 – СCW. 
                                  // Ограничение угла поворота по углу места:
                                  // бит 2 – UP;  бит 3 – DOWN.
                                  // Значения: 1-ВКЛ  0-ВЫКЛ  
                                  // [AZ_OFFSET]      3 bytes -1048576..1048576   
                                  // [EL_OFFSET]      3 bytes -1048576..1048576
    SOFTLIMITS_MASK   = message[14];
    var cw =(SOFTLIMITS_MASK  & 0b00000001);    // bit 0
    var ccw=(SOFTLIMITS_MASK  & 0b00000010)>>1; // bit 1
    var up =(SOFTLIMITS_MASK  & 0b00000100)>>2; // bit 2
    var down=(SOFTLIMITS_MASK & 0b00001000)>>3; // bit 3  
    consolelog('* bit-mask: cw:'+ cw +' ccw:'+ ccw +' up:' + up +' down:'+down);
        
    if (cw) {                              
      AZ_SOFTLIMIT_CW   = message[4]*256*256+message[3]*256+message[2];
//      if (message[8]>127) AZ_SOFTLIMIT_CW=-(0x1000000-AZ_SOFTLIMIT_CW);
    } else AZ_SOFTLIMIT_CW=0;
    consolelog('* set new AZ_SOFTLIMIT_CW='+AZ_SOFTLIMIT_CW);
    
    if (ccw) {
      AZ_SOFTLIMIT_CCW  = message[7]*256*256+message[6]*256+message[5];
//      if (message[5]>127) AZ_SOFTLIMIT_CCW=-(0x1000000-AZ_SOFTLIMIT_CCW);
    } else AZ_SOFTLIMIT_CCW=0;
    consolelog('* set new AZ_SOFTLIMIT_CCW='+AZ_SOFTLIMIT_CCW);
    
    if (up) {
      EL_SOFTLIMIT_UP   = message[10]*256*256+message[9]*256+message[8];
      if (message[10]>127) EL_SOFTLIMIT_UP=-(0x1000000-EL_SOFTLIMIT_UP);
    } else EL_SOFTLIMIT_UP=0;
    consolelog('* set new EL_SOFTLIMIT_UP='+EL_SOFTLIMIT_UP);

    if (down){ 
      EL_SOFTLIMIT_DOWN = message[13]*256*256+message[12]*256+message[11];  
      if (message[13]>127) EL_SOFTLIMIT_DOWN=-(0x1000000-EL_SOFTLIMIT_DOWN);
    } else EL_SOFTLIMIT_DOWN=0;
    consolelog('* set new EL_SOFTLIMIT_DOWN='+EL_SOFTLIMIT_DOWN);

    AZ_OFFSET = message[17]*256*256+message[16]*256+message[15];
    if (message[17]>127) AZ_OFFSET=-(0x1000000-AZ_OFFSET);
    consolelog('* set new AZ_OFFSET='+AZ_OFFSET);
    
    EL_OFFSET = message[20]*256*256+message[19]*256+message[18];        
    if (message[20]>127) EL_OFFSET=-(0x1000000-EL_OFFSET);
    consolelog('* set new EL_OFFSET='+EL_OFFSET);

  }
};
///////////////////////server function
server.on('listening', function () {
  lastcmd=0;
  var address = server.address();
  consolelog('* Start UDP Server listening on ' + 
  address.address + ":" + 
  address.port);
});
server.on('message', function (message, remote) {
  var packetResponse=new Buffer.from('');
  var msglog='';
  consolelog('< rcv from ' + remote.address + ':' + remote.port + 
  ' - [' + hexdump(message) + ']');

// validation code:
// good data           1
// bad args            0
// non-formated       -1
// unknown command    -2
// bad packet size    -3
  var command=message[1];
  var validstatus=validation(command,message);
  if (validstatus==0) {     //bad argument
      msgResponse="\x7e" + String.fromCharCode(command ) + 
      "\x01\x7f";//String.fromCharCode(command)
      msglog=("! Error packet args ["+ hexdump(message) +"]");
  }

  if (validstatus==-1) {      //bad incoming packet
    msgResponse="\x7e\x0b\x01\x7f";        
    msglog=("! error packet format" );  
  }
  if (validstatus==-2) {      //bad incoming packet
    msgResponse="\x7e\x0b\x01\x7f";        
    msglog=("! unknown command: [" + command.toString(16) + "]");  
  }
  if (validstatus==-3) {      //bad incoming packet
    msgResponse="\x7e\x0b\x01\x7f";        
    msglog=("! error packet size:" + message.length +" for this command:[" + command.toString(16) + "]");  
  }

  if (validstatus==1) {      //packet & argument Ok!
    msglog=('* CMD Ok [' + command + ']');
    msgResponse=goodanswer(command);
    startcommand(message);
  }
  consolelog(msglog +' from ' + remote.address + ':' + remote.port);
  packetResponse=new Buffer.from(msgResponse);  
  
///////// response function
  server.send(packetResponse, 0, packetResponse.length, remote.port, 
  remote.address, function(err, bytes) {
    if (err) throw err;
    consolelog('> snt UDP server message response to ' + remote.address + ':' + 
      remote.port +' [' + hexdump(packetResponse) + ']');
    consolelog('____________');
  });  
});
server.bind(PORT, HOST);
consolelog('-----------------------------');

//for (var i=shtok_min;i<shtok_max;i++) consolelog(' '+i+' alp=' +(alpha(i)*180/Math.PI)+' zeta='+(zeta(i)*180/Math.PI));
//console.log(shtoksize(0) + ' ' + shtoksize(Math.PI/2));
//consolelog('rad 0   ='+rad2div(0)+'  0       ='+ div2rad(0));
//consolelog('rad Pi/2='+rad2div(Math.PI/2)+' 524288='+div2rad(524288));
//consolelog('rad Pi  ='+rad2div(Math.PI)+'  1048576='+div2rad(524288+524288));
