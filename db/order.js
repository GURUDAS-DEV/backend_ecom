const { Pool } = require("pg"); 
const path = require("path");

require("dotenv").config({ path: path.join(__dirname, "../.env") });
const pool = new Pool({
    connectionString: process.env.DB_CONNECTION_STRING  
});

async function executeQuery(query, values = []) {
  const client = await pool.connect();
  try {
    const result = await client.query(query, values);
    return result.rows;
  } finally {
    client.release();
  }
}

async function storeDataInDb(sku, quantity, orderId) {
    const query = `
    INSERT INTO order_details (sku, quantity, order_id)
    VALUES ($1, $2, $3)
    RETURNING *;
  `;
  const values = [sku, quantity, orderId];

  try {
    const result = await executeQuery(query, values);
    console.log("Data inserted successfully:", result[0]);
    return result[0]; 
  } catch (error) {
    console.error("Error inserting data:", error);
    throw error;
  }
}

async function userDb(name, email, phone) {
  const query = `
    INSERT INTO user_details (name, email, phone)
    VALUES ($1, $2, $3)
    RETURNING *;
  `;
  const values = [name, email, phone];

  try {
    const result = await executeQuery(query, values);
    console.log("User data inserted successfully:", result[0]);
    return result[0].id; // Returns the inserted user record
  } catch (error) {
    console.error("Error inserting user data:", error);
    throw error;
  }
}

// Function to process an array of order IDs for a specific user
async function processOrderData(orderIds, userId) {
  const query = `
    UPDATE order_details
    SET user_id = $1
    WHERE order_id = ANY($2::text[])
    RETURNING *;
  `;
  const values = [userId, orderIds];

  try {
    const result = await executeQuery(query, values);
    console.log("Order data processed successfully:", result);
    return result; // Returns the updated order records
  } catch (error) {
    console.error("Error processing order data:", error);
    throw error;
  }
}

module.exports = { storeDataInDb, userDb, processOrderData };