const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'LearningCms.tsx');
const content = fs.readFileSync(filePath, 'utf8');

const lines = content.split('\n');
const query = 'columns={taxColumns}';

console.log(`Searching for "${query}" in ${filePath}:`);
lines.forEach((line, index) => {
  if (line.toLowerCase().includes(query.toLowerCase())) {
    console.log(`Line ${index + 1}: ${line.trim()}`);
  }
});
