const fs = require('fs');
const path = require('path');

// Read the bot.update.ts file
const filePath = path.join(__dirname, 'src', 'bot', 'bot.update.ts');
let content = fs.readFileSync(filePath, 'utf8');

// Replace all admin service calls with simple direct checks
const oldPattern = /const isAdmin = await this\.adminService\.isAdmin\(([^)]+)\);/g;
const newPattern = (match, p1) => {
  return `const isAdmin = ${p1} === envVariables.ADMIN_TELEGRAM_ID;`;
};

content = content.replace(oldPattern, newPattern);

// Write the updated content back to the file
fs.writeFileSync(filePath, content, 'utf8');

console.log('✅ Successfully replaced all admin service calls with simple direct checks!');
console.log('📝 Total replacements made:', (content.match(/=== envVariables\.ADMIN_TELEGRAM_ID/g) || []).length); 