import { Router } from "express";
import { signupSchema, signinSchema } from "../validations/user.js";
import { User } from "../models/user.js";
import bcrypt from "bcrypt";
import { Account } from "../models/account.js";
import jwt from "jsonwebtoken";
import { auth } from "../middleware/auth.js";

const router = Router();

/* =========================================================
   SIGNUP
========================================================= */

router.post("/signup", async (req, res) => {
  try {
    const result = signupSchema.safeParse(req.body);

    if (!result.success) {
      return res.status(400).json({
        message: "Incorrect inputs",
      });
    }

    const {
      firstName,
      lastName,
      username,
      password,
    } = result.data;

    const existingUser = await User.findOne({
      username,
    });

    if (existingUser) {
      return res.status(409).json({
        message: "User already exists",
      });
    }

    const hashedPassword = await bcrypt.hash(
      password,
      10
    );

    const user = await User.create({
      firstName,
      lastName,
      username,
      password: hashedPassword,
    });

    await Account.create({
      userId: user._id,
      balance: 10000,
    });

    const token = jwt.sign(
      {
        userId: user._id,
      },
      process.env.JWT_SECRET!,
      {
        expiresIn: "7d",
      }
    );

    return res.status(201).json({
      message: "User created successfully",
      token,
    });
  } catch (error) {
    console.error("Signup error:", error);

    return res.status(500).json({
      message: "Internal server error",
    });
  }
});

/* =========================================================
   SIGNIN
========================================================= */

router.post("/signin", async (req, res) => {
  try {
    const result = signinSchema.safeParse(req.body);

    if (!result.success) {
      return res.status(400).json({
        message: "Incorrect input",
      });
    }

    const { username, password } = result.data;

    const user = await User.findOne({
      username,
    });

    if (!user) {
      return res.status(401).json({
        message: "Invalid username or password",
      });
    }

    const isMatch = await bcrypt.compare(
      password,
      user.password
    );

    if (!isMatch) {
      return res.status(401).json({
        message: "Invalid username or password",
      });
    }

    const token = jwt.sign(
      {
        userId: user._id,
      },
      process.env.JWT_SECRET!,
      {
        expiresIn: "7d",
      }
    );

    return res.status(200).json({
      message: "Sign in successful",
      token,
    });
  } catch (error) {
    console.error("Signin error:", error);

    return res.status(500).json({
      message: "Internal server error",
    });
  }
});

/* =========================================================
   SEARCH USERS
========================================================= */

router.get("/bulk", auth, async (req, res) => {
  try {
    const filter = String(
      req.query.filter || ""
    ).trim();

    if (!filter) {
      return res.status(400).json({
        message: "Search filter is required",
      });
    }

    const users = await User.find(
      {
        _id: {
          $ne: req.userId,
        },

        $or: [
          {
            firstName: {
              $regex: filter,
              $options: "i",
            },
          },
          {
            lastName: {
              $regex: filter,
              $options: "i",
            },
          },
        ],
      },
      {
        firstName: 1,
        lastName: 1,
        _id: 1,
      }
    );

    return res.json({
      users,
    });
  } catch (error) {
    console.error("User search error:", error);

    return res.status(500).json({
      message: "Internal server error",
    });
  }
});

/* =========================================================
   CURRENT USER
========================================================= */

router.get("/me", auth, async (req, res) => {
  try {
    const user = await User.findById(
      req.userId
    ).select(
      "firstName lastName username"
    );

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    return res.json(user);
  } catch (error) {
    console.error("Fetch user error:", error);

    return res.status(500).json({
      message: "Internal server error",
    });
  }
});

export default router;