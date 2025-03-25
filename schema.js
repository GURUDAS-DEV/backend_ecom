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
    // Execute the SQL query
    return client.query(`
     SELECT * FROM quotation WHERE cart_id = 40
    `);
  })
  .then((result) => {
    // Log the query result
    console.log('Query Result:', result.rows);
    // Close the connection
    return client.end();
  })
  .catch((err) => {
    console.error('Error executing query:', err);
    // Close the connection in case of an error
    client.end();
  });
