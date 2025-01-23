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
    console.log(cartId)
    return cartId
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
      SELECT name, quantity, sku, cat_no
      FROM order_details 
      WHERE cart_id = $1
    `;
    const values = [cart_id];
    const result = await executeQuery(query, values); // Assuming result is an array

    let message = `Dear Customer,\n\n`;
    message += `Thank you for your inquiry. We have received your request and here are the details associated with your cart ID: ${cart_id}.\n\n`;
    message += `Order Details:\n`;

    // Iterate directly over result if it's an array
    result.forEach((row, index) => {
      const identifier = row.sku ? `SKU: ${row.sku}` : `Cat No: ${row.cat_no}`;
      message += `${index + 1}. Name: ${row.name}, Quantity: ${row.quantity}, ${identifier}\n`;
    });

    message += `\nWe will get back to you with a quotation shortly. In the meantime, please feel free to contact us if you have any further questions or need assistance.\n\n`;
    message += `Thank you for choosing our services.\n\nBest regards,\n[Your Company Name]`;

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


async function quotation_mail(cart_id, urls, reply) {
  try {
    // Fetch the user_id from cart_details table
    const cartDetails = await executeQuery('SELECT user_id FROM cart_details WHERE id = $1', [cart_id]);
    if (!cartDetails) {
      throw new Error("Cart not found");
    }
    
    const user_id = cartDetails[0].user_id;

    // Get the user's email and name from user_profile table
    const userProfile = await executeQuery('SELECT email, name FROM user_details WHERE id = $1', [user_id]);
    if (!userProfile) {
      throw new Error("User not found");
    }

    const { email, name } = userProfile[0];
    
    // Download PDFs from URLs (Assuming you are using some utility like axios to download files)
    const attachments = await Promise.all(urls.map(async (url) => {
      const response = await axios.get(url, { responseType: 'arraybuffer' });
      return {
        filename: `quotation_${url.split('/').pop()}`,  // Adjust naming as needed
        content: response.data
      };
    }));

    // Prepare the email content
    const subject = "Here is your quotation";
    const message = `Dear ${name},

Here is the quotation for your enquiry with cart ID: ${cart_id}.

    ${reply}

Feel free to contact us for any questions or further assistance.

Best regards,
Your Company Name`;

    // Email options
    const mailOptions = {
      from: process.env.SMTP_MAIL,
      to: email,
      subject: subject,
      text: message,
      attachments: attachments  // Add the PDF attachments here
    };

    // Send email using the transporter
    await transporter.sendMail(mailOptions);

    return true;
  } catch (error) {
    console.error("Error sending quotation email:", error);
    return false;
  }
}
module.exports = { quotation_mail,getALLCartDetails, storeDataInDb, userDb,findUserByEmail, processOrderData, getCartDetails, updateCart, deleteCartItem, enquireMail };