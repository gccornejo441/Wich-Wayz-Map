import Stripe from "stripe";
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: "2024-11-20.acacia",
  });
const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

export const config = {
  api: {
    bodyParser: false, 
  },
};

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
      return res.status(400).send("Missing Stripe signature or webhook secret.");
    }

    event = stripe.webhooks.constructEvent(rawBody, signature, endpointSecret);
  } catch (err) {
    console.error("⚠️ Webhook signature verification failed:", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  console.log(`✅ Received event type: ${event.type}`);

  try {
    const session = event.data.object;

    const paymentIntent = await stripe.paymentIntents.retrieve(
      session.payment_intent
    );

    console.log(
        `💰 PaymentIntent for ${paymentIntent.amount} was successful!`
      );

    const userId = paymentIntent.metadata?.userId;
    if (userId) {
      console.log(`Updating membership for user: ${userId}`);
      await updateMembershipStatus(userId, "member");
    } else {
      console.warn("UserId is missing from payment metadata.");
    }

    res.status(200).json({ received: true });
  } catch (err) {
    console.error("Error processing webhook event:", err.message);
    res.status(500).send("Internal Server Error");
  }
}