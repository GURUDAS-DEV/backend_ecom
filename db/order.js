const { Pool } = require("pg"); 
const path = require("path");
//const  parseSKUToString  = require("./sku");

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

async function storeDataInDb(sku, quantity, name, orderId) {
    const query = `
    INSERT INTO order_details (sku, quantity, order_id, name)
    VALUES ($1, $2, $3, $4)
    RETURNING *;
  `;
  const values = [sku, quantity, orderId, name];

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
    // Convert orderIds array to JSON string
    const orderIdsJson = JSON.stringify(orderIds);

    // Insert into cart_details and get the generated cart_id
    const insertCartQuery = `
      INSERT INTO cart_details (user_id, order_ids)
      VALUES ($1, $2)
      RETURNING id`;
    const cartResult = await executeQuery(insertCartQuery, [userId, orderIdsJson]);

    if (cartResult.length === 0) {
      throw new Error("Failed to insert into cart_details");
    }

    const cartId = cartResult[0].id;

    // Update order_details with the generated cart_id
    for (const orderId of orderIds) {
      const orderQuery = 'SELECT sku, quantity FROM order_details WHERE order_id = $1';
      const orderResults = await executeQuery(orderQuery, [orderId]);

      if (orderResults.length > 0) {
        const updateOrderQuery = `
          UPDATE order_details
          SET cart_id = $1
          WHERE order_id = $2`;
        await executeQuery(updateOrderQuery, [cartId, orderId]);
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
  const query = 'SELECT * FROM order_details WHERE order_id = $1';
  return await executeQuery(query, [orderId]);
}

async function getALLCartDetails(cartId) {
  const query = 'SELECT * FROM order_details WHERE cart_id = $1';
  return await executeQuery(query, [cartId]);
}


async function updateCart(quantity, order_id) {
  const query = 'UPDATE order_details SET quantity = $1 WHERE order_id = $2 RETURNING *';
  const result = await executeQuery(query, [ quantity, order_id]);
  if (result && result.length > 0) {
    return result[0]; 
  } else {
    throw new Error("No rows returned from update query"); 
  }
}

async function deleteCartItem(order_id) {
  const query = 'DELETE FROM order_details WHERE order_id = $1 RETURNING *';
  const result = await executeQuery(query, [order_id]);
  
  console.log("delete cart item result:", result);
  
  if (result && result.length > 0) {
    return result[0]; 
  } else {
    throw new Error("No rows deleted, item may not exist");
  }
}



module.exports = { getALLCartDetails, storeDataInDb, userDb,findUserByEmail, processOrderData, getCartDetails, updateCart, deleteCartItem };