const { Pool } = require("pg");
const nodemailer = require("nodemailer"); 
const path = require("path");
const { heatshrinkpdf } = require("./pdf");

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

  async function enquiriesDb() {
    try {
      // Query to fetch data from the required tables
      const query = `
        SELECT 
          cd.id AS cart_id,
          cd.status AS cart_status,
          ud.name AS user_name,
          ud.email AS user_email,
          ud.phone AS user_phone,
          od.id AS order_id,
          od.sku,
          od.cat_no,
          od.quantity,
          dp.price AS product_price
        FROM cart_details cd
        INNER JOIN user_details ud ON cd.user_id = ud.id
        INNER JOIN order_details od ON od.cart_id = cd.id
        LEFT JOIN dowells_pricelist dp ON od.cat_no = dp.cat_no;
      `;
      const data = await executeQuery(query);
      return data;
  
    } catch (error) {
      console.error("Error in enquiriesDb:", error);
      throw new Error("Error fetching enquiries data");
    }
  }
  
  async function updateStatus(status, cart_id) {
    try {
      const query = `
        UPDATE cart_details
        SET status = $1
        WHERE id = $2;
      `;
      const values = [status, cart_id];
  
      const result = await executeQuery(query, values);
  
      if (result.rowCount === 0) {
        throw new Error(`No cart found with id: ${cart_id}`);
      }
      return { message: "Status updated successfully" };
    } catch (error) {
      console.error("Error updating status:", error);
      throw new Error("Error updating status");
    }
  }

  async function finalizeQuotation(cart_id, heatshrink) {
    try {
      console.log("Heatshrink array:", heatshrink);

      const quotationDetails = {
        items: [],
      };
  
      for (const sku of heatshrink) {
        console.log(sku)
        // Query to get data from order_details table
        const orderDetailsQuery = `
          SELECT id, quantity, technology, type, voltage, core, size, cabletype, conductor 
          FROM order_details 
          WHERE cart_id = $1 AND sku = $2
        `;
        console.log("Running query:", orderDetailsQuery, [cart_id, sku]);

        const orderDetailsResult = await executeQuery(orderDetailsQuery, [cart_id, '3MHI_X_AA_1.1E_01C0006']);
        // const orderDetailsResult = await executeQuery(orderDetailsQuery, [cart_id, sku]);
        console.log(orderDetailsResult);
          // Check if the required fields are missing (in this case, for example, `quantity`)
        
        // Ensure that orderDetailsResult.rows exists and has data
        const orderDetails = orderDetailsResult[0];
        if (!orderDetails || !orderDetails.quantity) {
          console.error(`Missing required fields for cart_id: ${cart_id} and sku: ${sku}`);
         continue;
       }

        // Query to get the price from the quotation table using id and cart_id
        const quotationQuery = `
          SELECT price 
          FROM quotation 
          WHERE id = $1 AND cart_id = $2
        `;
  
        const quotationResult = await executeQuery(quotationQuery, [orderDetails.id, cart_id]);
       /*
        if (!quotationResult.rows || quotationResult.rows.length === 0) {
          console.error(`No quotation found for id: ${orderDetails.id} and cart_id: ${cart_id}`);
          continue;
        }
       */
      console.log("quotationResult", quotationResult)
        const price = quotationResult[0].price;
       console.log("price", price)
        // Construct the item object for quotationDetails
        const item = {
          brand: "3M", // Constant value
          quantity: orderDetails.quantity ?? 0, // Default to 0 if null or undefined
          technology: orderDetails.technology ?? "N/A", // Default to "N/A" if null or undefined
          type: orderDetails.type ?? "N/A", // Default to "N/A" if null or undefined
          voltage: orderDetails.voltage ?? "N/A", // Default to "N/A" if null or undefined
          core: orderDetails.core ?? "N/A", // Default to "N/A" if null or undefined
          size: orderDetails.size ?? "N/A", // Default to "N/A" if null or undefined
          cableType: orderDetails.cabletype ?? "N/A", // Default to "N/A" if null or undefined
          conductor: orderDetails.conductor ?? "N/A", // Default to "N/A" if null or undefined
          hsn: "85469090", // Constant value
          rate: price ?? 0, // Default to 0 if null or undefined
          delivery: "testing", // Constant value
          remark: "nikhil is genius", // Constant value
        };
        
  
        // Add the item to the items array
        quotationDetails.items.push(item);
        console.log("pushed item")
      }
      console.log("pdf gen")
      const response = await heatshrinkpdf(quotationDetails);
  
      // Log the constructed quotationDetails object
      console.log(quotationDetails);
  
      return response; // If needed to return the result
    } catch (error) {
      console.error("Error in finalizeQuotation:", error);
      throw error; // Rethrow the error to handle it upstream if needed
    }
  }
  
  async function fetchAndCategorizeData(cartId) {
    try {
      // Step 1: Fetch SKUs and CAT_NO from the database based on cart_id
      const query = `
        SELECT sku, cat_no 
        FROM order_details 
        WHERE cart_id = $1;
      `;
      const values = [cartId];
  
      const result = await executeQuery(query, values);
      console.log("Fetched SKUs and CAT_NO: ", result);
      if (result.length === 0) {
        console.log(`No data found for cart_id: ${cartId}`);
        return { heatshrink: [], m3: [], dowells: [] };
      }
  
      // Step 2: Initialize arrays for categorization
      const heatshrink = [];
      const m3 = [];
      const dowells = [];
  
      // Step 3: Categorize SKUs and CAT_NO
      result.forEach(({ sku, cat_no }) => {
        console.log(`Processing SKU: ${sku}, CAT_NO: ${cat_no}`);
        if (sku.startsWith("3MHS") || sku.startsWith("3MHI") || sku.startsWith("3MHO")) {
          heatshrink.push(sku);
        } else {
          m3.push(sku);
        }
        if (cat_no) {
          dowells.push(cat_no);
        }
      });
      
  
      // Step 4: Return the categorized data
      return { heatshrink, m3, dowells };
    } catch (error) {
      console.error("Error fetching and categorizing data:", error);
      throw error;
    }
  }
  
  async function quotation(price, discount,order_id, cart_id) {
    try {

      const query = `
        INSERT INTO quotation (price, discount, cart_id, order_id)
        VALUES ($1, $2, $3, $4)
        RETURNING *;
      `;
      const result = await executeQuery(query, [price, discount, cart_id, order_id]);
      
    } catch (error) {
      console.error("Error inserting quotation:", error);
      throw new Error("Error inserting quotation");
    }
  }

  async function discard(sku, quantity, order_id, cart_id) {
    try {
      const fetchQuery = `
        SELECT sku, quantity
        FROM order_details
        WHERE id = $1;
      `;
      const orderDetails = await executeQuery(fetchQuery, [order_id]);
  
      if (orderDetails.length === 0) {
        throw new Error("Order not found");
      }
  
      const { sku: fetchedSku, quantity: fetchedQuantity } = orderDetails[0];
  
      const insertDiscardQuery = `
        INSERT INTO discarded_items (sku, quantity, cart_id, order_id)
        VALUES ($1, $2, $3, $4);
      `;
      await executeQuery(insertDiscardQuery, [fetchedSku, fetchedQuantity, cart_id, order_id]);
  
      // Step 3: Update SKU and quantity in order_details where id = order_id
      const updateOrderQuery = `
        UPDATE order_details
        SET sku = $1, quantity = $2
        WHERE id = $3;
      `;
      await executeQuery(updateOrderQuery, [sku, quantity, order_id]);
  
      // Step 4: Save price, discount, and cart_id to quotation table
      /*const insertQuotationQuery = `
        INSERT INTO quotation (price, discount, cart_id)
        VALUES ($1, $2, $3);
      `;
      await executeQuery(insertQuotationQuery, [price, discount, cart_id]);
  */
      return { message: "Operation completed successfully" };
    } catch (error) {
      console.error("Error in discard function:", error);
      throw new Error("Failed to complete discard operation");
    }
  }
    
  module.exports = {enquiriesDb, updateStatus, quotation, discard, fetchAndCategorizeData, finalizeQuotation}