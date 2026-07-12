const fs = require('fs');

let content = fs.readFileSync('frontend/app/admin/analytics/page.tsx', 'utf-8');

// Remove the bottom links
content = content.replace(
  /      \{\/\* Bottom Links \*\/\}[\s\S]*?      <\/div>\n    <\/div>/,
  '    </div>'
);

// Add Top Navigation Tabs and Tooltip button imports
const topTabs = `      {/* Top Navigation Tabs */}
      <div className="flex items-center gap-3 overflow-x-auto pb-2 border-b border-gray-100">
        <Link href="/admin/analytics" className="px-4 py-2 text-sm font-semibold rounded-full bg-slate-900 text-white shadow-sm shrink-0">
          Dashboard
        </Link>
        <Link href="/admin/analytics/search" className="px-4 py-2 text-sm font-medium rounded-full bg-white text-slate-600 hover:bg-slate-50 border border-gray-200 transition-colors shrink-0">
          Search Analytics
        </Link>
        <Link href="/admin/analytics/properties" className="px-4 py-2 text-sm font-medium rounded-full bg-white text-slate-600 hover:bg-slate-50 border border-gray-200 transition-colors shrink-0">
          Property Engagement
        </Link>
        <Link href="/admin/analytics/users" className="px-4 py-2 text-sm font-medium rounded-full bg-white text-slate-600 hover:bg-slate-50 border border-gray-200 transition-colors shrink-0">
          User Behavior
        </Link>
      </div>

      {/* KPI Row */}`;
      
content = content.replace('      {/* KPI Row */}', topTabs);

// Add Info Tooltip next to titles
content = content.replace(
  /<h2 className="text-lg font-semibold text-slate-900 mb-4">Conversion Funnel<\/h2>/,
  `<div className="flex items-center gap-2 mb-4">
            <h2 className="text-lg font-semibold text-slate-900">Conversion Funnel</h2>
            <div className="group relative">
              <AlertCircle size={16} className="text-slate-400 cursor-help" />
              <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 w-64 p-3 bg-slate-900 text-white text-xs rounded-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10 text-center shadow-xl">
                This shows the user journey from starting a Chat, searching, clicking a property, saving it, and ultimately converting to a Lead.
                <div className="absolute left-1/2 -translate-x-1/2 top-full border-4 border-transparent border-t-slate-900"></div>
              </div>
            </div>
          </div>`
);

content = content.replace(
  /<h2 className="text-lg font-semibold text-slate-900 mb-4">Search Results Distribution<\/h2>/,
  `<div className="flex items-center gap-2 mb-4">
            <h2 className="text-lg font-semibold text-slate-900">Search Results Distribution</h2>
            <div className="group relative">
              <AlertCircle size={16} className="text-slate-400 cursor-help" />
              <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 w-64 p-3 bg-slate-900 text-white text-xs rounded-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10 text-center shadow-xl">
                The proportion of searches that successfully found matching properties versus those that returned zero results.
                <div className="absolute left-1/2 -translate-x-1/2 top-full border-4 border-transparent border-t-slate-900"></div>
              </div>
            </div>
          </div>`
);

fs.writeFileSync('frontend/app/admin/analytics/page.tsx', content);
