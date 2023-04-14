const router = require("express").Router();

const {
  userSignUp,
  userLogin,
  userDeposit,
  withdrawMoney,
} = require("../controllers/user.controller");
const isAuth = require("../middleware/auth");

// Signup endpoint
router.post("/signup", userSignUp);
// Login endpoint
router.post("/login", userLogin);

// Deposit endpoint
router.post("/deposit", isAuth, userDeposit);

// Withdraw endpoint
router.post("/withdraw", withdrawMoney);

module.exports = router;
