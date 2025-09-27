const { MongoClient } = require('mongodb');

const uri = "mongodb+srv://aalvarez351:Lentesdesol@ianube.furqsl0.mongodb.net/";
const client = new MongoClient(uri);

async function checkData() {
  try {
    await client.connect();
    console.log('✅ Conectado a MongoDB Atlas');
    
    // Listar todas las bases de datos
    const admin = client.db().admin();
    const dbs = await admin.listDatabases();
    console.log('\n📊 Bases de datos disponibles:');
    dbs.databases.forEach(db => {
      console.log(`  - ${db.name} (${(db.sizeOnDisk / 1024).toFixed(2)} KB)`);
    });
    
    // Verificar base de datos 'test'
    const testDb = client.db('test');
    const collections = await testDb.listCollections().toArray();
    console.log('\n📁 Colecciones en base de datos "test":');
    
    for (const collection of collections) {
      console.log(`\n  📋 Colección: ${collection.name}`);
      const coll = testDb.collection(collection.name);
      const count = await coll.countDocuments();
      console.log(`     Documentos: ${count}`);
      
      if (count > 0) {
        const sample = await coll.findOne();
        console.log(`     Ejemplo de documento:`, JSON.stringify(sample, null, 2));
      }
    }
    
    // Verificar si hay otras bases de datos con datos
    for (const dbInfo of dbs.databases) {
      if (dbInfo.name !== 'test' && dbInfo.name !== 'admin' && dbInfo.name !== 'local') {
        console.log(`\n🔍 Verificando base de datos: ${dbInfo.name}`);
        const db = client.db(dbInfo.name);
        const colls = await db.listCollections().toArray();
        
        for (const coll of colls) {
          const collection = db.collection(coll.name);
          const count = await collection.countDocuments();
          console.log(`  📋 ${coll.name}: ${count} documentos`);
          
          if (count > 0 && count <= 5) {
            const samples = await collection.find().limit(2).toArray();
            console.log(`     Ejemplos:`, JSON.stringify(samples, null, 2));
          }
        }
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.close();
  }
}

checkData();