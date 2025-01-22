const { Pool } = require("pg");
const nodemailer = require("nodemailer"); 
const path = require("path");
const { heatshrinkpdf, Rest3M, dowellspdf } = require("./pdf");

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

  const enquiriesDb = async (page, limit, datesort, statussort) => {
    try {
      // Calculate the offset for pagination
      const offset = (page - 1) * limit;

      // Construct the base query
      let query = `
          SELECT 
              cd.id AS cart_id,
              cd.status AS cart_status,
              cd.last_update AS cart_last_update,
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
          LEFT JOIN dowells_pricelist dp ON od.cat_no = dp.cat_no
          WHERE cd.status != 'fulfilled'`;

      // Apply sorting based on datesort or statussort
      if (datesort === 'true') {
          query += ` ORDER BY cd.last_update DESC`; // Sort by last_update descending (newest first)
      } else if (statussort === 'true') {
          query += ` ORDER BY 
              CASE 
                  WHEN cd.status = 'Opened' THEN 1  -- 'opened' should come first
                  WHEN cd.status = 'New' THEN 2    -- 'new' comes after 'opened'
                  ELSE 3                           -- Any other status comes last
              END`; 
      } else {
        query += ` ORDER BY 
              CASE 
                  WHEN cd.status = 'New' THEN 1  -- 'opened' should come first
                  WHEN cd.status = 'Opened' THEN 2    -- 'new' comes after 'opened'
                  ELSE 3                           -- Any other status comes last
              END`; 
      }
      

      // Apply pagination (LIMIT and OFFSET)
      query += ` LIMIT ${limit} OFFSET ${offset};`;

      const rawData = await executeQuery(query);

      // Transform data into the desired format
      const groupedData = rawData.reduce((acc, row) => {
          const {
              cart_id,
              cart_status,
              user_name,
              user_email,
              user_phone,
              order_id,
              sku,
              cat_no,
              quantity,
              product_price,
          } = row;

          // Find if the cart already exists
          let cart = acc.find((c) => c.cart_id === cart_id);

          if (!cart) {
              // If not, create a new cart entry
              cart = {
                  cart_id,
                  cart_status,
                  user_name,
                  user_email,
                  user_phone,
                  orders: [],
              };
              acc.push(cart);
          }

          cart.orders.push({
              order_id,
              sku,
              cat_no,
              quantity,
              product_price,
          });

          return acc;
      }, []);

      return groupedData;
  } catch (error) {
      console.error("Error in enquiriesDb:", error);
      throw new Error("Error fetching enquiries data");
  }
};

  
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

  async function finalizeQuotation(cart_id, heatshrink, dowells, m3, payment, validity) {
    console.log("heatshrink", heatshrink,"dowells",dowells, "m3", m3)
    try {
      // Handle Heatshrink
      const heatshrinkDetails = await processHeatshrink(cart_id, heatshrink, payment, validity);
  
      // Handle Dowells
      const dowellsDetails = await processDowells(cart_id, dowells, payment);
  
      // Handle M3
      const m3Details = await processM3(cart_id, m3, payment, validity);
  
      return {
        heatshrinkDetails,
        dowellsDetails,
        m3Details,
      };
    } catch (error) {
      console.error("Error in finalizeQuotation:", error);
      throw error;
    }
  }
  
  async function processHeatshrink(cart_id, heatshrink, payment, validity) {
    const quotationDetails = {
      items: [],
      validity,
    };
    for (const sku of heatshrink) {
      const item = await fetchhsItemDetails(cart_id, sku);
      if (item) {
        quotationDetails.items.push(item);
      }
    }
    const response = await heatshrinkpdf(quotationDetails, payment,validity, cart_id);
    return response;
  }
  
  async function processDowells( cart_id,dowells, payment) {
    console.log("dowells", dowells)
    const quotationDetails = {
      items: [],
    };
    for (const cat_no of dowells) {
      const item = await fetchdowellsItemDetails(cart_id, cat_no);
      if (item) {
        quotationDetails.items.push(item);
      }
    }
    const response = await dowellspdf(quotationDetails, payment, cart_id);
    return response;
  }
  
  async function processM3(cart_id, m3, payment, validity) {
    const quotationDetails = {
      items: [],
      validity,
    };
    for (const sku of m3) {
      const item = await fetchrest3mItemDetails(cart_id, sku);
      if (item) {
        quotationDetails.items.push(item);
      }
    }
    const response = await Rest3M(quotationDetails, payment, validity, cart_id);
    return response;
  }
  
  async function fetchhsItemDetails(cart_id, sku) {
    try {
      const orderDetailsQuery = `
        SELECT id, quantity, technology, type, voltage, core, size, cabletype, conductor 
        FROM order_details 
        WHERE cart_id = $1 AND sku = $2
      `;
      const orderDetailsResult = await executeQuery(orderDetailsQuery, [cart_id, sku]);
      const orderDetails = orderDetailsResult[0];
  
      if (!orderDetails || !orderDetails.quantity) {
        console.error(`Missing required fields for cart_id: ${cart_id} and sku: ${sku}`);
        return null;
      }
  
      const quotationQuery = `
        SELECT price, delivery
        FROM quotation 
        WHERE id = $1 AND cart_id = $2
      `;
      const quotationResult = await executeQuery(quotationQuery, [orderDetails.id, cart_id]);
      const price = quotationResult[0].price;
      const delivery = quotationResult[0].delivery;
  
      return {
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
        delivery: delivery ?? 0,
      };
    } catch (error) {
      console.error(`Error fetching details for cart_id: ${cart_id} and sku: ${sku}`, error);
      return null;
    }
  }
  
  async function fetchdowellsItemDetails(cart_id,cat_no) {
    try {
      const dowellsDetailsQuery = `
        SELECT description, cable_od_mm, hsn_code
        FROM dowells_pricelist 
        WHERE cat_no = $1 
      `;
      const dowellsDetailsResult = await executeQuery(dowellsDetailsQuery, [cat_no]);
      const dowellsDetails = dowellsDetailsResult[0];
  
      if (!dowellsDetails) {
        console.error(`Missing required fields for cat_no: ${cat_no} `);
        return null;
      }
      
      const orderDetailsQuery = `
        SELECT id, quantity
        FROM order_details 
        WHERE cart_id = $1 AND cat_no = $2
      `;
      const orderDetailsResult = await executeQuery(orderDetailsQuery, [cart_id, cat_no]);
      const orderDetails = orderDetailsResult[0];
  
      if (!orderDetails || !orderDetails.quantity) {
        console.error(`Missing required fields for cart_id: ${cart_id} and sku: ${sku}`);
        return null;
      }

      const quotationQuery = `
        SELECT price,discount, delivery
        FROM quotation 
        WHERE id = $1 AND cart_id = $2
      `;
      const quotationResult = await executeQuery(quotationQuery, [orderDetails.id, cart_id]);
      const price = quotationResult[0].price;
      const delivery = quotationResult[0].delivery;
      const discount = quotationResult[0].discount;
  
      return {
        brand: "dowells",
        description: dowellsDetails.description,
        cableOd: dowellsDetails.cable_od_mm,
        hsn: dowellsDetails.hsn,
        quantity: orderDetails.quantity ?? 0,
        description: orderDetails.name ?? 0,
        hsn: "85469090",
        rate: price ?? 0,
        discount: discount,
        delivery: delivery ?? 0,
      };
    } catch (error) {
      console.error(`Error fetching details for cart_id: ${cart_id} and sku: ${sku}`, error);
      return null;
    }
  }
  
  async function fetchrest3mItemDetails(cart_id, sku) {
    try {
      const orderDetailsQuery = `
        SELECT id, quantity, name
        FROM order_details 
        WHERE cart_id = $1 AND sku = $2
      `;
      const orderDetailsResult = await executeQuery(orderDetailsQuery, [cart_id, sku]);
      const orderDetails = orderDetailsResult[0];
  
      if (!orderDetails || !orderDetails.quantity) {
        console.error(`Missing required fields for cart_id: ${cart_id} and sku: ${sku}`);
        return null;
      }
  
      const quotationQuery = `
        SELECT price, delivery
        FROM quotation 
        WHERE id = $1 AND cart_id = $2
      `;
      const quotationResult = await executeQuery(quotationQuery, [orderDetails.id, cart_id]);
      const price = quotationResult[0].price;
      const delivery = quotationResult[0].delivery;
  
      return {
        brand: "3M",
        quantity: orderDetails.quantity ?? 0,
        description: orderDetails.name ?? 0,
        hsn: "85469090",
        rate: price ?? 0,
        delivery: delivery ?? 0,
      };
    } catch (error) {
      console.error(`Error fetching details for cart_id: ${cart_id} and sku: ${sku}`, error);
      return null;
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
        // Check if `sku` is valid before calling startsWith
        if (sku) {
            if (sku.startsWith("3MHS") || sku.startsWith("3MHI") || sku.startsWith("3MHO")) {
                heatshrink.push(sku);
            } else {
                m3.push(sku);
            }
        }
    
        // Check if `cat_no` is valid before adding it to `dowells`
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
  
  async function quotation(price, discount,order_id, cart_id, delivery) {
    try {

      const query = `
        INSERT INTO quotation (price, discount, cart_id, order_id, delivery)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *;
      `;
       await executeQuery(query, [price, discount, cart_id, order_id, delivery]);
      
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