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
      CREATE TABLE order_details (
    id SERIAL PRIMARY KEY,
    sku VARCHAR(50) NOT NULL,
    quantity INT NOT NULL,
    order_id INT NOT NULL
);

CREATE TABLE user_details (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(20)
);

CREATE TABLE cart_details (
    id SERIAL PRIMARY KEY,
    sku VARCHAR(50) NOT NULL,
    quantity INT NOT NULL,
    user_id INT,
    FOREIGN KEY (user_id) REFERENCES user_details(id) ON DELETE CASCADE
);

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
