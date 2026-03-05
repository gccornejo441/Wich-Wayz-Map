import Stripe from "stripe";
import { executeQuery } from "./lib/db.js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2024-11-20.acacia",
});

const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;
const expectedPriceCents = parseInt(
  process.env.STRIPE_MEMBERSHIP_PRICE_CENTS || "500",
  10,
);
const validatePaymentAmount = process.env.VALIDATE_PAYMENT_AMOUNT !== "false";

// Idempotency store: Map<payment_intent_id, { processed: boolean, timestamp }>
const processedPayments = new Map();

export const config = {
  api: {
    bodyParser: false,
  },
  runtime: "nodejs",
};

/**
 * Check if a payment has already been processed (idempotency).
 * @param {string} paymentIntentId - The payment intent ID
 * @returns {boolean} True if already processed
 */
const isPaymentProcessed = (paymentIntentId) => {
  const entry = processedPayments.get(paymentIntentId);
  if (!entry) return false;

  // Clean up entries older than 24 hours
  const dayAgo = Date.now() - 24 * 60 * 60 * 1000;
  if (entry.timestamp < dayAgo) {
    processedPayments.delete(paymentIntentId);
    return false;
  }

  return entry.processed;
};

/**
 * Mark a payment as processed.
 * @param {string} paymentIntentId - The payment intent ID
 */
const markPaymentProcessed = (paymentIntentId) => {
  processedPayments.set(paymentIntentId, {
    processed: true,
    timestamp: Date.now(),
  });
};

/**
 * Validate payment amount matches expected membership price.
 * @param {number} amount - Amount in cents
 * @returns {boolean} True if amount is valid
 */
const validateAmount = (amount) => {
  if (!validatePaymentAmount) {
    return true; // Validation disabled
  }

  // Allow some tolerance for currency conversion (±10%)
  const minAmount = expectedPriceCents * 0.9;
  const maxAmount = expectedPriceCents * 1.1;

  return amount >= minAmount && amount <= maxAmount;
};

/**
 * Updates the membership status of a user in the database.
 * @param {string|number} userId - The ID of the user to update.
 * @param {string} status - The new membership status.
 */
const updateMembershipStatus = async (userId, status) => {
  console.log(`Updating membership status for user ${userId} to ${status}`);
  const query = `
    UPDATE users
    SET membership_status = $status,
        date_modified = CURRENT_TIMESTAMP
    WHERE id = $userId
  `;
  try {
    await executeQuery(query, { status, userId });
    console.log(`Membership status updated successfully for user ${userId}`);
  } catch (error) {
    console.error(
      `Failed to update membership status for user ${userId}:`,
      error.message,
    );
    throw error;
  }
};

/**
 * Handles Stripe webhook events.
 * @param {Request} req - The request object.
 * @param {Response} res - The response object.
 * @returns {Promise<void>}
 */
export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).send("Method Not Allowed");
  }

  let event;

  try {
    const rawBody = await new Promise((resolve, reject) => {
      let data = "";
      req.on("data", (chunk) => (data += chunk));
      req.on("end", () => resolve(Buffer.from(data)));
      req.on("error", reject);
    });

    const signature = req.headers["stripe-signature"];
    if (!signature || !endpointSecret) {
      return res
        .status(400)
        .send("Missing Stripe signature or webhook secret.");
    }

    event = stripe.webhooks.constructEvent(rawBody, signature, endpointSecret);
  } catch (err) {
    console.error("Webhook signature verification failed:", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  console.log(`Received event type: ${event.type}`);

  try {
    if (event.type === "checkout.session.completed") {
      const session = event.data.object;

      if (!session.payment_intent) {
        console.error("Missing payment_intent in session object");
        return res.status(400).send("Invalid session payload");
      }

      const paymentIntent = await stripe.paymentIntents.retrieve(
        session.payment_intent,
      );

      // Idempotency check
      if (isPaymentProcessed(paymentIntent.id)) {
        console.warn(
          `[Webhook] Payment ${paymentIntent.id} already processed (idempotency)`,
        );
        return res.status(200).json({ received: true, duplicate: true });
      }

      // Validate payment status
      if (paymentIntent.status !== "succeeded") {
        console.error(
          `[Webhook] Payment ${paymentIntent.id} status is ${paymentIntent.status}, not 'succeeded'`,
        );
        return res.status(400).send("Payment not successful");
      }

      // Validate payment amount
      if (!validateAmount(paymentIntent.amount)) {
        console.error(
          `[Webhook] Invalid payment amount: ${paymentIntent.amount} cents (expected ~${expectedPriceCents})`,
        );
        return res.status(400).send("Invalid payment amount");
      }

      console.log(`PaymentIntent for ${paymentIntent.amount} was successful!`);

      const userId = paymentIntent.metadata?.userId;
      if (!userId) {
        console.error(
          `[Webhook] UserId missing from payment metadata for ${paymentIntent.id}`,
        );
        return res.status(400).send("Missing user metadata");
      }

      console.log(`Updating membership for user: ${userId}`);
      await updateMembershipStatus(userId, "member");

      // Mark as processed
      markPaymentProcessed(paymentIntent.id);

      res.status(200).json({ received: true, userId });
    } else if (event.type === "payment_intent.succeeded") {
      const paymentIntent = event.data.object;

      console.log("Webhook event:", JSON.stringify(event, null, 2));

      // Idempotency check
      if (isPaymentProcessed(paymentIntent.id)) {
        console.warn(
          `[Webhook] Payment ${paymentIntent.id} already processed (idempotency)`,
        );
        return res.status(200).json({ received: true, duplicate: true });
      }

      // Validate payment status
      if (paymentIntent.status !== "succeeded") {
        console.error(
          `[Webhook] Payment ${paymentIntent.id} status is ${paymentIntent.status}, not 'succeeded'`,
        );
        return res.status(400).send("Payment not successful");
      }

      // Validate payment amount
      if (!validateAmount(paymentIntent.amount)) {
        console.error(
          `[Webhook] Invalid payment amount: ${paymentIntent.amount} cents (expected ~${expectedPriceCents})`,
        );
        return res.status(400).send("Invalid payment amount");
      }

      console.log(`PaymentIntent for ${paymentIntent.amount} was successful!`);

      const userId = paymentIntent.metadata?.userId;

      if (!userId) {
        console.error(
          `[Webhook] UserId missing from payment metadata for ${paymentIntent.id}`,
        );
        return res.status(400).send("Missing user metadata");
      }

      console.log(`Updating membership for user: ${userId}`);
      await updateMembershipStatus(userId, "member");

      // Mark as processed
      markPaymentProcessed(paymentIntent.id);

      res.status(200).json({ received: true, userId });
    } else {
      console.log(`Unhandled event type: ${event.type}`);
      res.status(200).json({ received: true, unhandled: true });
    }
  } catch (err) {
    console.error("Error processing webhook event:", err.message);
    res.status(500).send("Internal Server Error");
  }
}
