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

    // Gửi thông báo đến tất cả thiết bị đã đăng ký
    const notifications = deviceTokens.map(token => 
      sendNotification(token, title, body, notificationData)
    );

    await Promise.all(notifications);

    res.json({ message: 'Notifications sent successfully' });
  } catch (error) {
    console.error('Error processing webhook:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
