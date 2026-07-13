const fs = require('fs');

// 1. Fix the navbar styling in ProjectDetailPanel.tsx
let content = fs.readFileSync('frontend/components/ProjectDetailPanel.tsx', 'utf-8');
content = content.replace(
  '<div className="sticky top-0 z-40 w-full bg-white/95 dark:bg-[#0a0a0a]/95 backdrop-blur-xl border-b border-gray-100 dark:border-white/5 transition-all duration-300">',
  '<div className="sticky top-4 z-40 w-full max-w-[calc(100%-2rem)] md:max-w-[calc(100%-4rem)] mx-auto bg-white/95 dark:bg-[#0a0a0a]/95 backdrop-blur-xl border border-gray-200/50 dark:border-white/10 rounded-full shadow-lg shadow-black/5 transition-all duration-300 mt-4">'
);
content = content.replace(
  '<div className={`flex items-center px-4 md:px-8 transition-all duration-300 overflow-visible h-[60px]`}>',
  '<div className={`flex items-center px-4 md:px-6 transition-all duration-300 overflow-visible h-[60px]`}>'
);
fs.writeFileSync('frontend/components/ProjectDetailPanel.tsx', content);

// 2. Fix the dimension colors in IntelligenceTab.tsx
let intelContent = fs.readFileSync('frontend/components/property-detail/IntelligenceTab.tsx', 'utf-8');
// Original colors: '#f59e0b', '#3b82f6', '#8b5cf6', '#10b981', '#ef4444', '#6366f1'
// New blue palette: '#002663', '#00509E', '#0077C8', '#60A3D9', '#9ED3F2', '#003B73'

intelContent = intelContent.replace("color: '#f59e0b'", "color: '#002663'");
intelContent = intelContent.replace("color: '#3b82f6'", "color: '#00509E'");
intelContent = intelContent.replace("color: '#8b5cf6'", "color: '#0077C8'");
intelContent = intelContent.replace("color: '#10b981'", "color: '#60A3D9'");
intelContent = intelContent.replace("color: '#ef4444'", "color: '#9ED3F2'");
intelContent = intelContent.replace("color: '#6366f1'", "color: '#003B73'");

fs.writeFileSync('frontend/components/property-detail/IntelligenceTab.tsx', intelContent);
