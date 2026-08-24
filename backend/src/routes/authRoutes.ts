import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import { Role } from '../types/enums.js';
import { JWT_ACCESS_SECRET, JWT_REFRESH_SECRET, ACCESS_TOKEN_EXPIRY, REFRESH_TOKEN_EXPIRY } from '../config/jwt.js';
import { requireAuth, AuthenticatedRequest } from '../middleware/authMiddleware.js';
import { NotificationService } from '../services/notificationService.js';
import { z } from 'zod';

export function createAuthRouter(prisma: PrismaClient, notificationService?: NotificationService): Router {
  const router = Router();

  const registerSchema = z.object({
    name: z.string().min(2, 'Name must be at least 2 characters'),
    email: z.string().email('Invalid email address'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
    phone: z.string().optional(),
  });

  const loginSchema = z.object({
    email: z.string().email('Invalid email address'),
    password: z.string().min(1, 'Password is required'),
  });

  const forgotPasswordSchema = z.object({
    email: z.string().email('Invalid email address'),
  });

  const resetPasswordSchema = z.object({
    token: z.string().min(1, 'Reset token is required'),
    newPassword: z.string().min(6, 'New password must be at least 6 characters'),
  });

  // POST /api/auth/register (Customer registration)
  router.post('/register', async (req: Request, res: Response) => {
    try {
      const body = registerSchema.parse(req.body);
      const existingUser = await prisma.user.findUnique({ where: { email: body.email } });
      if (existingUser) {
        return res.status(400).json({ error: 'User with this email already exists' });
      }

      const passwordHash = await bcrypt.hash(body.password, 12);
      const user = await prisma.user.create({
        data: {
          name: body.name,
          email: body.email,
          passwordHash,
          role: Role.CUSTOMER,
          phone: body.phone,
        },
      });

      const accessToken = jwt.sign(
        { id: user.id, email: user.email, role: user.role, name: user.name },
        JWT_ACCESS_SECRET,
        { expiresIn: ACCESS_TOKEN_EXPIRY }
      );

      const refreshToken = jwt.sign(
        { id: user.id },
        JWT_REFRESH_SECRET,
        { expiresIn: REFRESH_TOKEN_EXPIRY }
      );

      res.cookie('refreshToken', refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });

      return res.status(201).json({
        message: 'Registration successful',
        accessToken,
        user: { id: user.id, name: user.name, email: user.email, role: user.role, phone: user.phone },
      });
    } catch (err: any) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ error: err.errors[0].message });
      }
      return res.status(500).json({ error: err.message || 'Registration failed' });
    }
  });

  // POST /api/auth/login
  router.post('/login', async (req: Request, res: Response) => {
    try {
      const body = loginSchema.parse(req.body);
      const inputStr = body.email.trim();

      const user = await prisma.user.findFirst({
        where: {
          OR: [
            { email: inputStr.toLowerCase() },
            { name: inputStr },
          ],
        },
        include: { agentProfile: true },
      });

      if (!user) {
        return res.status(401).json({ error: 'Invalid email or password' });
      }

      const isMatch = await bcrypt.compare(body.password, user.passwordHash);
      if (!isMatch) {
        return res.status(401).json({ error: 'Invalid email or password' });
      }

      const payload = {
        id: user.id,
        email: user.email,
        role: user.role,
        name: user.name,
        agentProfileId: user.agentProfile?.id,
      };

      const accessToken = jwt.sign(payload, JWT_ACCESS_SECRET, { expiresIn: ACCESS_TOKEN_EXPIRY });
      const refreshToken = jwt.sign({ id: user.id }, JWT_REFRESH_SECRET, { expiresIn: REFRESH_TOKEN_EXPIRY });

      res.cookie('refreshToken', refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });

      return res.json({
        accessToken,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          phone: user.phone,
          agentProfileId: user.agentProfile?.id,
        },
      });
    } catch (err: any) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ error: err.errors[0].message });
      }
      return res.status(500).json({ error: err.message || 'Login failed' });
    }
  });

  // POST /api/auth/forgot-password
  router.post('/forgot-password', async (req: Request, res: Response) => {
    try {
      const { email } = forgotPasswordSchema.parse(req.body);
      const user = await prisma.user.findUnique({ where: { email } });

      if (user) {
        // Generate reset token valid for 1 hour
        const resetToken = jwt.sign(
          { id: user.id, email: user.email, purpose: 'PASSWORD_RESET' },
          JWT_ACCESS_SECRET,
          { expiresIn: '1h' }
        );

        const resetLink = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password?token=${resetToken}`;

        if (notificationService) {
          await notificationService.send({
            orderId: 'PASSWORD_RESET',
            recipientEmail: user.email,
            event: 'STATUS_CHANGE',
            status: 'PASSWORD_RESET_REQUESTED',
            details: `Click link to reset your account password: ${resetLink}`,
          });
        }

        console.log(`[ForgotPassword] Password reset token generated for ${user.email}: ${resetLink}`);

        return res.json({
          message: 'If an account with that email exists, a password reset link has been generated.',
          resetLink, // returned in JSON for easy local demo testing!
        });
      }

      return res.json({
        message: 'If an account with that email exists, a password reset link has been generated.',
      });
    } catch (err: any) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ error: err.errors[0].message });
      }
      return res.status(500).json({ error: err.message || 'Forgot password request failed' });
    }
  });

  // POST /api/auth/reset-password
  router.post('/reset-password', async (req: Request, res: Response) => {
    try {
      const { token, newPassword } = resetPasswordSchema.parse(req.body);

      let decoded: any;
      try {
        decoded = jwt.verify(token, JWT_ACCESS_SECRET);
      } catch (err) {
        return res.status(400).json({ error: 'Invalid or expired password reset link.' });
      }

      if (decoded.purpose !== 'PASSWORD_RESET') {
        return res.status(400).json({ error: 'Invalid password reset token token purpose.' });
      }

      const user = await prisma.user.findUnique({ where: { id: decoded.id } });
      if (!user) {
        return res.status(404).json({ error: 'User account not found.' });
      }

      const passwordHash = await bcrypt.hash(newPassword, 12);
      await prisma.user.update({
        where: { id: user.id },
        data: { passwordHash },
      });

      return res.json({ message: 'Password has been successfully reset. You can now log in.' });
    } catch (err: any) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ error: err.errors[0].message });
      }
      return res.status(500).json({ error: err.message || 'Password reset failed' });
    }
  });

  // POST /api/auth/refresh
  router.post('/refresh', async (req: Request, res: Response) => {
    const refreshToken = req.cookies?.refreshToken || req.body?.refreshToken;
    if (!refreshToken) {
      return res.status(401).json({ error: 'Refresh token missing' });
    }

    try {
      const decoded = jwt.verify(refreshToken, JWT_REFRESH_SECRET) as { id: string };
      const user = await prisma.user.findUnique({
        where: { id: decoded.id },
        include: { agentProfile: true },
      });

      if (!user) {
        return res.status(401).json({ error: 'User not found' });
      }

      const accessToken = jwt.sign(
        {
          id: user.id,
          email: user.email,
          role: user.role,
          name: user.name,
          agentProfileId: user.agentProfile?.id,
        },
        JWT_ACCESS_SECRET,
        { expiresIn: ACCESS_TOKEN_EXPIRY }
      );

      return res.json({ accessToken });
    } catch (err) {
      return res.status(401).json({ error: 'Invalid or expired refresh token' });
    }
  });

  // POST /api/auth/logout
  router.post('/logout', (req: Request, res: Response) => {
    res.clearCookie('refreshToken');
    return res.json({ message: 'Logged out successfully' });
  });

  // GET /api/auth/me
  router.get('/me', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const user = await prisma.user.findUnique({
        where: { id: req.user!.id },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          phone: true,
          createdAt: true,
          agentProfile: {
            select: {
              id: true,
              zoneId: true,
              availability: true,
              currentLat: true,
              currentLng: true,
              zone: { select: { id: true, name: true } },
            },
          },
        },
      });

      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      return res.json({ user });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  return router;
}
