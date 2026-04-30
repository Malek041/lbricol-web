const {onDocumentCreated, onDocumentUpdated, onDocumentDeleted} = require("firebase-functions/v2/firestore");
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

/**
 * Audit Log for Bricoler Updates
 * Tracks every change to a Bricoler profile to allow recovery from accidental overwrites.
 */
exports.auditBricolerUpdate = onDocumentUpdated("bricolers/{uid}", async (event) => {
  const before = event.data.before.data();
  const after = event.data.after.data();

  // Create a log entry in a dedicated audit collection
  await admin.firestore().collection("audit_logs").add({
    targetId: event.params.uid,
    collection: "bricolers",
    action: "UPDATE",
    before: before,
    after: after,
    timestamp: admin.firestore.FieldValue.serverTimestamp(),
    metadata: {
      timestamp: new Date().toISOString(),
    }
  });
});

/**
 * Audit Log for Bricoler Deletions
 * Tracks deletions to allow restoration of deleted profiles.
 */
exports.auditBricolerDeletion = onDocumentDeleted("bricolers/{uid}", async (event) => {
  const deletedData = event.data.data();

  await admin.firestore().collection("audit_logs").add({
    targetId: event.params.uid,
    collection: "bricolers",
    action: "DELETE",
    data: deletedData,
    timestamp: admin.firestore.FieldValue.serverTimestamp(),
    metadata: {
      timestamp: new Date().toISOString(),
    }
  });
});

/**
 * Helper to dispatch host jobs based on automation settings
 */
async function dispatchHostJob(propertyId, serviceId, eventType, eventDate) {
  const db = admin.firestore();
  
  const propertyDoc = await db.collection("properties").doc(propertyId).get();
  if (!propertyDoc.exists) return;
  const property = propertyDoc.data();

  // Skill Mapping based on service categories
  const skillMap = {
    'cleaning': 'Cleaning',
    'glass_cleaning': 'Glass Cleaning',
    'receptionist': 'Receptionist',
    'gardening': 'Gardening',
    'pool_maintenance': 'Pool Maintenance',
    'pets_care': 'Pets Care',
    'errands': 'Errands'
  };
  
  const requiredSkill = skillMap[serviceId];
  let assigneeId = null;
  let assigneeType = null;
  let assigneeName = null;
  
  // 1. Try to find a team member with the required skill
  const teamSnap = await db.collection("properties").doc(propertyId).collection("team").get();
  const skilledMember = teamSnap.docs.find(doc => {
    const data = doc.data();
    return data.skills?.includes(serviceId) || data.skills?.includes(requiredSkill);
  });

  if (skilledMember) {
    assigneeId = skilledMember.id;
    assigneeType = 'team';
    assigneeName = skilledMember.data().name;
  } else {
    // 2. Fallback: Try to find a verified Lbricol Pro in the same city
    const prosSnap = await db.collection("bricolers")
      .where("city", "==", property.city || "Marrakech")
      .where("isVerified", "==", true)
      .where("serviceIds", "array-contains", serviceId)
      .limit(1)
      .get();
      
    if (!prosSnap.empty) {
      const pro = prosSnap.docs[0];
      assigneeId = pro.id;
      assigneeType = 'managed';
      assigneeName = pro.data().name || pro.data().displayName;
    }
  }

  // 3. Create the job record
  const jobRef = await db.collection("jobs").add({
    clientId: property.hostId,
    propertyId: propertyId,
    status: assigneeId ? 'assigned' : 'new',
    service: serviceId,
    subService: eventType,
    subServiceDisplayName: eventType,
    date: eventDate,
    time: property.automation?.cleaningTime || "11:30",
    address: property.specs?.address || '',
    isHostJob: true,
    isAutomatic: true,
    bricolerId: assigneeId,
    executor: assigneeId ? { 
        id: assigneeId, 
        type: assigneeType, 
        isAutoMatch: true,
        name: assigneeName
    } : null,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  // 4. Notify the assignee
  if (assigneeId) {
    const userDoc = await db.collection("users").doc(assigneeId).get();
    const tokens = userDoc.data()?.fcmTokens || [];
    if (tokens.length > 0) {
      await sendPushNotification(
        tokens,
        "Nouveau job auto-assigné",
        `Vous avez été assigné à une mission de ${serviceId} pour ${property.name}.`,
        { jobId: jobRef.id, type: 'auto_assignment' }
      );
    }
  }
}

/**
 * Trigger: On Calendar Event Created
 * Dispatches jobs based on property automation settings
 */
exports.onCalendarEventCreated = onDocumentCreated("properties/{propertyId}/calendar/{eventId}", async (event) => {
  const eventData = event.data.data();
  const propertyId = event.params.propertyId;
  const eventType = eventData.type; // e.g. 'Checkout', 'Check-in'
  
  const db = admin.firestore();
  const propertyDoc = await db.collection("properties").doc(propertyId).get();
  if (!propertyDoc.exists) return;
  const property = propertyDoc.data();
  const automation = property.automation || {};
  
  if (!automation.enabled) return;

  const servicesToDispatch = [];

  // Mapping Event Types to Services
  if (eventType === 'Checkout') {
    if (automation.services?.includes('cleaning')) servicesToDispatch.push('cleaning');
    if (automation.errandsEnabled) servicesToDispatch.push('errands');
  } else if (eventType === 'Check-in') {
    if (automation.services?.includes('receptionist')) servicesToDispatch.push('receptionist');
  }

  // Dispatch all relevant services
  const dispatchPromises = servicesToDispatch.map(serviceId => 
    dispatchHostJob(propertyId, serviceId, eventType, eventData.date)
  );

  await Promise.all(dispatchPromises);
});
