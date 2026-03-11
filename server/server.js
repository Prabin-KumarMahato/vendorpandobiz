const express = require('express');
const cors = require('cors');
const { Resend } = require('resend');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 5000;

// Initialize Resend with API Key
const resend = new Resend(process.env.RESEND_API_KEY);

// Test endpoint
app.get('/', (req, res) => {
  res.send('PandoBiz Email Server (Resend API) is Running!');
});

// Endpoint to send email
app.post('/api/send-email', async (req, res) => {
  const { to, subject, text, html } = req.body;

  if (!to || !subject || (!text && !html)) {
    return res.status(400).json({ error: 'Missing required fields: to, subject, text/html' });
  }

  try {
    const { data, error } = await resend.emails.send({
      from: "Pandobiz <onboarding@resend.dev>", // Using Resend's default onboarding email for testing
      to,
      subject,
      text,
      html
    });

    if (error) {
      console.error('Error sending email via Resend:', error);
      return res.status(400).json({ error: 'Failed to send email', details: error.message });
    }

    console.log('Email sent via Resend:', data);
    res.status(200).json({ success: true, message: 'Email sent successfully!', data });
  } catch (error) {
    console.error('Error sending email:', error);
    res.status(500).json({ error: 'Failed to send email', details: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
