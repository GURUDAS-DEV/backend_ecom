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

  async function finalizeQuotation(cart_id, heatshrink, dowells, m3) {
    try {
      const quotationDetails = {
        items: [],
      };
      for (const sku of heatshrink) {
        const orderDetailsQuery = `
          SELECT id, quantity, technology, type, voltage, core, size, cabletype, conductor 
          FROM order_details 
          WHERE cart_id = $1 AND sku = $2
        `;
        const orderDetailsResult = await executeQuery(orderDetailsQuery, [cart_id, sku]);
        const orderDetails = orderDetailsResult[0];
        if (!orderDetails || !orderDetails.quantity) {
          console.error(`Missing required fields for cart_id: ${cart_id} and sku: ${sku}`);
         continue;
       }

        const quotationQuery = `
          SELECT price 
          FROM quotation 
          WHERE id = $1 AND cart_id = $2
        `;
  
        const quotationResult = await executeQuery(quotationQuery, [orderDetails.id, cart_id]);
        const price = quotationResult[0].price;
        const item = {
          brand: "3M", 
          quantity: orderDetails.quantity ?? 0, 
          technology: orderDetails.technology ?? "N/A", 
          type: orderDetails.type ?? "N/A", 
          voltage: orderDetails.voltage ?? "N/A", 
          core: orderDetails.core ?? "N/A", 
          size: orderDetails.size ?? "N/A",  
          cableType: orderDetails.cabletype ?? "N/A", 
          conductor: orderDetails.conductor ?? "N/A", 
          hsn: "85469090", 
          rate: price ?? 0, 
          delivery: "testing", 
          remark: "nikhil is genius", 
        };
        
        quotationDetails.items.push(item);
      }
      const response = await heatshrinkpdf(quotationDetails);
  
      return response; 
    } catch (error) {
      console.error("Error in finalizeQuotation:", error);
      throw error; 
    }
  }
  
  async function fetchAndCategorizeData(cartId) {
    try {
      const query = `
        SELECT sku, cat_no 
        FROM order_details 
        WHERE cart_id = $1;
      `;
      const values = [cartId];
  
      const result = await executeQuery(query, values);
      if (result.length === 0) {
        console.log(`No data found for cart_id: ${cartId}`);
        return { heatshrink: [], m3: [], dowells: [] };
      }
  
      const heatshrink = [];
      const m3 = [];
      const dowells = [];
  
      result.forEach(({ sku, cat_no }) => {
        if (sku.startsWith("3MHS") || sku.startsWith("3MHI") || sku.startsWith("3MHO")) {
          heatshrink.push(sku);
        } else {
          m3.push(sku);
        }
        if (cat_no) {
          dowells.push(cat_no);
        }
      });
      
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
       await executeQuery(query, [price, discount, cart_id, order_id]);
      
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
  
      const updateOrderQuery = `
        UPDATE order_details
        SET sku = $1, quantity = $2
        WHERE id = $3;
      `;
      await executeQuery(updateOrderQuery, [sku, quantity, order_id]);

      return { message: "Operation completed successfully" };
    } catch (error) {
      console.error("Error in discard function:", error);
      throw new Error("Failed to complete discard operation");
    }
  }
    
  module.exports = {enquiriesDb, updateStatus, quotation, discard, fetchAndCategorizeData, finalizeQuotation}