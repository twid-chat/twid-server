const knex = require('knex');

const user = process.env.POSTGRES_USERNAME;
const password = process.env.POSTGRES_PASSWORD;
const database = process.env.POSTGRES_DATABASE_NAME;

const db = knex({
  client: 'pg',
  connection: {
    host: 'rajje.db.elephantsql.com',
    user,
    password,
    database,
  },
});

module.exports = db;
