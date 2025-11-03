// Worker script used by concurrency tests. Expects process.env.DB_PATH to be set.
const path = require('path');

// Ensure DB path is set (test runner sets it)
if (!process.env.DB_PATH) {
  console.error('DB_PATH not set');
  process.exit(2);
}

// Import the model after DB_PATH is set so the module picks it up
const { purchaseTicket } = require(path.join(__dirname, '..', 'client-service', 'models', 'clientModel'));

async function main() {
  const id = Number(process.argv[2]);
  if (!Number.isInteger(id) || id <= 0) {
    console.error('invalid id');
    process.exit(2);
  }
  try {
    const res = await purchaseTicket(id);
    // print json result
    console.log(JSON.stringify(res));
    process.exit(0);
  } catch (err) {
    // Print error to stderr so test can detect SQLITE_BUSY or other errors
    console.error(err && err.stack ? err.stack : String(err));
    process.exit(3);
  }
}

main();
