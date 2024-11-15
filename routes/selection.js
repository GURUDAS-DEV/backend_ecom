const express = require("express");
const router = express.Router();
const path = require("path");
const { z } = require("zod");
const { v4: uuidv4 } = require("uuid");
const { storeDataInDb, userDb, processOrderData, getCartDetails, updateCart, deleteCartItem, findUserByEmail } = require("../db/order"); 
const { enquirySenderMail } = require("../mail/client-enquiry");

require("dotenv").config({ path: path.join(__dirname, "../.env") });

router.use(express.json());

const generateSmallId = () => uuidv4().substring(0, 6);

const userSchema = z.object({
    name: z.string().min(1, "Name is required"), // Ensures name is provided
    email: z.string().email("Invalid email format"), // Validates email format
    phone: z.string().optional() // Allows phone to be optional
  });

router.post("/order", async (req, res) => {
    try {
        const { sku, quantity } = req.body;
        const hsn = 85469090
        const uniqueId = generateSmallId();

        await storeDataInDb(sku, quantity, uniqueId);

        res.status(200).json({ sku: sku, quantity:quantity, hsn: hsn, id: uniqueId, message: "Data stored successfully" });
    } catch (error) {
        console.error("Error in /order route:", error);
        res.status(500).json({ message: "An error occurred" });
    }
});

router.post("/user", async (req, res) => {
    try {
      // Validate the request body
      const parsedBody = userSchema.parse(req.body);
      const { name, email, phone } = parsedBody;
  
      const existingUser = await findUserByEmail(email); 
  
      if (existingUser) {
        return res.status(200).json({ userId: existingUser });
      }
  
      const id = await userDb(name, email, phone);
      return res.status(200).json({ userId: id });
    } catch (error) {
      // Handle validation error from Zod
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors });
      }
  
      console.error("Error in /user route:", error);
      res.status(500).json({ message: "An error occurred" });
    }
  });

router.post("/create", async (req, res) => {
    try {
        const { userId, orderIds } = req.body; 

        if (!Array.isArray(orderIds) || !userId) {
            return res.status(400).json({ message: "Invalid input" });
        }

        await processOrderData(orderIds, userId);
        await enquirySenderMail(userId)
        res.status(200).json({ message: "Data processed successfully" });
    } catch (error) {
        console.error("Error in /create route:", error);
        res.status(500).json({ message: "An error occurred" });
    }
});

router.get("/getCart", async (req, res) => {
    try {
        const { orderId } = req.body; 

        if (!orderId) {
            return res.status(400).json({ message: "order ID is required" });
        }

        const cartDetails = await getCartDetails(orderId);

        res.status(200).json({ cart: cartDetails });
    } catch (error) {
        console.error("Error in /getCart route:", error);
        res.status(500).json({ message: "An error occurred while fetching cart details" });
    }
});

router.put("/cartUpdate", async(req,res)=>{
    try {
        const {userId, quantity, order_id} = req.body
        const updateDetails = await updateCart(userId, quantity, order_id)

        res.status(200).json({ cart: updateDetails });
    } catch (error) {
        console.error("error in /cartupdate", error)
        res.status(500).json({message:"an error occured"})
    }
})

router.delete("/itemDelete", async(req,res)=>{
    try {
        const { order_id } = req.body
        const deleteDetails = await deleteCartItem(order_id)

        res.status(200).json({ cart: deleteDetails })
    } catch (error) {
        console.error("error in /itemDelete", error)
        res.status(500).json({message:"an error occured"})
    }
})

module.exports = router;
