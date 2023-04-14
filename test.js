// Import dependencies
const express = require("express");
const { PrismaClient } = require("@prisma/client");

// Create an instance of Express
const app = express();
app.use(express.json());

// Create a Prisma client instance
const prisma = new PrismaClient();

// Define a route for creating a new user with a transaction
app.post("/users", async (req, res) => {
  // Start a Prisma transaction
  const transaction = await prisma.$transaction;

  try {
    // Extract user data from request body
    const { name, age, email } = req.body;

    // Create a new user
    const newUser = await prisma.user.create({
      data: {
        name,
        age,
        email,
      },
      // Pass the transaction instance to the create method
      transaction,
    });

    // Update the user's age
    await prisma.user.update({
      where: { id: newUser.id },
      data: { age: newUser.age + 1 },
      // Pass the transaction instance to the update method
      transaction,
    });

    // Commit the transaction
    await prisma.$transaction.commit();

    // Send success response
    res.status(201).json({ message: "User created successfully" });
  } catch (error) {
    // Rollback the transaction in case of error
    await prisma.$transaction.rollback();
    // Send error response
    res.status(500).json({ error: "Failed to create user" });
  } finally {
    // Disconnect Prisma client
    await prisma.$disconnect();
  }
});

// Start the Express server
const port = 3000;
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
