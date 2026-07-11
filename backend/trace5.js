require('dotenv').config();
const { extractIntent } = require('./src/lib/ai/intent');

(async () => {
  const msg = 'Best 3 BHK in Noida';
  const prev = {};
  const result = await extractIntent(msg, prev);
  console.log('extractIntent result:', JSON.stringify(result, null, 2));
})();
