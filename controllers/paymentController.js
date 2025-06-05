import dotenv from "dotenv";
import https from "https";
import axios from "axios";
import crypto from "crypto";
import pool from "../config/db.js";
dotenv.config();

export const VerifyPayment = async (req, res) => {
  const { reference, userId } = req.query;
  console.log("The reference is ", reference, userId);

  if (!reference || !userId)
    return res.status(400).json({ message: "Reference required" });

  try {
    const response = await axios.get(
      `https://api.paystack.co/transaction/verify/${reference}`,
      {
        headers: {
          Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        },
      }
    );

    const payment = response?.data?.data;
    console.log(payment);
    if (!payment) {
      return res.status(500).json({ message: "invalid paystack response" });
    }

    if (payment.status === "success") {
      // Save to DB here if needed
      const amountPaid = payment.amount / 100;
      await pool.query(
        "INSERT INTO receipt (paid_at,reference,paymentid,student_id,amount,channel,email,status) VALUES($1,$2,$3,$4,$5,$6,$7,$8)",
        [
          payment.paid_at,
          payment.reference,
          payment.id,
          userId,
          amountPaid,
          payment.channel,
          payment.customer.email,
          payment.status,
        ]
      );

      return res.status(200).json({ message: "verified", payment });
    } else {
      return res.status(400).json({ message: "Payment not successful" });
    }
  } catch (error) {
    console.error(
      "error verifying payment",
      error.response?.data || error.message
    );
    res.status(500).json({ message: "Error verifying payment" });
  }
};

export const InitializePayment = async (req, res) => {
  const { email, amount } = req.body;

  console.log("At initialize payment", req.body);

  if (!email || !amount) {
    return res.status(400).json({ message: "Email and amount required" });
  }

  const params = JSON.stringify({
    email: email.trim().toLowerCase(),
    amount: amount * 100,
  });

  const options = {
    hostname: "api.paystack.co",
    port: 443,
    path: "/transaction/initialize",
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
      "Content-Type": "application/json",
    },
  };

  const paystackReq = https.request(options, (paystackRes) => {
    let data = "";

    paystackRes.on("data", (chunk) => {
      data += chunk;
    });

    paystackRes.on("end", () => {
      const parsed = JSON.parse(data);
      if (parsed.status) {
        res
          .status(200)
          .json({ url: parsed.data.authorization_url, details: parsed.data });
      } else {
        res.status(500).json({ message: parsed.message || "paystack error" });
      }
    });
  });

  paystackReq.on("error", (error) => {
    console.error(error);
    res.status(500).json({ message: "server error" });
  });

  paystackReq.write(params);
  paystackReq.end();
};

export const WebhookUrl = async (req, res) => {
  const secret = process.env.PAYSTACK_SECRET_KEY;
  const hash = crypto
    .createHmac("sha512", secret)
    .update(JSON.stringify(req.body))
    .digest("hex");

  const signature = req.headers["x-paystack-signature"];

  if (hash !== signature) {
    return res.status(400).send("Invalid signature");
  }

  const event = req.body;
  console.log(event);

  if (event.event === "charge.success") {
    const payment = event.data;
    const amountPaid = payment.amount / 100;
    const reference = payment.reference;
    const email = payment.customer.email;
    const paymentId = payment.id;
    const paidAt = payment.paid_at;
    const channel = payment.channel;
    const status = payment.status;

    try {
      const result = await pool.query("SELECT  * FROM users WHERE email=$1", [
        email,
      ]);
      const studentId = result.rows[0]?.id || null;
      const currentTerm = result.rows[0]?.term || null;
      const currentsession = result.rows[0]?.session || null;
      if (studentId) {
        const schoolfee = result.rows[0].schoolfee;
        const previousamount = result.rows[0].previouslypaid;
        const previouslypaid = previousamount + amountPaid;
        const amountRemaining = schoolfee - amountPaid;
        console.log("Amount wey remain be:", amountRemaining);

        await pool.query(
          "UPDATE users SET schoolfee=$1, previouslypaid=$2 WHERE id=$3",
          [amountRemaining, previouslypaid, studentId]
        );
      }
      console.log(studentId);

      const existing = await pool.query(
        "SELECT * FROM receipt WHERE reference=$1",
        [reference]
      );
      if (existing.rowCount === 0) {
        await pool.query(
          "INSERT INTO receipt (paid_at,reference,paymentid,student_id,amount,channel,email,status,term,session) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)",
          [
            paidAt,
            reference,
            paymentId,
            studentId,
            amountPaid,
            channel,
            email,
            status,
            currentTerm,
            currentsession,
          ]
        );
      }
      res.status(200).send("Webhook received and processed");
    } catch (error) {
      console.error("Webhook processing error", error.message);
      res.status(500).send("Error processing webhook");
    }
  } else {
    res.status(200).send("Unhandled event type");
  }
};

export const FetchReceipt = async (req, res) => {
  const studentId = req.query.id;
  console.log("the student id when fetching receipt", studentId);

  if (!studentId)
    return res.status(400).json({ message: "StudentID is required" });
  try {
    const receipt = await pool.query(
      `SELECT r.*, s.id AS student_id
       FROM receipt r
       JOIN users s ON r.student_id = s.id
       WHERE r.student_id = $1`,
      [studentId]
    );

    console.log("The receipts are", receipt.rows);
    res.status(200).json({ receipt: receipt.rows });
  } catch (error) {
    console.error("Error fetching student receipts:", error.message);
    res.status(500).json({ message: "Server Error" });
  }
};
