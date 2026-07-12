const fs = require('fs');
let content = fs.readFileSync('frontend/app/admin/analytics/page.tsx', 'utf-8');
content = content.replace('{quality.avgResultsCount.toFixed(1)}', '{quality.avgResultsCount}');
content = content.replace('{quality.avgClarifications.toFixed(2)}', '{quality.avgClarifications}');
fs.writeFileSync('frontend/app/admin/analytics/page.tsx', content);
