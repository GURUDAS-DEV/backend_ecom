const { Pool } = require("pg");
const nodemailer = require("nodemailer"); 
const path = require("path");

require("dotenv").config({ path: path.join(__dirname, "../.env") });
const pool = new Pool({
    connectionString: process.env.DB_CONNECTION_STRING  
});

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 465,
  secure: true,
  auth: {
    user: process.env.SMTP_MAIL,
    pass: process.env.SMTP_PASSWORD,
  },
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

async function storeDataInDb(orderDetails, orderId) {
  // Dynamically get the column names and values from orderDetails
  const columns = Object.keys(orderDetails);
  const values = Object.values(orderDetails);

  // Add order_id to the columns and values
  columns.push('order_id');
  values.push(orderId);

  // Generate a placeholder string for values (e.g., $1, $2, $3, ...)
  const placeholders = columns.map((_, index) => `$${index + 1}`).join(", ");

  // Create the dynamic SQL query
  const query = `
    INSERT INTO order_details (${columns.join(", ")})
    VALUES (${placeholders})
    RETURNING *;
  `;

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
  if (!email) {
    throw new Error("Email is required to find user");
  }

  const query = "SELECT id FROM user_details WHERE LOWER(email) = LOWER($1)";
  const result = await executeQuery(query, [email.trim()]);
  if (!result ) {
    return null; // Return null if user is not found
  }
  return result[0].id; // Return userId if found
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

async function processOrderData(orderIds, email, status) {
  try {

    const userQuery = "SELECT id FROM user_details WHERE email = $1";
    const userResult = await executeQuery(userQuery, [email]);

    const userId = userResult[0].id;
    if (!userId) {
      throw new Error("User not found for the given email");
    }

    const insertCartQuery = `
      INSERT INTO cart_details (user_id, status)
      VALUES ($1, $2)
      RETURNING id`;
    const cartResult = await executeQuery(insertCartQuery, [userId, status]);
    console.log(cartResult)
    if (!cartResult) {
      throw new Error("Failed to insert into cart_details");
    }

    const cartId = cartResult[0].id;

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
  
  if (result && result.length > 0) {
    return result[0]; 
  } else {
    throw new Error("No rows deleted, item may not exist");
  }
}

async function enquireMail(email, cart_id, subject) {
  try {
    const query = `
      SELECT sku, name, quantity 
      FROM order_details 
      WHERE cart_id = $1
    `;
    const values = [cart_id];
    const result = await db.query(query, values); 
    let message = `Order Details for Cart ID: ${cart_id}\n\n`;
    result.rows.forEach((row, index) => {
      message += `${index + 1}. SKU: ${row.sku}, Name: ${row.name}, Quantity: ${row.quantity}\n`;
    });

    const mailOptions = {
      from: process.env.SMTP_MAIL,
      to: email,
      subject: subject,
      text: message,
    };

    await transporter.sendMail(mailOptions);
    return true;
  } catch (error) {
    console.error("Error sending email:", error);
    throw new Error("Error sending email notification");
  }
}

module.exports = { getALLCartDetails, storeDataInDb, userDb,findUserByEmail, processOrderData, getCartDetails, updateCart, deleteCartItem, enquireMail };