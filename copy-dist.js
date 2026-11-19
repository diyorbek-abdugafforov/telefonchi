import fs from 'fs';
import path from 'path';

if (fs.existsSync('client/dist')) {
  if (!fs.existsSync('dist')) {
    fs.mkdirSync('dist', { recursive: true });
  }
  fs.cpSync('client/dist', 'dist', { recursive: true });
  console.log('✅ client/dist muvaffaqiyatli root/dist papkasiga nusxalandi (Vercel va Render uchun tayyor).');
} else {
  console.log('⚠️ client/dist topilmadi.');
}
