const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const pool = require("../database/db");
const generateToken = require("../utils/helpers");
const userService = require("../service/user.service");
const asyncHandler = require("express-async-handler");
const axios = require("axios");

const userSignUp = asyncHandler(async (req, res) => {
  let { username, password } = req.body;

  const user = await userService.findUserByUsername(username);
  if (user) {
    return res.status(400).json({ error: "User already exists" });
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  password = hashedPassword;

  const result = await userService.createNewUser(username, password);
  const createNewUser = await userService.findUserById(result.insertId);

  delete createNewUser.password;
  delete createNewUser.balance;

  return res.status(200).json({
    message: "Signup successful",
    userId: result.insertId,
    new_user: createNewUser,
  });
});

const userLogin = asyncHandler(async (req, res) => {
  const { username, password } = req.body;

  try {
    const user = await userService.findUserByUsername(username);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Compare password with hashed password
    //                                           req.body vs db
    const isPasswordMatch = await bcrypt.compare(password, user.password);
    if (!isPasswordMatch) {
      return res.status(401).json({ error: "Invalid credentails" });
    }
    let payload = { username: user.username, id: user.id };
    let accessToken = generateToken(payload);

    res.cookie("jwt", accessToken, {
      httpOnly: true,
      maxAge: 1000 * 60 * 60 * 24 * 7, // 1 week
    });

    return res.status(200).json({ message: "Login successful", accessToken });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

const userDeposit = async (req, res) => {
  //    recipientid
  const { username, amount } = req.body;

  try {
    // Start transaction
    await pool.query("START TRANSACTION");

    // check if amount is less than or equal to 1
    if (amount <= 1) {
      await pool.query("ROLLBACK");
      return res.status(400).json({ error: "Amount must be greater than 1" });
    }
    // check if amount is NaN
    if (isNaN(amount)) {
      await pool.query("ROLLBACK");
      return res.status(400).json({ error: "Invalid amount" });
    }

    // Retrieve user data from the database
    const [user] = await pool.query("SELECT * FROM users WHERE username = ?", [
      username,
    ]);

    if (!user[0]) {
      await pool.query("ROLLBACK");
      return res.status(401).json({ error: "User not found" });
    }

    // check if user has enough balance
    // if (user[0].balance < amount) {
    //   await pool.query("ROLLBACK");
    //   return res.status(401).json({ error: "Insufficient balance" });
    // }

    // deposit money using flutterwave
    let flutterwave = await axios.post(
      "https://api.flutterwave.com/v3/charges?type=ussd",
      {
        amount: 100,
        currency: "NGN",
        card_number: 5399670123490229,
        cvv: 123,
        expiry_month: 1,
        expiry_year: 21,
        email: "testty@yopmail.com",
        tx_ref: "MC-3243e",
        account_bank: "044",
        account_number: "0690000031",
        narration: "Funding wallet",
        fullname: "Olawale Mustapha",
        phone_number: "0902620185",
        tx_ref: `MC-${Math.floor(Math.random() * 1000000000)}`,
        flw_ref: "FLW275389391",
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.FLUTTERWAVE_SECRET_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );

    console.log(flutterwave.data);
    let tx_ref = flutterwave.data.data.tx_ref;
    let flw_ref = flutterwave.data.data.flw_ref;
    let otp = "12345";
    console.log(tx_ref, otp);

    if (!flutterwave.data.status === "success") {
      await pool.query("ROLLBACK");
      return res.status(500).json({ error: "Payment failed" });
    }

    // validate charge https://api.flutterwave.com/v3/validate-charge
    // const validateCharge = await axios.post(
    //   "https://api.flutterwave.com/v3/validate-charge",
    //   {
    //     flw_ref: flw_ref,
    //     otp: otp,
    //   },
    //   {
    //     headers: {
    //       Authorization: `Bearer ${process.env.FLUTTERWAVE_SECRET_KEY}`,
    //       "Content-Type": "application/json",
    //     },
    //   }
    // );

    // console.log(validateCharge.data);

    // Update user's balance
    const convertAmount = +amount;
    // add amount to balance and update
    await pool.query("UPDATE users SET balance = balance + ? WHERE id = ?", [
      convertAmount,
      user[0].id,
    ]);

    // save transaction
    await pool.query(
      "INSERT INTO transactions (user_id, amount) VALUES (?, ?)",
      [user[0].id, convertAmount]
    );

    // Commit transaction
    await pool.query("COMMIT");
    return res.status(200).json({ message: "Deposit successful" });
  } catch (err) {
    await pool.query("ROLLBACK");
    console.error(err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

const withdrawMoney = async (req, res) => {
  const { username, amount } = req.body;

  try {
    // Start transaction
    await pool.query("START TRANSACTION");

    // Retrieve user data from the database
    const [user] = await pool.query("SELECT * FROM users WHERE username = ?", [
      username,
    ]);
    if (!user[0]) {
      await pool.query("ROLLBACK");
      return res.status(401).json({ error: "User not found" });
    }

    // Update user's balance
    const convertAmount = +amount;
    // save transaction and pass type as withdrawal
    await pool.query(
      "INSERT INTO transactions (user_id, amount, type) VALUES (?, ?, ?)",
      [user[0].id, convertAmount, "withdrawal"]
    );

    // update the balance in the user table
    await pool.query("UPDATE users SET balance = balance - ? WHERE id = ?", [
      convertAmount,
      user[0].id,
    ]);
    // Commit transaction
    await pool.query("COMMIT");
    return res.status(200).json({ message: "Withdraw successful" });
  } catch (err) {
    await pool.query("ROLLBACK");
    console.error(err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

module.exports = {
  userSignUp,
  userLogin,
  userDeposit,
  withdrawMoney,
};
