const pool = require("../database/db");

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
  findUserById: async (id) => {
    const [user] = await pool.query("SELECT * FROM users WHERE id = ?", [id]);
    return user[0];
  },
};

module.exports = userService;
