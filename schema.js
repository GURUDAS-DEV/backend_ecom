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
 SELECT id, quantity, technology, type, voltage, core, size, cabletype, conductor 
          FROM order_details 
          WHERE cart_id = 21 AND sku = '3MHI_X_AA_1.1E_01C0006'
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