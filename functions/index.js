const {onDocumentCreated} = require("firebase-functions/v2/firestore");
const admin = require("firebase-admin");

admin.initializeApp();

/**
 * Sends a push notification to specific FCM tokens.
 */
async function sendPushNotification(tokens, title, body, data = {}, icon = "/Images/Logo/image-Photoroom%20(2)%20copy%205.png") {
  if (!tokens || tokens.length === 0) return;

  const message = {
    notification: {
      title: title,
      body: body,
    },
    data: data,
    tokens: tokens,
  };

  try {
    const response = await admin.messaging().sendEachForMulticast(message);
    console.log(`Successfully sent ${response.successCount} messages; ${response.failureCount} messages failed.`);
    
    // Cleanup failed tokens if needed (e.g. if they are invalid)
    if (response.failureCount > 0) {
      const failedTokens = [];
      response.responses.forEach((resp, idx) => {
        if (!resp.success) {
          failedTokens.push(tokens[idx]);
        }
      });
      console.log("Failed tokens:", failedTokens);
    }
  } catch (error) {
    console.error("Error sending push notification:", error);
  }
}

/**
 * Trigger for Client Notifications
 */
exports.onClientNotificationCreated = onDocumentCreated("client_notifications/{docId}", async (event) => {
  const data = event.data.data();
  const clientId = data.clientId;

  if (!clientId) return;

  // Get user's FCM tokens
  const userDoc = await admin.firestore().collection("users").doc(clientId).get();
  const tokens = userDoc.data()?.fcmTokens || [];

  if (tokens.length === 0) return;

  await sendPushNotification(
    tokens,
    data.title || "Lbricol Notification",
    data.body || "You have a new update.",
    {
      type: data.type || "general",
      orderId: data.orderId || "",
    }
  );
});

/**
 * Trigger for Bricoler Notifications
 */
exports.onBricolerNotificationCreated = onDocumentCreated("bricoler_notifications/{docId}", async (event) => {
  const data = event.data.data();
  const bricolerId = data.bricolerId;

  if (!bricolerId) return;

  const userDoc = await admin.firestore().collection("users").doc(bricolerId).get();
  const tokens = userDoc.data()?.fcmTokens || [];

  if (tokens.length === 0) return;

  await sendPushNotification(
    tokens,
    data.title || "Lbricol Pro Update",
    data.body || "New job activity detected.",
    {
      type: data.type || "general",
      jobId: data.jobId || "",
    }
  );
});

/**
 * Trigger for Chat Messages
 */
exports.onChatMessageCreated = onDocumentCreated("jobs/{jobId}/messages/{messageId}", async (event) => {
  const messageData = event.data.data();
  const jobId = event.params.jobId;
  const senderId = messageData.senderId;

  // Get the job to find the recipient
  const jobDoc = await admin.firestore().collection("jobs").doc(jobId).get();
  const jobData = jobDoc.data();

  if (!jobData) return;

  // Recipient is the person who didn't send the message
  const recipientId = senderId === jobData.clientId ? jobData.bricolerId : jobData.clientId;

  if (!recipientId) return;

  const recipientDoc = await admin.firestore().collection("users").doc(recipientId).get();
  const tokens = recipientDoc.data()?.fcmTokens || [];

  if (tokens.length === 0) return;

  await sendPushNotification(
    tokens,
    `New message from ${messageData.senderName || "User"}`,
    messageData.text || "Sent an image or attachment.",
    {
      type: "chat_message",
      jobId: jobId,
    }
  );
});
