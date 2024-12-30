const admin = require('firebase-admin');

// Khởi tạo Firebase Admin SDK
const initializeFirebase = () => {
  try {
    const serviceAccount = require('../../bank-notification-817c2-firebase-adminsdk-x5x0k-38d2dbd99b.json');
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
    console.log('Firebase Admin SDK initialized successfully');
  } catch (error) {
    console.error('Error initializing Firebase Admin SDK:', error);
    process.exit(1);
  }
};

// Gửi thông báo FCM
const sendNotification = async (token, title, body, data = {}) => {
  try {
    const message = {
      notification: {
        title,
        body
      },
      data: {
        ...data,
        click_action: 'FLUTTER_NOTIFICATION_CLICK'
      },
      token
    };

    const response = await admin.messaging().send(message);
    console.log('Successfully sent message:', response);
    return response;
  } catch (error) {
    console.error('Error sending message:', error);
    throw error;
  }
};

module.exports = {
  initializeFirebase,
  sendNotification
};
