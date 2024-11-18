const { Client } = require('pg');
require('dotenv').config();

// Configure the PostgreSQL client with connection string
const client = new Client({
  connectionString: process.env.DB_CONNECTION_STRING  
});

// Connect to the PostgreSQL database
client.connect()
  .then(() => {
    console.log('Connected to the database');
    // Execute the SQL statement to modify the column
    return client.query(`
    ALTER TABLE cart_details
DROP COLUMN order_ids;

     `);
  })
  .then(() => {
    console.log('Column modified successfully');
    // Close the connection
    return client.end();
  })
  .catch((err) => {
    console.error('Error modifying column:', err);
    // Close the connection in case of an error
    client.end();
  });
