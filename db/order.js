const { Pool } = require("pg");
const nodemailer = require("nodemailer"); 
const fs = require("fs");
const handlebars = require("handlebars");
const axios = require("axios")
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
  console.log(result)
  if (!result || result.length == 0) {
    return null; // Return null if user is not found
  }
  return result[0].id; // Return userId if found
}

async function userDb(name, company_name, email, phone) {
  try {
    // Check if the email exists
    const checkQuery = `SELECT id FROM user_details WHERE email = $1;`;
    const checkResult = await executeQuery(checkQuery, [email]);

    if (checkResult.length > 0) {
      // Email exists, update the record
      const updateQuery = `
        UPDATE user_details 
        SET name = $1, company_name = $2, phone = $3
        WHERE email = $4
        RETURNING *;
      `;
      const updateValues = [name, company_name, phone, email];
      const updateResult = await executeQuery(updateQuery, updateValues);
      
      console.log("User data updated successfully:", updateResult[0]);
      return updateResult[0].id;
    } else {
      // Email does not exist, insert new record
      const insertQuery = `
        INSERT INTO user_details (name, company_name, email, phone)
        VALUES ($1, $2, $3, $4)
        RETURNING *;
      `;
      const insertValues = [name, company_name, email, phone];
      const insertResult = await executeQuery(insertQuery, insertValues);
      
      console.log("User data inserted successfully:", insertResult[0]);
      return insertResult[0].id;
    }
  } catch (error) {
    console.error("Error handling user data:", error);
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
    return {cartId}
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

async function getContacts() {
  const query = 'SELECT * FROM message';
  return await executeQuery(query);
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
    const query = `SELECT name, quantity, sku, cat_no FROM order_details WHERE cart_id = $1`;
    const values = [cart_id];
    const result = await executeQuery(query, values);

    // Read Handlebars template
    const templatePath = path.join(__dirname, 'templates', 'emailTemplate.hbs');
    const templateSource = fs.readFileSync(templatePath, "utf8");
    const template = handlebars.compile(templateSource);

    // Register a helper for index increment
    handlebars.registerHelper("inc", function (value) {
      return parseInt(value) + 1;
    });

    // Convert result to Handlebars-friendly format
    const items = result.map((row, index) => ({
      name: row.name,
      quantity: row.quantity,
      sku: row.sku || row.cat_no,
    }));

    // Generate HTML email
    const htmlMessage = template({ cart_id, items });

    const mailOptions = {
      from: process.env.SMTP_MAIL,
      to: email,
      subject: subject,
      html: htmlMessage, // Use 'html' instead of 'text'
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

const insertSubscription = async (email) => {
  const query = "INSERT INTO sub (email) VALUES ($1) RETURNING *";
  return await executeQuery(query, [email]);
};

// Function to insert user form data into the 'message' table
const insertUserMessage = async (name, email, phone, subject, body) => {
  const query = `
    INSERT INTO message (name, email, phone, subject, body)
    VALUES ($1, $2, $3, $4, $5) RETURNING *`;
  return await executeQuery(query, [name, email, phone, subject, body]);
};

module.exports = { getContacts, insertSubscription, insertUserMessage, quotation_mail,getALLCartDetails, storeDataInDb, userDb,findUserByEmail, processOrderData, getCartDetails, updateCart, deleteCartItem, enquireMail };