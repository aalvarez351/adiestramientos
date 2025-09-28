const { MongoClient, ObjectId } = require('mongodb');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const uri = process.env.MONGO_URI;
const client = new MongoClient(uri);

async function importSampleData() {
  try {
    await client.connect();
    console.log('✅ Conectado a MongoDB Atlas');

    const db = client.db(process.env.DB_NAME || 'reposeidosdb');
    
    // Datos de muestra para clientes
    const clientesMuestra = [
      {
        nombre: "Carlos",
        apellido: "Moto",
        telefono: "+507-6123-4567",
        email: "carlosmoto@gmail.com",
        direccion: "Calle Principal #123, Ciudad de Panamá",
        tipo: "individual",
        fecha_registro: new Date()
      },
      {
        nombre: "María",
        apellido: "González",
        telefono: "+507-6234-5678",
        email: "maria.gonzalez@gmail.com",
        direccion: "Avenida Central #456, San Miguelito",
        tipo: "individual",
        fecha_registro: new Date()
      },
      {
        nombre: "José",
        apellido: "Rodríguez",
        telefono: "+507-6345-6789",
        email: "jose.rodriguez@gmail.com",
        direccion: "Vía España #789, Panamá",
        tipo: "individual",
        fecha_registro: new Date()
      },
      {
        nombre: "Ana",
        apellido: "López",
        telefono: "+507-6456-7890",
        email: "ana.lopez@gmail.com",
        direccion: "Calle 50 #321, Bella Vista",
        tipo: "individual",
        fecha_registro: new Date()
      }
    ];

    // Insertar clientes
    const clientesCollection = db.collection('clientes');
    const clientesResult = await clientesCollection.insertMany(clientesMuestra);
    console.log(`✅ ${clientesResult.insertedCount} clientes insertados`);
    
    const clienteIds = Object.values(clientesResult.insertedIds);

    // Datos de muestra para préstamos
    const prestamosMuestra = [
      {
        cliente_id: clienteIds[0],
        capital_inicial: 500,
        plazo: 10,
        frecuencia_pago: "15 días",
        tasa_interes: 12,
        condiciones_mora: {
          tasa_mora: "2",
          dias_gracia: "5"
        },
        estado: "activo",
        fecha_creacion: new Date(),
        saldo_actual: 350,
        total_pagado: 150,
        interes_acumulado: 25,
        atraso_acumulado: 0
      },
      {
        cliente_id: clienteIds[1],
        capital_inicial: 1000,
        plazo: 15,
        frecuencia_pago: "15 días",
        tasa_interes: 15,
        condiciones_mora: {
          tasa_mora: "2.5",
          dias_gracia: "3"
        },
        estado: "activo",
        fecha_creacion: new Date(),
        saldo_actual: 800,
        total_pagado: 200,
        interes_acumulado: 45,
        atraso_acumulado: 10
      },
      {
        cliente_id: clienteIds[2],
        capital_inicial: 750,
        plazo: 12,
        frecuencia_pago: "15 días",
        tasa_interes: 18,
        condiciones_mora: {
          tasa_mora: "3",
          dias_gracia: "5"
        },
        estado: "completado",
        fecha_creacion: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 días atrás
        saldo_actual: 0,
        total_pagado: 750,
        interes_acumulado: 120,
        atraso_acumulado: 0
      }
    ];

    // Insertar préstamos
    const prestamosCollection = db.collection('prestamos');
    const prestamosResult = await prestamosCollection.insertMany(prestamosMuestra);
    console.log(`✅ ${prestamosResult.insertedCount} préstamos insertados`);
    
    const prestamoIds = Object.values(prestamosResult.insertedIds);

    // Crear usuario admin para préstamos si no existe
    const usersCollection = db.collection('users');
    const adminExists = await usersCollection.findOne({ email: 'carlosmoto@gmail.com' });
    
    if (!adminExists) {
      const hashedPassword = await bcrypt.hash('carlosmoto1234', 10);
      await usersCollection.insertOne({
        email: 'carlosmoto@gmail.com',
        password: hashedPassword,
        role: 'administradores2',
        name: 'Carlos Moto - Admin Préstamos'
      });
      console.log('✅ Usuario admin de préstamos creado');
    }

    // Datos de muestra para pagos
    const pagosMuestra = [
      {
        prestamo_id: prestamoIds[0],
        fecha: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000), // 15 días atrás
        monto: 75,
        tipo: "pago",
        comprobante: "COMP001",
        registrado_por: clienteIds[0],
        fecha_registro: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000)
      },
      {
        prestamo_id: prestamoIds[0],
        fecha: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 días atrás
        monto: 75,
        tipo: "pago",
        comprobante: "COMP002",
        registrado_por: clienteIds[0],
        fecha_registro: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      },
      {
        prestamo_id: prestamoIds[1],
        fecha: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000), // 10 días atrás
        monto: 100,
        tipo: "pago",
        comprobante: "COMP003",
        registrado_por: clienteIds[1],
        fecha_registro: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000)
      },
      {
        prestamo_id: prestamoIds[1],
        fecha: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 días atrás
        monto: 100,
        tipo: "pago",
        comprobante: "COMP004",
        registrado_por: clienteIds[1],
        fecha_registro: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000)
      },
      {
        prestamo_id: prestamoIds[1],
        fecha: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 días atrás
        monto: 10,
        tipo: "mora",
        comprobante: "MORA001",
        registrado_por: clienteIds[1],
        fecha_registro: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)
      }
    ];

    // Insertar pagos
    const pagosCollection = db.collection('pagos');
    const pagosResult = await pagosCollection.insertMany(pagosMuestra);
    console.log(`✅ ${pagosResult.insertedCount} pagos insertados`);

    // Datos adicionales para cursos
    const cursosMuestra = [
      {
        firstName: "Pedro",
        lastName: "Martínez",
        email: "pedro.martinez@gmail.com",
        phone: "+507-6111-2222",
        course: "Machine Learning"
      },
      {
        firstName: "Laura",
        lastName: "Sánchez",
        email: "laura.sanchez@gmail.com",
        phone: "+507-6333-4444",
        course: "Cybersecurity"
      },
      {
        firstName: "Roberto",
        lastName: "Díaz",
        email: "roberto.diaz@gmail.com",
        phone: "+507-6555-6666",
        course: "Web Development"
      }
    ];

    // Insertar intereses de cursos
    const cursosCollection = db.collection('course_interests');
    const cursosResult = await cursosCollection.insertMany(cursosMuestra);
    console.log(`✅ ${cursosResult.insertedCount} intereses de cursos insertados`);

    console.log('\n🎉 Importación de datos de muestra completada exitosamente!');
    console.log('\n📊 Resumen:');
    console.log(`   - Clientes: ${clientesResult.insertedCount}`);
    console.log(`   - Préstamos: ${prestamosResult.insertedCount}`);
    console.log(`   - Pagos: ${pagosResult.insertedCount}`);
    console.log(`   - Intereses de cursos: ${cursosResult.insertedCount}`);
    
  } catch (error) {
    console.error('❌ Error importando datos:', error);
  } finally {
    await client.close();
  }
}

importSampleData();