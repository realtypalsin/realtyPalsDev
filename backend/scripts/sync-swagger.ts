import fs from 'fs';
import path from 'path';

const swaggerPath = path.resolve(__dirname, '../../swagger.json');
const swagger = JSON.parse(fs.readFileSync(swaggerPath, 'utf8'));

const routes = [
  "GET /api/v1/admin/",
  "GET /api/v1/admin/:id",
  "PATCH /api/v1/admin/:id",
  "PATCH /api/v1/admin/amenities/:amenityId",
  "DELETE /api/v1/admin/amenities/:amenityId",
  "GET /api/v1/admin/analytics/properties",
  "GET /api/v1/admin/analytics/quality",
  "GET /api/v1/admin/analytics/summary",
  "GET /api/v1/admin/analytics/users",
  "POST /api/v1/admin/auth",
  "DELETE /api/v1/admin/auth",
  "GET /api/v1/admin/builders",
  "POST /api/v1/admin/builders",
  "PATCH /api/v1/admin/builders/:id",
  "DELETE /api/v1/admin/builders/:id",
  "PATCH /api/v1/admin/competitors/:competitorId",
  "DELETE /api/v1/admin/competitors/:competitorId",
  "PATCH /api/v1/admin/connectivity/:connId",
  "DELETE /api/v1/admin/connectivity/:connId",
  "DELETE /api/v1/admin/documents/:docId",
  "PATCH /api/v1/admin/images/:imageId",
  "DELETE /api/v1/admin/images/:imageId",
  "GET /api/v1/admin/leads",
  "PATCH /api/v1/admin/leads/:id",
  "GET /api/v1/admin/news",
  "GET /api/v1/admin/projects",
  "POST /api/v1/admin/projects",
  "GET /api/v1/admin/projects/:id",
  "PATCH /api/v1/admin/projects/:id",
  "DELETE /api/v1/admin/projects/:id",
  "POST /api/v1/admin/projects/:id/amenities",
  "POST /api/v1/admin/projects/:id/competitors",
  "GET /api/v1/admin/projects/:id/completeness",
  "POST /api/v1/admin/projects/:id/connectivity",
  "PUT /api/v1/admin/projects/:id/cost-sheet",
  "PATCH /api/v1/admin/projects/:id/decision-profile",
  "PATCH /api/v1/admin/projects/:id/dna",
  "GET /api/v1/admin/projects/:id/documents",
  "GET /api/v1/admin/projects/:id/images",
  "POST /api/v1/admin/projects/:id/images",
  "PATCH /api/v1/admin/projects/:id/investment-insights",
  "PUT /api/v1/admin/projects/:id/payment-plan",
  "PATCH /api/v1/admin/projects/:id/persona-profile",
  "PATCH /api/v1/admin/projects/:id/recommendation-profile",
  "POST /api/v1/admin/projects/:id/units",
  "GET /api/v1/admin/stats",
  "PATCH /api/v1/admin/units/:unitId",
  "DELETE /api/v1/admin/units/:unitId",
  "POST /api/v1/admin/upload-image",
  "POST /api/v1/analytics/engagement",
  "POST /api/v1/analytics/promotions",
  "GET /api/v1/aqi/",
  "GET /api/v1/builder-applications/",
  "GET /api/v1/builder-applications/:id",
  "PATCH /api/v1/builder-applications/:id",
  "POST /api/v1/builder-registration/",
  "GET /api/v1/builder-reputation/",
  "GET /api/v1/builders/",
  "GET /api/v1/builders/:slug",
  "POST /api/v1/chat/",
  "DELETE /api/v1/chat/intent",
  "GET /api/v1/chat/session",
  "PATCH /api/v1/chat/session/:id",
  "DELETE /api/v1/chat/session/:id",
  "GET /api/v1/chat/session/list",
  "GET /api/v1/commute/",
  "GET /api/v1/documents/",
  "POST /api/v1/documents/",
  "POST /api/v1/documents/ask",
  "POST /api/v1/leads/callback",
  "GET /api/v1/leads/count",
  "POST /api/v1/leads/site-visit",
  "POST /api/v1/leads/webhook",
  "GET /api/v1/market-comparison/",
  "POST /api/v1/price-alerts/",
  "GET /api/v1/price-alerts/",
  "DELETE /api/v1/price-alerts/",
  "GET /api/v1/projects/",
  "GET /api/v1/projects/:slug",
  "GET /api/v1/projects/:slug/cost-sheet",
  "GET /api/v1/projects/:slug/documents",
  "GET /api/v1/projects/:slug/investment",
  "GET /api/v1/projects/:slug/payment-plan",
  "GET /api/v1/registry-prices/",
  "GET /api/v1/saved/",
  "POST /api/v1/saved/",
  "DELETE /api/v1/saved/:id",
  "GET /api/v1/saved/:id/check",
  "POST /api/v1/sessions/migrate",
  "GET /api/v1/sessions/re-engagement/latest",
  "POST /api/v1/transcribe/"
];

function convertPath(p: string) {
  return p.replace(/:([a-zA-Z0-9_]+)/g, '{$1}').replace(/\/$/, '');
}

routes.forEach(line => {
  const parts = line.split(' ');
  // Filter out any empty spaces from padding
  const method = parts[0].toLowerCase();
  const rawPath = parts[parts.length - 1];
  
  const swaggerPathKey = convertPath(rawPath);
  
  if (!swagger.paths[swaggerPathKey]) {
    swagger.paths[swaggerPathKey] = {};
  }
  
  if (!swagger.paths[swaggerPathKey][method]) {
    let tag = "System";
    if (rawPath.includes('/admin')) tag = "Admin";
    else if (rawPath.includes('/chat')) tag = "Chat";
    else if (rawPath.includes('/projects')) tag = "Projects";
    else if (rawPath.includes('/builders')) tag = "Builders";
    else if (rawPath.includes('/leads')) tag = "Leads";
    else if (rawPath.includes('/saved')) tag = "Saved";
    else if (rawPath.includes('/sessions')) tag = "Sessions";
    else if (rawPath.includes('/documents')) tag = "Documents";
    else if (rawPath.includes('/analytics')) tag = "Analytics";
    else if (rawPath.includes('/price-alerts')) tag = "Price Alerts";
    else if (rawPath.includes('/market')) tag = "Market";
    else if (rawPath.includes('/commute') || rawPath.includes('/aqi')) tag = "Location";
    else if (rawPath.includes('/transcribe')) tag = "Transcribe";
    else if (rawPath.includes('/builder-registration')) tag = "Builder Registration";
    else if (rawPath.includes('/builder-applications')) tag = "Builder Applications";
    
    const endpointDef: any = {
      summary: `Auto-generated endpoint for ${method.toUpperCase()} ${rawPath}`,
      tags: [tag],
      responses: {
        "200": {
          description: "Successful response"
        }
      }
    };
    
    if (tag === "Admin" && rawPath !== '/api/v1/admin/auth') {
      endpointDef.security = [{ "AdminSession": [] }];
    }
    
    const paramsMatch = rawPath.match(/:([a-zA-Z0-9_]+)/g);
    if (paramsMatch) {
      endpointDef.parameters = paramsMatch.map(p => ({
        name: p.substring(1),
        in: "path",
        required: true,
        schema: { type: "string" }
      }));
    }
    
    // Add default request body for POST/PUT/PATCH to prevent empty requests
    if (['post', 'put', 'patch'].includes(method)) {
      endpointDef.requestBody = {
        content: {
          "application/json": {
            schema: { type: "object", additionalProperties: true }
          }
        }
      };
    }
    
    swagger.paths[swaggerPathKey][method] = endpointDef;
    console.log(`Added: ${method.toUpperCase()} ${swaggerPathKey}`);
  }
});

fs.writeFileSync(swaggerPath, JSON.stringify(swagger, null, 2), 'utf8');
console.log('Swagger updated perfectly.');
