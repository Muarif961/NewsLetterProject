import passport from "passport";
import { IVerifyOptions, Strategy as LocalStrategy } from "passport-local";
import { type Express, Request, Response, NextFunction } from "express";
import session from "express-session";
import createMemoryStore from "memorystore";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { users, insertUserSchema, type User as SelectUser, appsumo_codes, user_subscriptions, user_redeemed_codes, user_credits } from "./db/schema";
import { db } from "./db/index";
import { eq, or, and, inArray } from "drizzle-orm";
import nodemailer from "nodemailer";
import { z } from "zod";
import { AI_CREDITS, SUBSCRIBER_LIMITS } from "./lib/subscription-tracker";

const scryptAsync = promisify(scrypt);
const crypto = {
  hash: async (password: string) => {
    const salt = randomBytes(16).toString("hex");
    const buf = (await scryptAsync(password, salt, 64)) as Buffer;
    return `${buf.toString("hex")}.${salt}`;
  },
  compare: async (suppliedPassword: string, storedPassword: string) => {
    const [hashedPassword, salt] = storedPassword.split(".");
    const hashedPasswordBuf = Buffer.from(hashedPassword, "hex");
    const suppliedPasswordBuf = (await scryptAsync(
      suppliedPassword,
      salt,
      64,
    )) as Buffer;
    return timingSafeEqual(hashedPasswordBuf, suppliedPasswordBuf);
  },
  generateToken: () => randomBytes(32).toString("hex"),
};

declare global {
  namespace Express {
    interface User extends SelectUser {}
  }
}

const requireAuth = (req: Request, res: Response, next: NextFunction) => {
  if (!req.isAuthenticated() || !req.user) {
    return res.status(401).json({
      success: false,
      message: "Authentication required. Please log in.",
    });
  }
  next();
};

const loginSchema = z.object({
  username: z.string().min(1, "Username or email is required"),
  password: z.string().min(1, "Password is required"),
});

export function setupAuth(app: Express) {
  const MemoryStore = createMemoryStore(session);
  const sessionSettings: session.SessionOptions = {
    secret: process.env.REPL_ID || "porygon-supremacy",
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: app.get("env") === "production",
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      sameSite: "lax",
    },
    store: new MemoryStore({
      checkPeriod: 86400000, // prune expired entries every 24h
    }),
  };

  if (app.get("env") === "production") {
    app.set("trust proxy", 1);
  }

  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy(
      {
        usernameField: "username", // Can be either username or email
      },
      async (username, password, done) => {
        try {
          const [user] = await db
            .select()
            .from(users)
            .where(or(eq(users.username, username), eq(users.email, username)))
            .limit(1);

          if (!user) {
            return done(null, false, { message: "Incorrect username or email." });
          }
          const isMatch = await crypto.compare(password, user.password);
          if (!isMatch) {
            return done(null, false, { message: "Incorrect password." });
          }
          return done(null, user);
        } catch (err) {
          return done(err);
        }
      },
    ),
  );

  passport.serializeUser((user, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id: number, done) => {
    try {
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, id))
        .limit(1);
      done(null, user);
    } catch (err) {
      done(err);
    }
  });

  app.post("/register", async (req, res, next) => {
    try {
      const result = insertUserSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ 
          message: "Invalid input", 
          errors: result.error.flatten() 
        });
      }

      const { username, email, password, fullName, appSumoCodes } = result.data;

      const registrationResult = await db.transaction(async (tx) => {
        const [existingUser] = await tx
          .select()
          .from(users)
          .where(or(eq(users.username, username), eq(users.email, email)))
          .limit(1);

        if (existingUser) {
          throw new Error(existingUser.username === username ? 
            "Username already exists" : 
            "Email already registered");
        }

        const hashedPassword = await crypto.hash(password);
        const [newUser] = await tx
          .insert(users)
          .values({
            username,
            email,
            password: hashedPassword,
            fullName,
          })
          .returning();

        // Trim and normalize codes
        const normalizedCodes = appSumoCodes.map(code => code.trim());
        console.log('[AppSumo] Checking codes:', normalizedCodes);

        const codes = await tx
          .select()
          .from(appsumo_codes)
          .where(
            and(
              inArray(appsumo_codes.code, normalizedCodes),
              eq(appsumo_codes.isRedeemed, false)
            )
          );

        console.log('[AppSumo] Found codes:', codes.length, 'Expected:', appSumoCodes.length);
        
        if (codes.length === 0) {
          throw new Error("No valid AppSumo codes found");
        }
        
        if (codes.length !== appSumoCodes.length) {
          const validCodes = codes.map(c => c.code);
          const invalidCodes = appSumoCodes.filter(code => !validCodes.includes(code));
          throw new Error(`Invalid or already redeemed codes: ${invalidCodes.join(', ')}`);
        }

        await tx
          .update(appsumo_codes)
          .set({ 
            isRedeemed: true,
            redeemedAt: new Date(),
            redeemedBy: newUser.id 
          })
          .where(inArray(appsumo_codes.id, codes.map(c => c.id)));

        const tier = codes.length === 3 ? 'professional' : 
                    codes.length === 2 ? 'growth' : 'starter';

        const initialAiCredits = AI_CREDITS[tier as keyof typeof AI_CREDITS];
        const subscriberLimit = SUBSCRIBER_LIMITS[tier as keyof typeof SUBSCRIBER_LIMITS];

        const [subscription] = await tx
          .insert(user_subscriptions)
          .values({
            userId: newUser.id,
            tier,
            totalCodesRedeemed: codes.length,
            status: 'active',
            provider: 'appsumo',
            activatedAt: new Date(),
            updatedAt: new Date(),
            initialAiCredits,
            subscriberLimit
          })
          .returning();

        // Initialize user credits
        await tx
          .insert(user_credits)
          .values({
            userId: newUser.id,
            totalCreditsAllocated: initialAiCredits,
            creditsRemaining: initialAiCredits,
            lastUpdated: new Date()
          });

        await tx
          .insert(user_redeemed_codes)
          .values(
            codes.map(code => ({
              userId: newUser.id,
              codeId: code.id,
              redeemedAt: new Date()
            }))
          );

        return { user: newUser, subscription };
      });

      req.login(registrationResult.user, (err) => {
        if (err) {
          return next(err);
        }
        return res.json({
          message: "Registration successful",
          user: registrationResult.user
        });
      });

    } catch (error: any) {
      console.error("Registration error:", error);
      return res.status(400).json({ 
        message: error.message || "Registration failed"
      });
    }
  });


  app.post("/forgot-password", async (req, res) => {
    try {
      const { email } = req.body;
      if (!email) {
        return res.status(400).json({ message: "Email is required" });
      }

      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.email, email))
        .limit(1);

      if (!user) {
        return res.status(404).json({ message: "No account found with that email" });
      }

      const resetToken = crypto.generateToken();
      const resetExpires = new Date(Date.now() + 3600000); // 1 hour

      await db
        .update(users)
        .set({
          resetPasswordToken: resetToken,
          resetPasswordExpires: resetExpires,
        })
        .where(eq(users.id, user.id));

      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || "587"),
        secure: false, // true for 465, false for other ports
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
        requireTLS: true,
        debug: true, // Enable debug logs
        logger: true, // Enable logger
      });

      try {
        await transporter.verify();
        console.log("SMTP Connection verified successfully");
      } catch (verifyError: any) {
        console.error("SMTP Verification Error:", {
          error: verifyError,
          stack: verifyError.stack,
          code: verifyError.code,
          command: verifyError.command,
          host: process.env.SMTP_HOST,
          port: process.env.SMTP_PORT,
          user: process.env.SMTP_USER ? "Set" : "Not Set",
          pass: process.env.SMTP_PASS ? "Set" : "Not Set",
        });
        throw new Error(`SMTP Verification failed: ${verifyError.message}`);
      }

      const resetUrl = `${req.protocol}://${req.get(
        "host",
      )}/reset-password?token=${resetToken}`;

      const mailOptions = {
        from: `"Password Reset" <${process.env.SMTP_FROM_EMAIL}>`,
        to: user.email,
        subject: "Password Reset Request",
        html: `
          <h1>Password Reset Request</h1>
          <p>You requested a password reset for your account.</p>
          <p>Click the button below to reset your password:</p>
          <a href="${resetUrl}" style="display: inline-block; padding: 10px 20px; background-color: #4F46E5; color: white; text-decoration: none; border-radius: 5px; margin: 10px 0;">Reset Password</a>
          <p>If you didn't request this, you can safely ignore this email.</p>
          <p>This link will expire in 1 hour.</p>
          <p><small>If the button doesn't work, copy and paste this URL into your browser: ${resetUrl}</small></p>
        `,
      };

      try {
        await transporter.sendMail(mailOptions);
        console.log("Password reset email sent successfully");
        res.json({ message: "Password reset email sent" });
      } catch (emailError: any) {
        console.error("Error sending email:", {
          error: emailError,
          stack: emailError.stack,
          code: emailError.code,
          command: emailError.command,
        });
        res.status(500).json({ 
          message: "Error sending password reset email",
          details: emailError.message
        });
      }
    } catch (error: any) {
      console.error("Password reset error:", error);
      res.status(500).json({ 
        message: "Error in password reset process",
        details: error.message
      });
    }
  });

  app.post("/reset-password", async (req, res) => {
    try {
      const { token, password } = req.body;
      if (!token || !password) {
        return res.status(400).json({ message: "Token and password are required" });
      }

      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.resetPasswordToken, token))
        .limit(1);

      if (!user || !user.resetPasswordExpires || user.resetPasswordExpires < new Date()) {
        return res.status(400).json({ message: "Invalid or expired reset token" });
      }

      const hashedPassword = await crypto.hash(password);

      await db
        .update(users)
        .set({
          password: hashedPassword,
          resetPasswordToken: null,
          resetPasswordExpires: null,
        })
        .where(eq(users.id, user.id));

      res.json({ message: "Password has been reset" });
    } catch (error) {
      console.error("Reset password error:", error);
      res.status(500).json({ message: "Error resetting password" });
    }
  });

  app.post("/login", (req, res, next) => {
    const result = loginSchema.safeParse(req.body);
    if (!result.success) {
      return res
        .status(400)
        .json({ message: "Invalid input", errors: result.error.flatten() });
    }

    const cb = (err: any, user: Express.User, info: IVerifyOptions) => {
      if (err) {
        return next(err);
      }
      if (!user) {
        return res.status(400).json({
          message: info.message ?? "Login failed",
        });
      }
      req.logIn(user, (err) => {
        if (err) {
          return next(err);
        }
        return res.json({
          message: "Login successful",
          user: { id: user.id, username: user.username },
        });
      });
    };
    passport.authenticate("local", cb)(req, res, next);
  });

  app.post("/logout", (req, res) => {
    req.logout((err) => {
      if (err) {
        return res.status(500).json({ message: "Logout failed" });
      }
      res.json({ message: "Logout successful" });
    });
  });

  app.get("/api/user", (req, res) => {
    if (req.isAuthenticated()) {
      return res.json(req.user);
    }
    res.status(401).json({ message: "Unauthorized" });
  });

  return { requireAuth };
}

export { requireAuth };