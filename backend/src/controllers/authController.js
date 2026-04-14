import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import db from '../config/database.js';
import { v4 as uuidv4 } from 'uuid';

const JWT_SECRET = process.env.JWT_SECRET || 'smarteye_fallback_secret';

const generateToken = (user) => {
  return jwt.sign(
    { id: user._id, email: user.email, role: user.role, name: user.name },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
};

export const register = async (req, res) => {
  try {
    const { name, email, password, role = 'citizen', phone, department } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required.' });
    }

    const existing = await db.users.findOne({ email: email.toLowerCase() });
    if (existing) {
      return res.status(409).json({ error: 'Email already registered.' });
    }

    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash(password, salt);

    const user = await db.users.insert({
      _id: uuidv4(),
      name,
      email: email.toLowerCase(),
      password: hashedPassword,
      role: ['citizen', 'admin', 'worker'].includes(role) ? role : 'citizen',
      phone: phone || '',
      department: department || '',
      avatar: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name)}`,
      points: 0,
      createdAt: new Date().toISOString()
    });

    const token = generateToken(user);

    res.status(201).json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatar: user.avatar,
        points: user.points
      }
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ error: 'Registration failed.' });
  }
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const user = await db.users.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const token = generateToken(user);

    res.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatar: user.avatar,
        points: user.points,
        department: user.department
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed.' });
  }
};

export const getMe = async (req, res) => {
  try {
    const user = await db.users.findOne({ _id: req.user.id });
    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    res.json({
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      avatar: user.avatar,
      points: user.points,
      phone: user.phone,
      department: user.department,
      createdAt: user.createdAt
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch user.' });
  }
};

export const getUsers = async (req, res) => {
  try {
    const { role } = req.query;
    const query = role ? { role } : {};
    const users = await db.users.find(query);
    
    res.json(users.map(u => ({
      id: u._id,
      name: u.name,
      email: u.email,
      role: u.role,
      avatar: u.avatar,
      department: u.department,
      points: u.points,
      createdAt: u.createdAt
    })));
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch users.' });
  }
};
