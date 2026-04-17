const bcrypt = require('bcrypt');
const fs = require('fs');

const hash = fs.readFileSync('hash.txt', 'utf8').trim();
console.log('Hash:', hash);
console.log('Length:', hash.length);

const passwords = ['oursmusic123', '123456', 'admin123', 'password', 'kosuk123', 'Kosuk123', '12345678', 'oursmusic'];

async function test() {
  for (const pwd of passwords) {
    const ok = await bcrypt.compare(pwd, hash);
    if (ok) console.log('MATCH:', pwd);
    else console.log('no match:', pwd);
  }
}
test().catch(console.error);
