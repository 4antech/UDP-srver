//UDP Client
//Generator RANDOMcommand with RANDOM args.
var debug=1;
var ver='190930-01'
var PORT = 9090;
var HOST='pumps.lora-wan.net';
var dgram = require('dgram');
var maxtime=300;
var g_cnt=maxtime;
var delta=0;
var reqinsec=0;
function intrnd(maximum){return Math.floor(Math.random() * maximum);}
var starttime=new Date();
var ts=new Date();
function consolelog(msg){
  if (debug) {
    ts=new Date();
    console.log(ts.getTime()+' ' + msg);
  }
}
var cmdsize=[3,8,8,5,5,8,8,4,4,3,22];
var cmdargs=[0,2,2,1,1,2,2,1,1,0,7];  
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
            ]                 // [AZ_SOFTLIMIT_СCW] 
                              // [EL_SOFTLIMIT_UP] 
                              // [EL_SOFTLIMIT_DOWN] 
                              // [SOFTLIMITS_MASK] 
                              // [AZ_OFFSET] 
                              // [EL_OFFSET] 
function hexdump(msg){  
  var tmpstr='.';
  for (var i=0;i<msg.length;i++) {
    if (msg[i]<16 ) tmpstr+='0'+(msg[i].toString(16)) + '.';
    else tmpstr+=(msg[i].toString(16)) + '.';
  }
  return tmpstr;
}
consolelog('* Client start.');
function dumb(cnt){
//  consolelog(maxtime+1-cnt);
  g_cnt=cnt;
  if (cnt==0) return 0;
  var rndcmd=intrnd(11);
  var rndmsg= new Buffer (cmdsize[rndcmd]);
  for (var i=0; i<cmdsize[rndcmd];i++)rndmsg[i]=intrnd(256);
  rndmsg[0]=0x7e;
  rndmsg[1]=rndcmd;
  rndmsg[cmdsize[rndcmd]-1]=0x7f;   
  var argtmp = new Buffer(cmdsize[rndcmd]-3);
  message=rndmsg;
  var client = dgram.createSocket('udp4');
  client.send(message, 0, message.length, PORT, HOST, function(err, bytes) {
    if (err) throw err;
    if (cmdsize[rndcmd]>3) {
      for (var i=0; i<cmdsize[rndcmd]-3;i++) argtmp[i]=rndmsg[i+2]; 
      consolelog('command='+rndcmd+' args=['+hexdump(argtmp)+']');
    }
    else consolelog('# Start command N'+ message[1]+" without args" );
    consolelog('> SND UDP client message [' +hexdump(message)+ '] sent to ' + 
      HOST +':'+ PORT);
  });
  client.on('message', function (message, remote) {
    consolelog('< RCV '+remote.address + ':' + remote.port +
      ' - [' + hexdump(message)+']');
    client.close();
    ts = new Date();
    delta=(ts.getTime()-starttime.getTime());
    console.log('___ End of SND/RCV N'+ (maxtime-cnt+1) + ' '+
    delta+'ms. speed('+Math.floor((maxtime-cnt)*1000/(delta))+'Req/Sec) 1Req=' + 
    (Math.floor((1000*delta/(maxtime-cnt))))+'MICROSec (' +
    (Math.floor(1000*delta/(maxtime-cnt)))/1000 +'MILISec)' );
    dumb(cnt-1);
  });
}
/////////////////////

dumb(maxtime);




