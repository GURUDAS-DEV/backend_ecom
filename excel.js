const { Pool } = require('pg');
const fs = require('fs');
const csv = require('csv-parser');
require("dotenv").config();

const pool = new Pool({
    connectionString: process.env.DB_CONNECTION_STRING
});

const insertData = async (data) => {
    try {
        const query = `
            INSERT INTO dowells_pricelist 
            (description, cable_od_mm, cat_no, hsn_code, price) 
            VALUES ($1, $2, $3, $4, $5)
        `;
        for (const row of data) {
            await pool.query(query, [
                row.description,
                row.cable_od_mm,
                row.cat_no,
                row.hsn_code,
                row.price
            ]);
        }
        console.log('Data inserted successfully!');
    } catch (err) {
        console.error('Error inserting data:', err.message);
    } finally {
        await pool.end();
    }
};

const loadCSV = (filePath) => {
    const data = [];
    fs.createReadStream(filePath)
        .pipe(csv())
        .on('data', (row) => data.push(row))
        .on('end', () => {
            console.log(`${data.length} rows read from the CSV file.`);
            insertData(data);
        })
        .on('error', (err) => console.error('Error reading CSV file:', err.message));
};

loadCSV('dowells_price_fixed.csv');
