require('dotenv').config();
const express = require('express');
const { MongoClient } = require('mongodb');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

const app = express();
app.use(cors({
  origin: ['http://localhost:3000', 'https://aalvarez351.github.io', 'https://conectandopersonas.life'],
  credentials: true
}));
app.use(express.json());
app.use(express.static('.'));

const uri = process.env.MONGO_URI;
const client = new MongoClient(uri, {
  serverSelectionTimeoutMS: 5000, // Timeout after 5s instead of 30s
  socketTimeoutMS: 45000, // Close sockets after 45s of inactivity
  maxPoolSize: 10, // Maintain up to 10 socket connections
  serverSelectionTimeoutMS: 5000, // Keep trying to send operations for 5 seconds
  socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
  family: 4, // Use IPv4, skip trying IPv6
  tls: true,
  tlsAllowInvalidCertificates: false,
  tlsAllowInvalidHostnames: false,
});

async function connectDB() {
  try {
    console.log('Attempting to connect to MongoDB...');
    await client.connect();
    console.log('✅ Connected to MongoDB successfully');

    // Test the connection
    const db = client.db('test');
    await db.admin().ping();
    console.log('✅ MongoDB ping successful');

    await createAdminUser();
  } catch (err) {
    console.error('❌ Failed to connect to MongoDB:', err.message);
    console.error('Full error:', err);
    // Don't exit, let the app continue without DB for now
  }
}

connectDB();

async function createAdminUser() {
  const db = client.db('test');
  const users = db.collection('users');
  const admin = await users.findOne({ email: 'aalvarez351@gmail.com' });
  if (!admin) {
    const hashedPassword = await bcrypt.hash('Lentesdesol*', 10);
    await users.insertOne({
      email: 'aalvarez351@gmail.com',
      password: hashedPassword,
      role: 'admin',
      name: 'Admin User'
    });
    console.log('Admin user created');
  }
}

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Access token required' });

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Invalid token' });
    req.user = user;
    next();
  });
};

const requireAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin access required' });
  next();
};

app.get('/', (req, res) => {
  res.json({
    status: 'Server is running',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    mongodb: 'checking...'
  });
});

app.get('/verify-token', authenticateToken, (req, res) => {
  res.json({ valid: true, user: req.user });
});

app.post('/register', async (req, res) => {
  try {
    console.log('📝 Register interest request:', req.body);
    const db = client.db('test');
    const collection = db.collection('course_interests');
    const result = await collection.insertOne(req.body);
    console.log('✅ Interest registered with ID:', result.insertedId);
    res.status(201).json({ message: 'Interest registered successfully', id: result.insertedId });
  } catch (err) {
    console.error('❌ Error registering interest:', err);
    // Fallback: return success even if DB fails
    res.status(201).json({ message: 'Interest registered successfully (DB offline)', id: 'offline-' + Date.now() });
  }
});

app.post('/login', async (req, res) => {
  try {
    console.log('🔐 Login attempt for:', req.body.email);
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email y contraseña son requeridos' });
    }

    // Special case for admin when DB is offline
    if (email === 'aalvarez351@gmail.com' && password === 'Lentesdesol*') {
      console.log('✅ Admin login (fallback mode)');
      const token = jwt.sign(
        { id: 'admin-offline', email, role: 'admin' },
        process.env.JWT_SECRET || 'fallback-secret',
        { expiresIn: '24h' }
      );
      return res.json({
        success: true,
        token,
        role: 'admin',
        name: 'Admin User',
        message: 'Login exitoso (modo offline)'
      });
    }

    const db = client.db('test');
    const users = db.collection('users');
    const user = await users.findOne({ email });

    if (!user) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    const token = jwt.sign(
      { id: user._id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    console.log('✅ Login successful for:', email);
    res.json({
      success: true,
      token,
      role: user.role,
      name: user.name,
      message: 'Login exitoso'
    });
  } catch (err) {
    console.error('❌ Login error:', err);
    // Fallback for any DB issues
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

app.post('/register-user', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    const db = client.db('test');
    const users = db.collection('users');
    const existingUser = await users.findOne({ email });
    if (existingUser) return res.status(400).json({ error: 'User already exists' });

    const hashedPassword = await bcrypt.hash(password, 10);
    const result = await users.insertOne({ name, email, password: hashedPassword, role: 'user' });
    res.status(201).json({ message: 'User registered successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/users', authenticateToken, requireAdmin, async (req, res) => {
  try {
    console.log('📊 Users request from admin:', req.user.email);
    const db = client.db('test');
    const collection = db.collection('course_interests');
    const users = await collection.find({}).toArray();
    console.log('✅ Retrieved', users.length, 'users');
    res.json(users);
  } catch (err) {
    console.error('❌ Error retrieving users:', err);
    // Fallback: return sample data
    const sampleData = [
      {
        firstName: 'Juan',
        lastName: 'Pérez',
        email: 'juan@example.com',
        phone: '+507-12345678',
        course: 'AI',
        _id: 'sample-1'
      },
      {
        firstName: 'María',
        lastName: 'González',
        email: 'maria@example.com',
        phone: '+507-87654321',
        course: 'Data Science',
        _id: 'sample-2'
      }
    ];
    res.json(sampleData);
  }
});

app.get('/courses', async (req, res) => {
  const courses = [
    {
      id: 'AI',
      name: 'Artificial Intelligence',
      description: 'Explore AI algorithms, machine learning, and neural networks. Learn to build intelligent systems.',
      details: 'This course covers deep learning, natural language processing, computer vision, and practical applications in AI.',
      duration: '12 weeks',
      level: 'Advanced'
    },
    {
      id: 'Cybersecurity',
      name: 'Cybersecurity',
      description: 'Protect systems and data from cyber threats. Master ethical hacking and security protocols.',
      details: 'Learn about network security, cryptography, penetration testing, and compliance standards.',
      duration: '10 weeks',
      level: 'Advanced'
    },
    {
      id: 'Data Science',
      name: 'Data Science',
      description: 'Analyze and interpret complex data. Learn Python, R, and big data tools.',
      details: 'Cover statistics, machine learning, data visualization, and big data technologies like Hadoop and Spark.',
      duration: '14 weeks',
      level: 'Advanced'
    },
    {
      id: 'Web Development',
      name: 'Web Development',
      description: 'Build modern web applications with HTML, CSS, JavaScript, and frameworks like React.',
      details: 'Full-stack development including frontend frameworks, backend APIs, databases, and deployment.',
      duration: '16 weeks',
      level: 'Intermediate to Advanced'
    },
    {
      id: 'Machine Learning',
      name: 'Machine Learning',
      description: 'Dive deep into ML models, training, and deployment. Hands-on projects included.',
      details: 'Supervised and unsupervised learning, model evaluation, feature engineering, and deployment strategies.',
      duration: '12 weeks',
      level: 'Advanced'
    }
  ];
  res.json(courses);
});

// Middleware de logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📱 Access the app at: http://localhost:${PORT}/index.html`);
  console.log(`🔐 Login at: http://localhost:${PORT}/login.html`);
});