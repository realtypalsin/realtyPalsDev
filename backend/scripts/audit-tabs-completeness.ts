import * as fs from 'fs';
import * as path from 'path';

const masterDir = 'c:\\Users\\Furqan\\Desktop\\RealtyPals\\newProj\\75';

const filesToAudit = [
  'realtypals_sector10_greaternoidawest_master_data.json',
  'realtypals_sector12_greaternoidawest_master_data.json',
  'realtypals_sector75_noida_master_data.json',
  'realtypals_sector76_noida_master_data.json',
  'realtypals_sector77_noida_master_data.json',
  'realtypals_sector78_noida_master_data.json',
  'realtypals_sector79_noida_master_data.json',
  'realtypals_sector100_noida_master_data.json',
  'realtypals_sector107_noida_master_data.json',
  'realtypals_sector128_noida_master_data.json',
  'realtypals_sector137_noida_master_data.json',
  'realtypals_sector143_noida_master_data.json',
  'realtypals_sector150_noida_master_data.json',
  'realtypals_sector16c_greaternoidawest_master_data.json',
  'realtypals_sector1_greaternoidawest_master_data.json',
  'realtypals_sector22d_yamunaexpressway_master_data.json',
  'realtypals_techzone4_greaternoidawest_master_data.json',
];

interface AuditReport {
  totalProjects: number;
  tabs: {
    coreInfo: { complete: number; lacking: number; missingFields: Record<string, number> };
    pricing: { complete: number; lacking: number; missingFields: Record<string, number> };
    constructionTimeline: { complete: number; lacking: number; missingFields: Record<string, number> };
    location: { complete: number; lacking: number; missingFields: Record<string, number> };
  };
  sampleLackingProjects: any[];
}

function auditTabs() {
  const report: AuditReport = {
    totalProjects: 0,
    tabs: {
      coreInfo: { complete: 0, lacking: 0, missingFields: {} },
      pricing: { complete: 0, lacking: 0, missingFields: {} },
      constructionTimeline: { complete: 0, lacking: 0, missingFields: {} },
      location: { complete: 0, lacking: 0, missingFields: {} },
    },
    sampleLackingProjects: [],
  };

  const trackMissing = (tabName: keyof AuditReport['tabs'], field: string) => {
    report.tabs[tabName].missingFields[field] = (report.tabs[tabName].missingFields[field] || 0) + 1;
  };

  for (const fileName of filesToAudit) {
    const filePath = path.join(masterDir, fileName);
    if (!fs.existsSync(filePath)) continue;

    const projects = JSON.parse(fs.readFileSync(filePath, 'utf8'));

    for (const p of projects) {
      report.totalProjects++;

      const projectData = p.project || p;
      const builderData = p.builder || projectData.builder || {};
      const pricingData = p.cost_sheet || p.pricing || {};
      const locationData = p.location || projectData.location || {};

      let coreInfoMissing = false;
      let pricingMissing = false;
      let constrMissing = false;
      let locationMissing = false;

      const projectGaps: string[] = [];

      // 1. CORE INFO TAB AUDIT
      if (!projectData.name) { trackMissing('coreInfo', 'name'); coreInfoMissing = true; }
      if (!projectData.slug) { trackMissing('coreInfo', 'slug'); coreInfoMissing = true; }
      if (!builderData.name) { trackMissing('coreInfo', 'builder_name'); coreInfoMissing = true; }
      if (!builderData.logo_url) { trackMissing('coreInfo', 'builder_logo_url'); coreInfoMissing = true; projectGaps.push('builder_logo_url'); }
      if (!projectData.description) { trackMissing('coreInfo', 'description'); coreInfoMissing = true; }
      if (!projectData.hero_image_url || projectData.hero_image_url.includes('placeholder')) {
        trackMissing('coreInfo', 'hero_image_url'); coreInfoMissing = true; projectGaps.push('hero_image_url');
      }
      if (!projectData.rera_number) { trackMissing('coreInfo', 'rera_number'); coreInfoMissing = true; projectGaps.push('rera_number'); }
      if (!projectData.total_towers) { trackMissing('coreInfo', 'total_towers'); coreInfoMissing = true; }
      if (!projectData.total_units) { trackMissing('coreInfo', 'total_units'); coreInfoMissing = true; }
      if (!projectData.land_area_acres) { trackMissing('coreInfo', 'land_area_acres'); coreInfoMissing = true; }
      if (!projectData.architect) { trackMissing('coreInfo', 'architect'); coreInfoMissing = true; projectGaps.push('architect'); }

      if (coreInfoMissing) report.tabs.coreInfo.lacking++;
      else report.tabs.coreInfo.complete++;

      // 2. PRICING TAB AUDIT
      if (projectData.price_min_cr == null) { trackMissing('pricing', 'price_min_cr'); pricingMissing = true; projectGaps.push('price_min_cr'); }
      if (!projectData.price_range_label) { trackMissing('pricing', 'price_range_label'); pricingMissing = true; }
      if (!p.unit_types || p.unit_types.length === 0) { trackMissing('pricing', 'unit_types'); pricingMissing = true; projectGaps.push('unit_types'); }
      
      const hasCostSheet = p.cost_sheet || (pricingData && (pricingData.cost_sheet || pricingData.base_price_per_sqft));
      if (!hasCostSheet) { trackMissing('pricing', 'cost_sheet_breakdown'); pricingMissing = true; projectGaps.push('cost_sheet_breakdown'); }
      
      const hasPaymentPlans = (p.payment_plans && p.payment_plans.length > 0) || (pricingData.payment_plans && pricingData.payment_plans.length > 0);
      if (!hasPaymentPlans) { trackMissing('pricing', 'payment_plans'); pricingMissing = true; projectGaps.push('payment_plans'); }

      const hasPriceHistory = (p.price_history && p.price_history.length > 0) || (pricingData.price_history && pricingData.price_history.length > 0);
      if (!hasPriceHistory) { trackMissing('pricing', 'price_history_timeline'); pricingMissing = true; projectGaps.push('price_history_timeline'); }

      if (pricingMissing) report.tabs.pricing.lacking++;
      else report.tabs.pricing.complete++;

      // 3. CONSTRUCTION & TIMELINE TAB AUDIT
      if (!projectData.status) { trackMissing('constructionTimeline', 'status'); constrMissing = true; }
      if (!projectData.launch_date) { trackMissing('constructionTimeline', 'launch_date'); constrMissing = true; projectGaps.push('launch_date'); }
      if (!projectData.possession_date) { trackMissing('constructionTimeline', 'possession_date'); constrMissing = true; projectGaps.push('possession_date'); }
      if (projectData.oc_obtained == null) { trackMissing('constructionTimeline', 'oc_obtained'); constrMissing = true; projectGaps.push('oc_obtained'); }

      const hasMilestones = (p.construction_milestones && p.construction_milestones.length > 0) || (p.construction && p.construction.milestones);
      if (!hasMilestones) { trackMissing('constructionTimeline', 'construction_milestones'); constrMissing = true; projectGaps.push('construction_milestones'); }

      const hasUpdates = (p.construction_updates && p.construction_updates.length > 0) || (p.construction && p.construction.updates);
      if (!hasUpdates) { trackMissing('constructionTimeline', 'construction_updates_feed'); constrMissing = true; projectGaps.push('construction_updates_feed'); }

      if (constrMissing) report.tabs.constructionTimeline.lacking++;
      else report.tabs.constructionTimeline.complete++;

      // 4. LOCATION TAB AUDIT
      if (!projectData.address) { trackMissing('location', 'address'); locationMissing = true; }
      if (!projectData.lat || !projectData.lng) { trackMissing('location', 'lat_lng_coords'); locationMissing = true; projectGaps.push('lat_lng_coords'); }
      if (!projectData.walkability_score) { trackMissing('location', 'walkability_score'); locationMissing = true; }

      const hasCommute = (p.commute_matrix && p.commute_matrix.length > 0) || (locationData.commute_matrix && locationData.commute_matrix.length > 0);
      if (!hasCommute) { trackMissing('location', 'commute_matrix'); locationMissing = true; projectGaps.push('commute_matrix'); }

      const hasConnectivity = (p.connectivity && p.connectivity.length > 0) || (locationData.connectivity && locationData.connectivity.length > 0);
      if (!hasConnectivity) { trackMissing('location', 'connectivity_nodes'); locationMissing = true; projectGaps.push('connectivity_nodes'); }

      if (locationMissing) report.tabs.location.lacking++;
      else report.tabs.location.complete++;
    }
  }

  console.log('\n==================================================');
  console.log('📊 UNAMBIGUOUS MASTER DATA TAB COMPLETENESS REPORT');
  console.log('==================================================');
  console.log(`Total Master Projects Analyzed: ${report.totalProjects}\n`);

  console.log('1️⃣ CORE INFO TAB:');
  console.log(`   - Fully Complete Projects: ${report.tabs.coreInfo.complete}/${report.totalProjects} (${((report.tabs.coreInfo.complete / report.totalProjects) * 100).toFixed(1)}%)`);

  console.log('\n2️⃣ PRICING TAB:');
  console.log(`   - Fully Complete Projects: ${report.tabs.pricing.complete}/${report.totalProjects} (${((report.tabs.pricing.complete / report.totalProjects) * 100).toFixed(1)}%)`);

  console.log('\n3️⃣ CONSTRUCTION & TIMELINE TAB:');
  console.log(`   - Fully Complete Projects: ${report.tabs.constructionTimeline.complete}/${report.totalProjects} (${((report.tabs.constructionTimeline.complete / report.totalProjects) * 100).toFixed(1)}%)`);

  console.log('\n4️⃣ LOCATION TAB:');
  console.log(`   - Fully Complete Projects: ${report.tabs.location.complete}/${report.totalProjects} (${((report.tabs.location.complete / report.totalProjects) * 100).toFixed(1)}%)`);
  console.log('==================================================\n');
}

auditTabs();
