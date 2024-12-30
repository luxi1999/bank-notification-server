const express = require('express');
const router = express.Router();
const { sendNotification } = require('../config/firebase');

// Danh sách token FCM của các thiết bị (trong thực tế nên lưu vào database)
const deviceTokens = [];

// API đăng ký token FCM
router.post('/register-token', (req, res) => {
  const { token } = req.body;
  if (!token) {
    return res.status(400).json({ error: 'Token is required' });
  }

  if (!deviceTokens.includes(token)) {
    deviceTokens.push(token);
  }

  res.json({ message: 'Token registered successfully' });
});

// Middleware kiểm tra API key
const validateApiKey = (req, res, next) => {
  const apiKey = req.headers['apikey'];
  // TODO: Thay YOUR_SECRET_KEY bằng key thật từ Pay2S
  const validApiKey = process.env.PAY2S_SECRET_KEY || 'YOUR_SECRET_KEY';

  if (!apiKey || apiKey !== validApiKey) {
    console.error('Invalid API key:', apiKey);
    return res.status(401).json({ success: false, message: 'Invalid API key' });
  }

  next();
};

// Webhook nhận thông báo từ Pay2S
router.post('/bank-notification', validateApiKey, async (req, res) => {
  try {
    console.log('Received webhook payload:', JSON.stringify(req.body, null, 2));
    console.log('Headers:', JSON.stringify(req.headers, null, 2));

    const { transactions } = req.body;

    if (!transactions || !Array.isArray(transactions)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid payload, transactions not found or not an array'
      });
    }

    for (const transaction of transactions) {
      const {
        id,
        gateway,
        transactionDate,
        transactionNumber,
        accountNumber,
        content,
        transferType,
        transferAmount
      } = transaction;

      // Validate dữ liệu
      if (!id || !transactionNumber || !accountNumber || !transferAmount) {
        console.error('Missing required fields in transaction:', transaction);
        continue;
      }

      // Log thông tin giao dịch
      console.log('Processing transaction:', {
        id,
        gateway,
        transactionDate,
        transactionNumber,
        accountNumber,
        content,
        transferType,
        transferAmount
      });

      // Tạo nội dung thông báo
      const title = 'Thông báo giao dịch';
      const body = transferType === 'IN' 
        ? `Tài khoản ${accountNumber} vừa nhận ${transferAmount.toLocaleString()}đ`
        : `Tài khoản ${accountNumber} vừa chi ${transferAmount.toLocaleString()}đ`;

      // Data bổ sung
      const notificationData = {
        id,
        gateway,
        transactionDate,
        transactionNumber,
        accountNumber,
        content,
        transferType,
        transferAmount: transferAmount.toString()
      };

      // Gửi notification nếu có device token
      if (deviceTokens.length > 0) {
        try {
          const notifications = deviceTokens.map(token => 
            sendNotification(token, title, body, notificationData)
          );
          await Promise.all(notifications);
          console.log('Notifications sent successfully for transaction:', id);
        } catch (error) {
          console.error('Error sending notifications:', error);
        }
      } else {
        console.log('No device tokens registered, skipping notifications');
      }
    }

    // Trả về success response theo format Pay2S yêu cầu
    res.json({
      success: true,
      message: 'Transactions processed successfully'
    });

  } catch (error) {
    console.error('Error processing webhook:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

module.exports = router;
