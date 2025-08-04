const fs = require('fs');
const path = require('path');

// Read the bot.update.ts file
const filePath = path.join(__dirname, 'src', 'bot', 'bot.update.ts');
let content = fs.readFileSync(filePath, 'utf8');

// Replace all hardcoded admin ID checks with dynamic admin service checks
const oldPattern = /\/\/ Check if this is an admin \(you can modify this check\)\s*const adminTelegramIds = \['794464667'\]; \/\/ Add your telegram ID here\s*if \(!adminTelegramIds\.includes\(ctx\.from\.id\.toString\(\)\)\) \{\s*return;\s*\}/g;

const newPattern = `// Check if this is an admin
    const isAdmin = await this.adminService.isAdmin(ctx.from.id.toString());
    if (!isAdmin) {
      return;
    }`;

content = content.replace(oldPattern, newPattern);

// Write the updated content back to the file
fs.writeFileSync(filePath, content, 'utf8');

console.log('✅ Successfully replaced all hardcoded admin IDs with dynamic admin service checks!'); 