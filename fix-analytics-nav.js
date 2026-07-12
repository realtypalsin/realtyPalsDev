const fs = require('fs');
let content = fs.readFileSync('frontend/app/admin/analytics/page.tsx', 'utf-8');

// The current sticky header class is: <div className="flex items-center gap-3 overflow-x-auto pb-2 border-b border-gray-100 sticky top-0 bg-slate-50/80 backdrop-blur-md z-40 py-2 -mx-4 px-4 sm:mx-0 sm:px-0">
// We will replace it with a sleek, floating pill style nav container

content = content.replace(
  /<div className="flex items-center gap-3 overflow-x-auto pb-2 border-b border-gray-100 sticky top-0 bg-slate-50\/80 backdrop-blur-md z-40 py-2 -mx-4 px-4 sm:mx-0 sm:px-0">/,
  '<div className="flex items-center gap-3 overflow-x-auto sticky top-4 z-40 py-2 px-2 bg-white/70 backdrop-blur-xl border border-gray-200/50 shadow-sm rounded-full w-fit mx-auto sm:mx-0 mb-6">'
);

fs.writeFileSync('frontend/app/admin/analytics/page.tsx', content);
