const XLSX = require('xlsx');
const path = require('path');

function analizarEstructuraExcel(filename = '30deagosto.xlsx') {
  try {
    const excelPath = path.join(__dirname, filename);
    console.log(`📖 Analizando estructura de: ${filename}`);
    
    const workbook = XLSX.readFile(excelPath);
    console.log(`📋 Hojas disponibles: ${workbook.SheetNames.join(', ')}`);
    
    // Analizar primera hoja
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    
    console.log(`\n📊 Analizando hoja: "${sheetName}"`);
    
    // Obtener rango de datos
    const range = XLSX.utils.decode_range(worksheet['!ref']);
    console.log(`📏 Rango de datos: ${worksheet['!ref']}`);
    console.log(`📈 Filas: ${range.e.r + 1}, Columnas: ${range.e.c + 1}`);
    
    // Leer primeras filas para ver estructura
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { 
      range: 0, // Empezar desde fila 0
      header: 1, // Usar primera fila como headers
      raw: false 
    });
    
    if (jsonData.length > 0) {
      console.log('\n📋 Columnas encontradas:');
      const headers = Object.keys(jsonData[0]);
      headers.forEach((header, index) => {
        console.log(`   ${index + 1}. "${header}"`);
      });
      
      console.log('\n📄 Muestra de primeros 3 registros:');
      jsonData.slice(0, 3).forEach((row, index) => {
        console.log(`\n--- Registro ${index + 1} ---`);
        Object.entries(row).forEach(([key, value]) => {
          console.log(`   ${key}: ${value}`);
        });
      });
      
      console.log(`\n📊 Total de registros: ${jsonData.length}`);
    }
    
  } catch (error) {
    console.error('❌ Error analizando Excel:', error.message);
  }
}

// Ejecutar análisis
if (require.main === module) {
  const filename = process.argv[2] || '30deagosto.xlsx';
  analizarEstructuraExcel(filename);
}

module.exports = { analizarEstructuraExcel };