require('dotenv').config();
const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const db = require('./db');

const app = express();

const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:5000',
  'https://twid.dev',
  /https:\/\/.*--twid\.netlify\.app/,
];

app.use(
  cors({
    origin: allowedOrigins,
  }),
);

app.use(express.json());

const PORT = 4000;

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.split(' ')[1];

  if (!token) {
    return res.sendStatus(401);
  }

  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, user) => {
    if (err) {
      res.sendStatus(403);
    } else {
      req.user = user;
      next();
    }
  });
};

app.get('/api/content', authenticateToken, async (req, res) => {
  res.send('Success!');
});

app.get('/api/me', authenticateToken, async (req, res) => {
  try {
    const { user_id: userId, username, email } = await db
      .select()
      .table('users')
      .where('user_id', req.user.userId)
      .first();
    res.send({
      userId,
      username,
      email,
    });
  } catch (error) {
    res.sendStatus(500);
  }
});

app.listen(PORT, () => console.log(`Listening at http://localhost:${PORT}`));
