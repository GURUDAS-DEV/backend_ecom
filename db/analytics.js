const { Pool } = require("pg");
require("dotenv").config();

const pool = new Pool({
  connectionString: process.env.DB_CONNECTION_STRING,
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

// 🔥 Core analytics: count per SKU / CAT_NO
async function getOrderAnalytics() {
  const query = `
    SELECT 
      COALESCE(sku, cat_no) AS item_code,
      COUNT(*) AS total_orders,
      SUM(quantity) AS total_quantity
    FROM order_details
    WHERE cart_id IS NOT NULL
    GROUP BY item_code
    ORDER BY total_orders DESC;
  `;

  return await executeQuery(query);
}

// 📊 Optional: filter by date
async function getAnalyticsByDate(from, to) {
  const query = `
    SELECT 
      COALESCE(sku, cat_no) AS item_code,
      COUNT(*) AS total_orders,
      SUM(quantity) AS total_quantity
    FROM order_details
    WHERE cart_id IS NOT NULL
      AND created_at BETWEEN $1 AND $2
    GROUP BY item_code
    ORDER BY total_orders DESC;
  `;

  return await executeQuery(query, [from, to]);
}

module.exports = {
  getOrderAnalytics,
  getAnalyticsByDate
};
