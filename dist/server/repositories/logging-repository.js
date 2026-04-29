"use strict";

const db = require("../sql.js");
const logFailedLoginAttempt = async (username, ipAddress) => {
  const createdAt = Date.now();
  return new Promise(resolve => {
    db.run("INSERT INTO failed_login_attempts (username, ip_address, created_at) VALUES (?, ?, ?)", [username, ipAddress, createdAt], err => {
      if (err) console.error(err);
      resolve();
    });
  });
};
module.exports = {
  logFailedLoginAttempt
};