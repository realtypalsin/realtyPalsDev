const fs = require('fs');

let content = fs.readFileSync('frontend/app/admin/analytics/page.tsx', 'utf-8');

// 1. Remove Bottom Links
const bottomLinksStart = content.indexOf('{/* Bottom Links */}');
if (bottomLinksStart !== -1) {
  const bottomLinksEnd = content.indexOf('</motion.div>\n\n    </motion.div>\n  )\n}');
  if (bottomLinksEnd !== -1) {
    content = content.substring(0, bottomLinksStart) + '</motion.div>\n\n    </motion.div>\n  )\n}';
  }
}

// 2. Make Top Navigation Tabs sticky
content = content.replace(
  /<div className="flex items-center gap-3 overflow-x-auto pb-2 border-b border-gray-100">/,
  '<div className="flex items-center gap-3 overflow-x-auto pb-2 border-b border-gray-100 sticky top-0 bg-slate-50/80 backdrop-blur-md z-40 py-2 -mx-4 px-4 sm:mx-0 sm:px-0">'
);

fs.writeFileSync('frontend/app/admin/analytics/page.tsx', content);
