require('dotenv').config();
const bcrypt = require('bcryptjs');
const { MongoClient } = require('mongodb');

async function createAdmin() {
  const client = new MongoClient(process.env.MONGO_URI);
  
  try {
    await client.connect();
    console.log('Connected to MongoDB');
    
    const db = client.db('test');
    const users = db.collection('users');
    
    // Verificar si ya existe
    const existingAdmin = await users.findOne({ email: 'aalvarez351@gmail.com' });
    if (existingAdmin) {
      console.log('Admin user already exists');
      return;
    }
    
    // Crear hash de la contraseña
    const hashedPassword = await bcrypt.hash('Lentesdesol*', 10);
    
    // Insertar usuario admin
    const result = await users.insertOne({
      email: 'aalvarez351@gmail.com',
      password: hashedPassword,
      role: 'admin',
      name: 'Admin User'
    });
    
    console.log('Admin user created successfully:', result.insertedId);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.close();
  }
}

createAdmin();