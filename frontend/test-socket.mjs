import { io } from 'socket.io-client';

console.log('Connecting to socket server...');
const socket = io('http://localhost:5000');

socket.on('connect', () => {
  console.log('Successfully connected to socket server! ID:', socket.id);
  
  socket.emit('join_order_track', { orderId: 'test_order_123' });
  console.log('Emitted join_order_track');
  
  socket.emit('update_location', {
    orderId: 'test_order_123',
    lat: 13.0812,
    lng: 80.2681,
    distanceRemaining: 0.5,
    eta: 5
  });
  console.log('Emitted update_location');
  
  setTimeout(() => {
    socket.disconnect();
    console.log('Disconnected.');
    process.exit(0);
  }, 1000);
});

socket.on('connect_error', (err) => {
  console.error('Socket connection error:', err);
  process.exit(1);
});
