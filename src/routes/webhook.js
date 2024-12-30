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

// Webhook nhận thông báo từ ngân hàng
router.post('/bank-notification', async (req, res) => {
  try {
    const { 
      transaction_id,
      amount,
      type, // 'credit' hoặc 'debit'
      account,
      timestamp 
    } = req.body;

    // Validate dữ liệu
    if (!transaction_id || !amount || !type || !account) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Log thông tin giao dịch
    console.log('Received transaction:', {
      transaction_id,
      amount,
      type,
      account,
      timestamp: timestamp || new Date().toISOString()
    });

    // Tạo nội dung thông báo
    const title = 'Thông báo giao dịch';
    const body = type === 'credit' 
      ? `Tài khoản ${account} vừa nhận ${amount.toLocaleString()}đ`
      : `Tài khoản ${account} vừa chi ${amount.toLocaleString()}đ`;

    // Data bổ sung
    const notificationData = {
      transaction_id,
      amount: amount.toString(),
      type,
      account,
      timestamp: timestamp || new Date().toISOString()
    };

    // Chỉ gửi notification nếu có device token
    if (deviceTokens.length > 0) {
      try {
        const notifications = deviceTokens.map(token => 
          sendNotification(token, title, body, notificationData)
        );
        await Promise.all(notifications);
        console.log('Notifications sent successfully');
      } catch (error) {
        console.error('Error sending notifications:', error);
        // Không throw error để vẫn trả về success response
      }
    } else {
      console.log('No device tokens registered, skipping notifications');
    }

    // Luôn trả về success response
    res.json({ 
      message: 'Transaction processed successfully',
      transaction: {
        transaction_id,
        amount,
        type,
        account,
        timestamp: timestamp || new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Error processing webhook:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
