// Harness pengujian saja: app.js asli tetap dijalankan tanpa perubahan.
// PORT=0 berasal dari proses induk; tangkap port aktual melalui IPC.
const http = require('node:http');
const originalListen = http.Server.prototype.listen;
http.Server.prototype.listen = function (...args) {
  this.once('listening', () => process.send({ port: this.address().port }));
  return originalListen.apply(this, args);
};
require('../app.js');
