const fs = require('fs');

const PALETTE = {
  emerald: '#00509E',   // Replacing green/emerald with mid-blue
  blue: '#002663',      // Dark blue
  indigo: '#0077C8',    // Standard blue
  violet: '#60A3D9',    // Light blue
  amber: '#9ED3F2',     // Very light blue
  teal: '#00509E',
  cyan: '#60A3D9',
  slate: '#002663'
};

// 1. PricingCharts.tsx
let pricing = fs.readFileSync('frontend/components/property-detail/PricingCharts.tsx', 'utf-8');
pricing = pricing.replace(/#10B981/g, PALETTE.emerald);
pricing = pricing.replace(/#3B82F6/g, PALETTE.blue);
pricing = pricing.replace(/#8B5CF6/g, PALETTE.indigo);
pricing = pricing.replace(/#F59E0B/g, PALETTE.amber);
pricing = pricing.replace(/#14B8A6/g, PALETTE.teal);
pricing = pricing.replace(/#06B6D4/g, PALETTE.cyan);
fs.writeFileSync('frontend/components/property-detail/PricingCharts.tsx', pricing);

// 2. IntelligenceTab.tsx
let intelligence = fs.readFileSync('frontend/components/property-detail/IntelligenceTab.tsx', 'utf-8');
intelligence = intelligence.replace(/#10B981/g, PALETTE.emerald);
intelligence = intelligence.replace(/#3B82F6/g, PALETTE.blue);
intelligence = intelligence.replace(/#8B5CF6/g, PALETTE.indigo);
fs.writeFileSync('frontend/components/property-detail/IntelligenceTab.tsx', intelligence);

console.log("Updated colors to blue palette");
