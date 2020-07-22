require('dotenv').config();
const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
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

const PORT = 4001;

const generateAccessToken = user => {
  return jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '30m' });
};

app.post('/auth/token', async (req, res) => {
  const refreshToken = req.body.token;

  if (!refreshToken) {
    return res.sendStatus(401);
  }

  try {
    const refreshTokenDBResult = await db
      .select()
      .table('refresh_tokens')
      .where('refresh_token', refreshToken)
      .first();

    if (refreshTokenDBResult) {
      jwt.verify(
        refreshToken,
        process.env.REFRESH_TOKEN_SECRET,
        (error, user) => {
          if (error) {
            res.sendStatus(403);
          } else {
            const accessToken = generateAccessToken({ userId: user.userId });
            res.json({ accessToken });
          }
        },
      );
    } else {
      res.sendStatus(403);
    }
  } catch (error) {
    res.sendStatus(500);
  }
});

app.post('/auth/register', async (req, res) => {
  const { email, password, username } = req.body;
  try {
    const userDBResult = await db
      .select()
      .table('users')
      .whereRaw('LOWER(username) = LOWER(?)', username)
      .orWhereRaw('LOWER(email) = LOWER(?)', email)
      .first();
    if (userDBResult) {
      res.sendStatus(409);
    } else {
      bcrypt.hash(password, 10, async (err, hash) => {
        if (err) {
          res.sendStatus(500);
        } else {
          const [userId] = await db('users')
            .insert({
              username,
              password: hash,
              email,
            })
            .returning('user_id');

          const refreshToken = jwt.sign(
            { userId },
            process.env.REFRESH_TOKEN_SECRET,
            { expiresIn: '7d' },
          );

          await db('refresh_tokens').insert({
            refresh_token: refreshToken,
            username,
          });

          res.json({ refreshToken });
        }
      });
    }
  } catch (error) {
    res.sendStatus(500);
  }
});

app.post('/auth/login', async (req, res) => {
  const { password, username } = req.body;
  try {
    const userDBResult = await db
      .select()
      .table('users')
      .whereRaw('LOWER(username) = LOWER(?)', username)
      .first();
    if (userDBResult) {
      bcrypt.compare(password, userDBResult.password, async (err, result) => {
        if (result) {
          const refreshToken = jwt.sign(
            { userId: userDBResult.user_id },
            process.env.REFRESH_TOKEN_SECRET,
            { expiresIn: '7d' },
          );

          await db('refresh_tokens').insert({
            refresh_token: refreshToken,
            username,
          });

          res.json({ refreshToken });
        } else {
          res.sendStatus(401);
        }
      });
    } else {
      res.sendStatus(401);
    }
  } catch (error) {
    res.sendStatus(500);
  }
});

app.post('/auth/logout', async (req, res) => {
  try {
    await db('refresh_tokens').where('refresh_token', req.body.token).del();
    res.sendStatus(200);
  } catch (error) {
    res.sendStatus(500);
  }
});

app.listen(PORT, () => console.log(`Listening at http://localhost:${PORT}`));
