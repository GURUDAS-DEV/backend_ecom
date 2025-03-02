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
     CREATE TABLE message (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    subject VARCHAR(255),
    body TEXT
);

CREATE TABLE sub (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE
);

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
