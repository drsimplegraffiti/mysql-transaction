// Import required packages
const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const pool = require("./db");

// Create Express app
const app = express();
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

const userService = {
  createNewUser: async (username, password) => {
    const [result] = await pool.query(
      "INSERT INTO users (username, password) VALUES (?, ?) ",
      [username, password]
    );
    return result;
  },
  findUserByUsername: async (username) => {
    const [user] = await pool.query("SELECT * FROM users WHERE username = ?", [
      username,
    ]);
    return user[0];
  },
  loginUser: async (username, password) => {
    const [user] = await pool.query("SELECT * FROM users WHERE username = ?", [
      username,
    ]);
    if (!user[0]) {
      return { error: "Invalid username or password" };
    }

    // Compare password with hashed password
    const isPasswordMatch = await bcrypt.compare(password, user[0].password);
    if (!isPasswordMatch) {
      return { error: "Invalid username or password" };
    }

    return user[0];
  },
};

// Signup endpoint
app.post("/signup", async (req, res) => {
  let { username, password } = req.body;

  try {
    const user = await userService.findUserByUsername(username);
    if (user) {
      return res.status(400).json({ error: "User already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    password = hashedPassword;
    const result = await userService.createNewUser(username, password);
    return res
      .status(200)
      .json({ message: "Signup successful", userId: result.insertId });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal Server Error" + err });
  }
});

// Login endpoint
app.post("/login", async (req, res) => {
  const { username, password } = req.body;

  try {
    const user = await userService.findUserByUsername(username);
    if (!user) {
      return res.status(401).json({ error: "User not found" });
    }

    // Compare password with hashed password
    const isPasswordMatch = await bcrypt.compare(password, user.password);
    if (!isPasswordMatch) {
      return res.status(401).json({ error: "Invalid username or password" });
    }

    // Generate JWT token
    const accessToken = jwt.sign(
      { username: user.username, id: user.id },
      "oiuytrertyuio",
      { expiresIn: "1h" }
    );

    return res.status(200).json({ message: "Login successful", accessToken });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

const isAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ error: "No authorization header" });
  }

  const token = authHeader.split(" ")[1];
  if (!token) {
    return res.status(401).json({ error: "No token found" });
  }

  try {
    const decoded = jwt.verify(token, "oiuytrertyuio");
    if (!decoded) {
      return res.status(401).json({ error: "Invalid token" });
    }
    req.user = decoded;
    next();
  } catch (err) {
    console.error(err);
    return res.status(403).json({ error: "Invalid token" });
  }
};

// Deposit endpoint
app.post("/deposit", isAuth, async (req, res) => {
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
});

// Withdraw endpoint
app.post("/withdraw", async (req, res) => {
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
        )

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
});

// Set the app to listen on port 3000
app.listen(3000, () => {
  console.log("Server is running on port 3000");
});
