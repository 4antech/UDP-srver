# SimpleNodeUDP
Simple UDP connection on Node.js

Find a good tutorial at http://www.hacksparrow.com/node-js-udp-server-and-client-example.html

1. HOST is optional in server.bind(). If omitted, it will be listening on 0.0.0.0, which might be what you want in some cases.
2. The message event is fired, when a UDP packet arrives destined for this server.
3. The listening event is fired, when the server has initialized and all ready to receive UDP packets.
4. dgram.createSocket() can either accept 'udp4' or 'udp6'. The former uses IPv4, the later uses IPv6.
5. client.send() requires a proper Node.js Buffer object, not a plain string or number.
6. The second parameter 0, of client.send() is the offset in the buffer where the UDP packet starts.
7. The third parameter message.length, is the number of bytes we want to send from the offset in the buffer. In our case, the offset is 0, and the length is message.length (16 bytes), which is quite tiny and the whole buffer can be sent in a single UDP packet. This might always not be the case. For large buffers, you will need to iterate over the buffer and send it in smaller chunks of UDP packets.
8. Exceeding the allowed packet size will not result in any error. The packet will be silently dropped. That's just the nature of UDP.
9. The err object in the callback function of client.send() is going to be only of the DNS lookup kind.
10.Make sure the HOST / IP address is in conformance with the IP version you use, else your packets will not reach the destination.
