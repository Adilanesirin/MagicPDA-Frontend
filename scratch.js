const fs = require('fs');
const glob = require('glob');

const files = glob.sync('**/*.ts*', { 
  ignore: ['node_modules/**', '.expo/**', 'dist/**'],
  cwd: process.cwd()
});

files.forEach(file => {
  if (file.includes('utils/database.ts') || file.includes('scratch.js')) return;
  
  let content = fs.readFileSync(file, 'utf8');
  if (content.includes('SQLite.openDatabaseSync(')) {
    console.log('Fixing ' + file);
    
    // Replace DB initialization
    content = content.replace(
      /const db = SQLite\.openDatabaseSync\([^)]+\);/g, 
      'const db = getDatabase();'
    );
    
    // Add import if missing
    if (!content.includes('import { getDatabase }') && !content.includes('import {getDatabase}')) {
      const importRegex = /import \* as SQLite from ['"]expo-sqlite['"];/g;
      
      if (content.match(importRegex)) {
        content = content.replace(
          importRegex, 
          'import * as SQLite from "expo-sqlite";\nimport { getDatabase } from "@/utils/database";'
        );
      } else {
        content = 'import { getDatabase } from "@/utils/database";\n' + content;
      }
    }
    
    fs.writeFileSync(file, content);
  }
});
console.log('Done replacement!');
