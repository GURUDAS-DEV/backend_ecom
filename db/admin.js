const { Pool } = require("pg");
const nodemailer = require("nodemailer"); 
const path = require("path");
const { heatshrinkpdf, Rest3M, dowellspdf } = require("./pdf");

require("dotenv").config();  // works locally, ignored on Railway

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
        const pageNumber = parseInt(page, 10) || 1;
        const limitNumber = parseInt(limit, 10) || 10;
        const offset = (pageNumber - 1) * limitNumber;

        console.info(`[INFO] Fetching enquiries | Page: ${pageNumber}, Limit: ${limitNumber}, DateSort: ${datesort}, StatusSort: ${statussort}`);

        let query = `
            SELECT 
                cd.id AS cart_id,
                cd.status AS cart_status,
                cd.last_update AS cart_last_update,
                cd.hs,
                cd.dow,
                cd.m3,
                ud.name AS user_name,
                ud.email AS user_email,
                ud.phone AS user_phone,
                od.order_id,
                od.sku,
                od.cat_no,
                od.quantity,
                dp.price AS product_price
            FROM cart_details cd
            INNER JOIN user_details ud ON cd.user_id = ud.id
            INNER JOIN order_details od ON od.cart_id = cd.id
            LEFT JOIN dowells_pricelist dp ON od.cat_no = dp.cat_no
            WHERE cd.status NOT IN ('fulfilled', 'cancelled')
        `;

        // Sorting logic
        if (datesort === 'true') {
            query += ` ORDER BY cd.last_update DESC`;
        } else if (statussort === 'true') {
            query += ` ORDER BY 
                CASE 
                    WHEN cd.status = 'Opened' THEN 1
                    WHEN cd.status = 'New' THEN 2
                    ELSE 3
                END`;
        } else {
            query += ` ORDER BY 
                CASE 
                    WHEN cd.status = 'New' THEN 1
                    WHEN cd.status = 'Opened' THEN 2
                    ELSE 3
                END`;
        }

        query += ` LIMIT $1 OFFSET $2;`;

        console.info("[INFO] Final SQL Query:\n", query);

        const rawData = await executeQuery(query, [limitNumber, offset]);

        if (!rawData || rawData.length === 0) {
            console.warn("[WARN] No enquiries found with the given parameters.");
        }

        const groupedData = rawData.reduce((acc, row) => {
            const {
                cart_id,
                cart_status,
                cart_last_update,
                hs,
                dow,
                m3,
                user_name,
                user_email,
                user_phone,
                order_id,
                sku,
                cat_no,
                quantity,
                product_price,
            } = row;

            let cart = acc.find((c) => c.cart_id === cart_id);

            if (!cart) {
                cart = {
                    cart_id,
                    cart_status,
                    cart_last_update,
                    hs,
                    dow,
                    m3,
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
        console.error("[ERROR] Failed to fetch enquiries:", error.message, "\nStack:", error.stack);
        throw new Error("Failed to fetch enquiries data from database");
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

  async function finalizeQuotation(cart_id, heatshrink, dowells, m3, payment, validity, Delivery_charge) {
  console.log("heatshrink", heatshrink, "dowells", dowells, "m3", m3);
  try {
    const results = {};
    let deliveryChargeUsed = false; // Track if delivery charge has been applied

    // Handle Heatshrink if not empty
    if (heatshrink && heatshrink.length > 0) {
      const charge = !deliveryChargeUsed ? Delivery_charge : 0;
      results.heatshrinkDetails = await processHeatshrink(cart_id, heatshrink, payment, validity, charge);
      deliveryChargeUsed = true;
    }

    // Handle Dowells if not empty
    if (dowells && dowells.length > 0) {
      const charge = !deliveryChargeUsed ? Delivery_charge : 0;
      results.dowellsDetails = await processDowells(cart_id, dowells, payment, charge);
      deliveryChargeUsed = true;
    }

    // Handle M3 if not empty
    if (m3 && m3.length > 0) {
      const charge = !deliveryChargeUsed ? Delivery_charge : 0;
      results.m3Details = await processM3(cart_id, m3, payment, validity, charge);
      deliveryChargeUsed = true;
    }

    return results;
  } catch (error) {
    console.error("Error in finalizeQuotation:", error);
    throw error;
  }
}

  
  async function processHeatshrink(cart_id, heatshrink, payment, validity, Delivery_charge) {
    const quotationDetails = {
      items: [],
      validity,
    };
    console.log("array of hss",heatshrink)
    for (const sku of heatshrink) {
      const item = await fetchhsItemDetails(cart_id, sku);
      if (item) {
        quotationDetails.items.push(item);
      }
    }
    const userDetailsQuery = ` 
      SELECT ud.name, ud.company_name 
FROM user_details ud
JOIN cart_details cd ON cd.user_id = ud.id  -- Ensure this matches your actual schema
WHERE cd.id = $1

    `;

    const userDetailsResult = await executeQuery(userDetailsQuery, [cart_id]);
    const userDetails = userDetailsResult[0];
    console.log(userDetails)
    const response = await heatshrinkpdf(quotationDetails, payment,validity, Delivery_charge,cart_id, userDetails.name, userDetails.company_name);
    return response;
  }
  
  async function processDowells( cart_id,dowells, payment, Delivery_charge) {
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
    const userDetailsQuery = ` 
      SELECT ud.name, ud.company_name 
FROM user_details ud
JOIN cart_details cd ON cd.user_id = ud.id  -- Ensure this matches your actual schema
WHERE cd.id = $1

    `;

    const userDetailsResult = await executeQuery(userDetailsQuery, [cart_id]);
    const userDetails = userDetailsResult[0];
    console.log(userDetails)
    console.log("final check before pdf sent ", quotationDetails)
    const response = await dowellspdf(quotationDetails, payment, Delivery_charge,cart_id,userDetails.name, userDetails.company_name);
    return response;
  }
  
  async function processM3(cart_id, m3, payment, validity, Delivery_charge) {
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
    const userDetailsQuery = ` 
     SELECT ud.name, ud.company_name 
FROM user_details ud
JOIN cart_details cd ON cd.user_id = ud.id  -- Ensure this matches your actual schema
WHERE cd.id = $1

    `;

    const userDetailsResult = await executeQuery(userDetailsQuery, [cart_id]);
    const userDetails = userDetailsResult[0];
    console.log(userDetails)
    const response = await Rest3M(quotationDetails, payment, validity, Delivery_charge,cart_id,userDetails.name, userDetails.company_name);
    return response;
  }

  async function fetchhsItemDetails(cart_id, sku) {
    try {
      const orderDetailsQuery = `
        SELECT order_id, quantity, technology, type, voltage, core, size, cabletype, conductor 
        FROM order_details 
        WHERE cart_id = $1 AND sku = $2
      `;
      const orderDetailsResult = await executeQuery(orderDetailsQuery, [cart_id, sku]);
      const orderDetails = orderDetailsResult[0];
      
      if (!orderDetails || !orderDetails.quantity) {
        console.error(`Missing required fields for cart_id: ${cart_id} and sku: ${sku}`);
        return null;
      }
      console.log("orderdeatils", orderDetails)
      const quotationQuery = `
        SELECT price, delivery
        FROM quotation 
        WHERE order_id = $1 AND cart_id = $2
      `;
      const quotationResult = await executeQuery(quotationQuery, [orderDetails.order_id, cart_id]);
      console.log("quotationresult", quotationResult,orderDetails.order_id, cart_id)
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
        delivery: delivery ?? 0
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
      console.log("dowellsreuslt",dowellsDetailsResult)
      const dowellsDetails = dowellsDetailsResult[0];
      console.log("testting dowells pdf", dowellsDetails.description,dowellsDetails.cable_od_mm,dowellsDetails.hsn_code)
      if (!dowellsDetails) {
        console.error(`Missing required fields for cat_no: ${cat_no} `);
        return null;
      }
      
      const orderDetailsQuery = `
        SELECT order_id, quantity
        FROM order_details 
        WHERE cart_id = $1 AND cat_no = $2
      `;
      const orderDetailsResult = await executeQuery(orderDetailsQuery, [cart_id, cat_no]);
      console.log("dowellsorderreuslt",orderDetailsResult)
      const orderDetails = orderDetailsResult[0];
      
      if (!orderDetails || !orderDetails.quantity) {
        console.error(`Missing required fields for cart_id: ${cart_id} and cat_no: ${cat_no}`);
        return null;
      }

      const quotationQuery = `
        SELECT price,discount, delivery
        FROM quotation 
        WHERE order_id = $1 AND cart_id = $2
      `;
      const quotationResult = await executeQuery(quotationQuery, [orderDetails.order_id, cart_id]);
      console.log("quotationresult",quotationResult)
      const price = quotationResult[0].price;
      const delivery = quotationResult[0].delivery;
      const discount = quotationResult[0].discount;
      const catt = cat_no

      return {
        brand: `Dowell's`,
        description: dowellsDetails.description,  // ✅ Keeps correct value
        cableOd: dowellsDetails.cable_od_mm,
        cat_no: catt,
        hsn: dowellsDetails.hsn_code,             // ✅ Keeps correct value
        quantity: orderDetails.quantity ?? 0,
        rate: price ?? 0,
        discount: discount,
        delivery: delivery ?? 0
      };
      
    } catch (error) {
      console.error(`Error fetching details for cart_id: ${cart_id} and cat_no: ${cat_no}`, error);
      return null;
    }
  }
  
  async function fetchrest3mItemDetails(cart_id, sku) {
    try {
      const orderDetailsQuery = `
        SELECT order_id, quantity, name
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
        WHERE order_id = $1 AND cart_id = $2
      `;
      const quotationResult = await executeQuery(quotationQuery, [orderDetails.order_id, cart_id]);
      console.log("fetchrest3m",quotationResult, quotationResult[0].price)
      const price = quotationResult[0].price;
      const delivery = quotationResult[0].delivery;

      return {
        brand: "3M",
        quantity: orderDetails.quantity ?? 0,
        description: orderDetails.name ?? 0,
        hsn: "85469090",
        rate: price ?? 0,
        delivery: delivery ?? 0
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
       const result = await executeQuery(query, [price, discount, cart_id, order_id, delivery]);
    } catch (error) {
      console.error("Error inserting quotation:", error);
      throw new Error("Error inserting quotation");
    }
  }

  async function discard(order_id, cart_id, skuu, cat_noo) {
    try {
        const fetchQuery = `
        SELECT sku, cat_no
        FROM order_details
        WHERE order_id = $1 AND cart_id = $2;
        `;
        const orderDetails = await executeQuery(fetchQuery, [order_id, cart_id]);
        const { sku: fetchedSku, cat_no: fetchedCatNo } = orderDetails[0];

        if (fetchedCatNo == null) {
          const inserField = [];
            inserField.push(fetchedSku);
            // Insert into discarded_items
            const insertDiscardQuery = `INSERT INTO discarded_items (sku, cart_id, order_id) VALUES ($1, $2, $3);`;
            await executeQuery(insertDiscardQuery, [inserField[0], cart_id, order_id]);
        } else {
            const inserField = [];
            inserField.push(fetchedCatNo);
            const insertDiscardQuery = `INSERT INTO discarded_items (sku, cart_id, order_id) VALUES ($1, $2, $3);`;
            await executeQuery(insertDiscardQuery, [inserField[0], cart_id, order_id]);
        }

        // Dynamically build update query
        const updateFields = [];
        const updateValues = [];
        let paramIndex = 1;

        if (skuu !== null) {
            updateFields.push(`sku = $${paramIndex}`);
            updateValues.push(skuu);
            paramIndex++;
        }
        if (cat_noo !== null) {
            updateFields.push(`cat_no = $${paramIndex}`);
            updateValues.push(cat_noo);
            paramIndex++;
        }

        if (updateFields.length > 0) {
            const updateOrderQuery = `
                UPDATE order_details
                SET ${updateFields.join(", ")}
                WHERE order_id = $${paramIndex} AND cart_id = $${paramIndex + 1};
            `;
            console.log("Executing UPDATE:", updateValues, order_id, cart_id);
            await executeQuery(updateOrderQuery, [...updateValues, String(order_id), Number(cart_id)]);
        }

        return { message: "Operation completed successfully" };
    } catch (error) {
        console.error("Error in discard function:", error);
        throw new Error("Failed to complete discard operation");
    }
}

  module.exports = {enquiriesDb, updateStatus, quotation, discard, fetchAndCategorizeData, finalizeQuotation}