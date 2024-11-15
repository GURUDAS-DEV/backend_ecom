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

async function findUserByEmail(email) {
  const query = "SELECT id FROM users WHERE email = $1";
  const result = await pool.query(query, [email]);

  return result.rows[0]?.id || null; // Return userId if found, else null
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

async function processOrderData(orderIds, userId) {
  try {
      
      for (const orderId of orderIds) {
          
          const orderQuery = 'SELECT sku, quantity FROM order_details WHERE order_id = $1';
          const orderResults = await executeQuery(orderQuery, [orderId]);

          if (orderResults.length > 0) {
              const { sku, quantity } = orderResults[0];

              const insertQuery = 'INSERT INTO cart_details (user_id, sku, quantity, order_id) VALUES ($1, $2, $3, $4)';
              await executeQuery(insertQuery, [userId, sku, quantity, orderId]);
          } else {
              console.warn(`Order ID ${orderId} not found in order_details`);
          }
      }

      console.log("All orders processed and added to cart_details successfully.");
  } catch (error) {
      console.error("Error in processOrderData:", error);
      throw error;
  }
}

async function getCartDetails(orderId) {
  const query = 'SELECT * FROM cart_details WHERE order_id = $1';
  return await executeQuery(query, [orderId]);
}

async function updateCart(userId, quantity, order_d) {
  const query = 'UPDATE cart_details SET quantity = $2 WHERE user_id = $1 AND order_id = $3 RETURNING *';
  const result = await executeQuery(query, [userId, quantity, order_id]);
  if (result && result.length > 0) {
    return result[0]; 
  } else {
    throw new Error("No rows returned from update query"); 
  }
}

async function deleteCartItem(order_id) {
  const query = 'DELETE FROM cart_details WHERE order_id = $1 RETURNING *';
  const result = await executeQuery(query, [order_id]);
  
  console.log("delete cart item result:", result);
  
  if (result && result.length > 0) {
    return result[0]; 
  } else {
    throw new Error("No rows deleted, item may not exist");
  }
}



module.exports = { storeDataInDb, userDb,findUserByEmail, processOrderData, getCartDetails, updateCart, deleteCartItem };