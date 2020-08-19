const knex = require('knex');

const host = process.env.POSTGRES_HOST;
const user = process.env.POSTGRES_USERNAME;
const password = process.env.POSTGRES_PASSWORD;
const database = process.env.POSTGRES_DATABASE_NAME;

const db = knex({
  client: 'pg',
  connection: {
    host,
    user,
    password,
    database,
    ssl: { rejectUnauthorized: false },
  },
});

module.exports = db;
