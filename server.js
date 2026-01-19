require('dotenv').config({ path: './config.env' });
const app = require('./app.js');

const PORT = process.env.PORT;
const HOSTNAME = 'localhost';

app.listen(PORT, HOSTNAME, () => {
  console.log(`Server listening on http://${HOSTNAME}:${PORT}`);
});
