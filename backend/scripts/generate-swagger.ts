import fs from 'fs';
import path from 'path';

// File paths
const swaggerPath = path.resolve(__dirname, '../../swagger.json');
const prismaSchemaPath = path.resolve(__dirname, '../prisma/schema.prisma');

// Interface definitions
interface OpenAPISchema {
  type?: string;
  format?: string;
  enum?: string[];
  properties?: Record<string, any>;
  items?: any;
  required?: string[];
  $ref?: string;
  description?: string;
  additionalProperties?: boolean;
}

// 1. Read Prisma Schema & Parse Enums and Models
const prismaContent = fs.readFileSync(prismaSchemaPath, 'utf8');

const enumsMap: Record<string, string[]> = {};
const modelsMap: Record<string, { fields: Record<string, OpenAPISchema>; required: string[] }> = {};

// Parse Enums
const enumRegex = /enum\s+([A-Za-z0-9_]+)\s*\{([^}]+)\}/g;
let match: RegExpExecArray | null;
while ((match = enumRegex.exec(prismaContent)) !== null) {
  const enumName = match[1];
  const body = match[2];
  const values = body
    .split('\n')
    .map(line => line.trim())
    .filter(line => line && !line.startsWith('//'));
  enumsMap[enumName] = values;
}

// Parse Models
const modelRegex = /model\s+([A-Za-z0-9_]+)\s*\{([^}]+)\}/g;
while ((match = modelRegex.exec(prismaContent)) !== null) {
  const modelName = match[1];
  const body = match[2];
  const lines = body.split('\n');

  const fields: Record<string, OpenAPISchema> = {};
  const required: string[] = [];

  lines.forEach(line => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('//') || trimmed.startsWith('@@')) return;

    const parts = trimmed.split(/\s+/);
    if (parts.length < 2) return;

    const fieldName = parts[0];
    let fieldTypeRaw = parts[1];

    const isOptional = fieldTypeRaw.endsWith('?');
    const isArray = fieldTypeRaw.endsWith('[]');
    const cleanType = fieldTypeRaw.replace(/\?|\[\]/g, '');

    let schema: OpenAPISchema = {};

    if (cleanType === 'String') {
      schema = { type: 'string' };
      if (fieldName === 'id' || fieldName.endsWith('_id') || trimmed.includes('@default(uuid())')) {
        schema.format = 'uuid';
      }
    } else if (cleanType === 'Int') {
      schema = { type: 'integer' };
    } else if (cleanType === 'Float') {
      schema = { type: 'number' };
    } else if (cleanType === 'Boolean') {
      schema = { type: 'boolean' };
    } else if (cleanType === 'DateTime') {
      schema = { type: 'string', format: 'date-time' };
    } else if (cleanType === 'Json') {
      schema = { type: 'object', additionalProperties: true };
    } else if (enumsMap[cleanType]) {
      schema = { type: 'string', enum: enumsMap[cleanType] };
    } else {
      // Relation to another model
      schema = { $ref: `#/components/schemas/${cleanType}` };
    }

    if (isArray) {
      if (schema.$ref) {
        schema = { type: 'array', items: { $ref: schema.$ref } };
      } else {
        const itemSchema = { ...schema };
        delete itemSchema.description;
        schema = { type: 'array', items: itemSchema };
      }
    }

    fields[fieldName] = schema;

    if (!isOptional && !isArray && !trimmed.includes('@default') && !trimmed.includes('@updatedAt')) {
      required.push(fieldName);
    }
  });

  modelsMap[modelName] = { fields, required };
}

// 2. Build OpenAPI Component Schemas
const componentSchemas: Record<string, any> = {
  Error: {
    type: 'object',
    required: ['error'],
    properties: {
      error: { type: 'string' },
      details: {
        oneOf: [{ type: 'array' }, { type: 'object' }],
      },
    },
  },
};

// Add Enums to componentSchemas
Object.entries(enumsMap).forEach(([name, values]) => {
  componentSchemas[name] = {
    type: 'string',
    enum: values,
  };
});

// Add Models to componentSchemas
Object.entries(modelsMap).forEach(([name, { fields, required }]) => {
  componentSchemas[name] = {
    type: 'object',
    properties: fields,
    ...(required.length > 0 ? { required } : {}),
  };
});

// 3. Define All 96 Routes Across the Backend
interface RouteDef {
  method: string;
  path: string;
  tag: string;
  summary: string;
  description?: string;
  requestSchema?: any;
  responseSchema?: any;
  security?: any[];
  params?: { name: string; in: string; required: boolean; schema: any; description?: string }[];
}

const routes: RouteDef[] = [
  // Health
  { method: 'get', path: '/api/v1/health', tag: 'Utilities', summary: 'System health check', description: 'Returns system status, DB probe, and Redis probe.' },
  { method: 'get', path: '/api/v1/health/deep', tag: 'Utilities', summary: 'Deep health check', description: 'Detailed health check including storage, external APIs, and metrics.' },
  { method: 'get', path: '/api/v1/health/ready', tag: 'Utilities', summary: 'Readiness probe', description: 'Kubernetes/Render readiness probe.' },
  { method: 'get', path: '/api/v1/health/live', tag: 'Utilities', summary: 'Liveness probe', description: 'Kubernetes/Render liveness probe.' },

  // Admin Auth & Stats
  { method: 'post', path: '/api/v1/admin/auth', tag: 'Admin', summary: 'Admin login', description: 'Authenticate admin user and obtain session token.', requestSchema: { type: 'object', required: ['password'], properties: { password: { type: 'string' } } } },
  { method: 'delete', path: '/api/v1/admin/auth', tag: 'Admin', summary: 'Admin logout', description: 'Invalidate current admin session token.', security: [{ AdminSession: [] }] },
  { method: 'get', path: '/api/v1/admin/stats', tag: 'Admin', summary: 'Get admin dashboard statistics', security: [{ AdminSession: [] }] },
  { method: 'post', path: '/api/v1/admin/upload-image', tag: 'Admin', summary: 'Upload project image to storage', security: [{ AdminSession: [] }] },

  // Admin Intelligence
  { method: 'post', path: '/api/v1/admin/batch', tag: 'Admin Intelligence', summary: 'Batch process intelligence audits', security: [{ AdminSession: [] }] },
  { method: 'patch', path: '/api/v1/admin/{projectId}', tag: 'Admin Intelligence', summary: 'Update project intelligence audit status', security: [{ AdminSession: [] }] },
  { method: 'get', path: '/api/v1/admin/status/summary', tag: 'Admin Intelligence', summary: 'Get intelligence status summary', security: [{ AdminSession: [] }] },
  { method: 'patch', path: '/api/v1/admin/{projectId}/verify', tag: 'Admin Intelligence', summary: 'Verify project intelligence data', security: [{ AdminSession: [] }] },

  // Admin Projects
  { method: 'get', path: '/api/v1/admin/projects', tag: 'Admin Projects', summary: 'List all projects for admin', security: [{ AdminSession: [] }] },
  { method: 'post', path: '/api/v1/admin/projects', tag: 'Admin Projects', summary: 'Create new project', requestSchema: { $ref: '#/components/schemas/Project' }, security: [{ AdminSession: [] }] },
  { method: 'get', path: '/api/v1/admin/projects/{id}', tag: 'Admin Projects', summary: 'Get project by ID for admin', security: [{ AdminSession: [] }] },
  { method: 'patch', path: '/api/v1/admin/projects/{id}', tag: 'Admin Projects', summary: 'Update project by ID', security: [{ AdminSession: [] }] },
  { method: 'delete', path: '/api/v1/admin/projects/{id}', tag: 'Admin Projects', summary: 'Delete project', security: [{ AdminSession: [] }] },
  { method: 'get', path: '/api/v1/admin/projects/{id}/documents', tag: 'Admin Projects', summary: 'Get project documents', security: [{ AdminSession: [] }] },
  { method: 'get', path: '/api/v1/admin/projects/{id}/completeness', tag: 'Admin Projects', summary: 'Get project completeness metrics', security: [{ AdminSession: [] }] },
  { method: 'get', path: '/api/v1/admin/projects/{id}/milestones', tag: 'Admin Projects', summary: 'Get project construction milestones', security: [{ AdminSession: [] }] },
  { method: 'put', path: '/api/v1/admin/projects/{id}/milestones', tag: 'Admin Projects', summary: 'Update project construction milestones', security: [{ AdminSession: [] }] },
  { method: 'get', path: '/api/v1/admin/projects/{id}/updates', tag: 'Admin Projects', summary: 'Get project construction updates', security: [{ AdminSession: [] }] },
  { method: 'put', path: '/api/v1/admin/projects/{id}/updates', tag: 'Admin Projects', summary: 'Update project construction updates', security: [{ AdminSession: [] }] },
  { method: 'get', path: '/api/v1/admin/projects/{id}/channel-partners', tag: 'Admin Projects', summary: 'Get project channel partners', security: [{ AdminSession: [] }] },
  { method: 'put', path: '/api/v1/admin/projects/{id}/channel-partners', tag: 'Admin Projects', summary: 'Update project channel partners', security: [{ AdminSession: [] }] },
  { method: 'get', path: '/api/v1/admin/projects/{id}/images', tag: 'Admin Projects', summary: 'Get project images', security: [{ AdminSession: [] }] },
  { method: 'post', path: '/api/v1/admin/projects/{id}/images', tag: 'Admin Projects', summary: 'Add image to project', security: [{ AdminSession: [] }] },
  { method: 'post', path: '/api/v1/admin/projects/{id}/amenities', tag: 'Admin Projects', summary: 'Add amenity to project', security: [{ AdminSession: [] }] },
  { method: 'post', path: '/api/v1/admin/projects/{id}/units', tag: 'Admin Projects', summary: 'Add unit type to project', security: [{ AdminSession: [] }] },
  { method: 'post', path: '/api/v1/admin/projects/{id}/connectivity', tag: 'Admin Projects', summary: 'Add connectivity point to project', security: [{ AdminSession: [] }] },
  { method: 'post', path: '/api/v1/admin/projects/{id}/competitors', tag: 'Admin Projects', summary: 'Add competitor to project', security: [{ AdminSession: [] }] },
  { method: 'put', path: '/api/v1/admin/projects/{id}/cost-sheet', tag: 'Admin Projects', summary: 'Update cost sheet for project', security: [{ AdminSession: [] }] },
  { method: 'put', path: '/api/v1/admin/projects/{id}/payment-plan', tag: 'Admin Projects', summary: 'Update payment plan for project', security: [{ AdminSession: [] }] },
  { method: 'patch', path: '/api/v1/admin/projects/{id}/dna', tag: 'Admin Projects', summary: 'Update project DNA profile', security: [{ AdminSession: [] }] },
  { method: 'patch', path: '/api/v1/admin/projects/{id}/decision-profile', tag: 'Admin Projects', summary: 'Update project decision profile', security: [{ AdminSession: [] }] },
  { method: 'patch', path: '/api/v1/admin/projects/{id}/persona-profile', tag: 'Admin Projects', summary: 'Update project persona profile', security: [{ AdminSession: [] }] },
  { method: 'patch', path: '/api/v1/admin/projects/{id}/recommendation-profile', tag: 'Admin Projects', summary: 'Update project recommendation profile', security: [{ AdminSession: [] }] },
  { method: 'patch', path: '/api/v1/admin/projects/{id}/investment-insights', tag: 'Admin Projects', summary: 'Update investment insights for project', security: [{ AdminSession: [] }] },

  // Admin Entity Sub-routes
  { method: 'patch', path: '/api/v1/admin/amenities/{amenityId}', tag: 'Admin Entities', summary: 'Update amenity', security: [{ AdminSession: [] }] },
  { method: 'delete', path: '/api/v1/admin/amenities/{amenityId}', tag: 'Admin Entities', summary: 'Delete amenity', security: [{ AdminSession: [] }] },
  { method: 'patch', path: '/api/v1/admin/units/{unitId}', tag: 'Admin Entities', summary: 'Update unit type', security: [{ AdminSession: [] }] },
  { method: 'delete', path: '/api/v1/admin/units/{unitId}', tag: 'Admin Entities', summary: 'Delete unit type', security: [{ AdminSession: [] }] },
  { method: 'patch', path: '/api/v1/admin/connectivity/{connId}', tag: 'Admin Entities', summary: 'Update connectivity point', security: [{ AdminSession: [] }] },
  { method: 'delete', path: '/api/v1/admin/connectivity/{connId}', tag: 'Admin Entities', summary: 'Delete connectivity point', security: [{ AdminSession: [] }] },
  { method: 'patch', path: '/api/v1/admin/competitors/{competitorId}', tag: 'Admin Entities', summary: 'Update competitor', security: [{ AdminSession: [] }] },
  { method: 'delete', path: '/api/v1/admin/competitors/{competitorId}', tag: 'Admin Entities', summary: 'Delete competitor', security: [{ AdminSession: [] }] },
  { method: 'patch', path: '/api/v1/admin/images/{imageId}', tag: 'Admin Entities', summary: 'Update image metadata', security: [{ AdminSession: [] }] },
  { method: 'delete', path: '/api/v1/admin/images/{imageId}', tag: 'Admin Entities', summary: 'Delete image', security: [{ AdminSession: [] }] },
  { method: 'delete', path: '/api/v1/admin/documents/{docId}', tag: 'Admin Entities', summary: 'Delete document', security: [{ AdminSession: [] }] },

  // Admin Builders & Leads & News
  { method: 'get', path: '/api/v1/admin/builders', tag: 'Admin Builders', summary: 'List all builders for admin', security: [{ AdminSession: [] }] },
  { method: 'post', path: '/api/v1/admin/builders', tag: 'Admin Builders', summary: 'Create new builder', requestSchema: { $ref: '#/components/schemas/Builder' }, security: [{ AdminSession: [] }] },
  { method: 'patch', path: '/api/v1/admin/builders/{id}', tag: 'Admin Builders', summary: 'Update builder', security: [{ AdminSession: [] }] },
  { method: 'delete', path: '/api/v1/admin/builders/{id}', tag: 'Admin Builders', summary: 'Delete builder', security: [{ AdminSession: [] }] },
  { method: 'get', path: '/api/v1/admin/leads', tag: 'Admin Leads', summary: 'Get all captured leads', security: [{ AdminSession: [] }] },
  { method: 'patch', path: '/api/v1/admin/leads/{id}', tag: 'Admin Leads', summary: 'Update lead status or notes', security: [{ AdminSession: [] }] },
  { method: 'get', path: '/api/v1/admin/news', tag: 'Admin News', summary: 'List builder news articles', security: [{ AdminSession: [] }] },
  { method: 'post', path: '/api/v1/admin/news', tag: 'Admin News', summary: 'Create builder news article', security: [{ AdminSession: [] }] },
  { method: 'patch', path: '/api/v1/admin/news/{id}', tag: 'Admin News', summary: 'Update builder news article', security: [{ AdminSession: [] }] },
  { method: 'delete', path: '/api/v1/admin/news/{id}', tag: 'Admin News', summary: 'Delete builder news article', security: [{ AdminSession: [] }] },

  // Admin Analytics & Tiers
  { method: 'get', path: '/api/v1/admin/analytics/summary', tag: 'Admin Analytics', summary: 'Analytics summary metrics', security: [{ AdminSession: [] }] },
  { method: 'get', path: '/api/v1/admin/analytics/properties', tag: 'Admin Analytics', summary: 'Analytics property event metrics', security: [{ AdminSession: [] }] },
  { method: 'get', path: '/api/v1/admin/analytics/quality', tag: 'Admin Analytics', summary: 'Data quality metrics', security: [{ AdminSession: [] }] },
  { method: 'get', path: '/api/v1/admin/analytics/users', tag: 'Admin Analytics', summary: 'User engagement analytics', security: [{ AdminSession: [] }] },
  { method: 'get', path: '/api/v1/admin/sector-tiers', tag: 'Admin Sector Intelligence', summary: 'List sector tiers and benchmark pricing', security: [{ AdminSession: [] }] },
  { method: 'get', path: '/api/v1/admin/channel-partners', tag: 'Admin Channel Partners', summary: 'List channel partners', security: [{ AdminSession: [] }] },

  // Public Analytics
  { method: 'post', path: '/api/v1/analytics/engagement', tag: 'Analytics', summary: 'Log chat user engagement interaction' },
  { method: 'post', path: '/api/v1/analytics/promotions', tag: 'Analytics', summary: 'Log promotional interaction' },
  { method: 'post', path: '/api/v1/analytics/property-event', tag: 'Analytics', summary: 'Track property view/interaction event' },

  // AQI & Commute
  { method: 'get', path: '/api/v1/aqi', tag: 'Location', summary: 'Get AQI data for sector/city' },
  { method: 'get', path: '/api/v1/commute', tag: 'Location', summary: 'Calculate commute distance and estimated times' },

  // Builders
  { method: 'get', path: '/api/v1/builders', tag: 'Builders', summary: 'Get list of builders' },
  { method: 'get', path: '/api/v1/builders/{slug}', tag: 'Builders', summary: 'Get builder details by slug', responseSchema: { $ref: '#/components/schemas/Builder' } },
  { method: 'get', path: '/api/v1/builder-reputation', tag: 'Builders', summary: 'Get builder reputation scores' },
  { method: 'post', path: '/api/v1/builder-registration', tag: 'Builder Tools', summary: 'Submit builder registration request' },
  { method: 'get', path: '/api/v1/builder-applications', tag: 'Builder Tools', summary: 'List builder application forms' },
  { method: 'get', path: '/api/v1/builder-applications/{id}', tag: 'Builder Tools', summary: 'Get builder application by ID' },
  { method: 'patch', path: '/api/v1/builder-applications/{id}', tag: 'Builder Tools', summary: 'Update builder application status' },

  // Chat & Sessions
  { method: 'post', path: '/api/v1/chat', tag: 'Chat', summary: 'Send message or action to AI advisor' },
  { method: 'delete', path: '/api/v1/chat/intent', tag: 'Chat', summary: 'Clear search intent for active chat session' },
  { method: 'get', path: '/api/v1/chat/session/list', tag: 'Chat', summary: 'List recent chat sessions' },
  { method: 'get', path: '/api/v1/chat/session', tag: 'Chat', summary: 'Get chat session details and message history', responseSchema: { $ref: '#/components/schemas/ChatSession' } },
  { method: 'patch', path: '/api/v1/chat/session/{id}', tag: 'Chat', summary: 'Update chat session metadata' },
  { method: 'delete', path: '/api/v1/chat/session/{id}', tag: 'Chat', summary: 'Delete chat session' },
  { method: 'post', path: '/api/v1/sessions/migrate', tag: 'Sessions', summary: 'Migrate guest chat session to authenticated user' },
  { method: 'get', path: '/api/v1/sessions/re-engagement/latest', tag: 'Sessions', summary: 'Get latest re-engagement state for user' },

  // Documents
  { method: 'get', path: '/api/v1/documents', tag: 'Documents', summary: 'List public project documents' },
  { method: 'post', path: '/api/v1/documents', tag: 'Documents', summary: 'Upload project document' },
  { method: 'post', path: '/api/v1/documents/ask', tag: 'Documents', summary: 'Ask question against project RAG documents' },

  // Intelligence
  { method: 'post', path: '/api/v1/intelligence/generate', tag: 'Intelligence', summary: 'Generate AI intelligence profile for project' },
  { method: 'get', path: '/api/v1/intelligence/{projectId}', tag: 'Intelligence', summary: 'Get project intelligence summary' },

  // Leads
  { method: 'post', path: '/api/v1/leads/callback', tag: 'Leads', summary: 'Request phone callback for a project', requestSchema: { $ref: '#/components/schemas/CallbackRequest' } },
  { method: 'post', path: '/api/v1/leads/site-visit', tag: 'Leads', summary: 'Schedule site visit request', requestSchema: { $ref: '#/components/schemas/SiteVisitRequest' } },
  { method: 'get', path: '/api/v1/leads/count', tag: 'Leads', summary: 'Get lead count metrics' },
  { method: 'post', path: '/api/v1/leads/webhook', tag: 'Leads', summary: 'Webhook endpoint for external lead ingest', security: [{ WebhookSecret: [] }] },

  // Market & Prices
  { method: 'get', path: '/api/v1/market-comparison', tag: 'Market', summary: 'Compare market metrics across projects or sectors' },
  { method: 'get', path: '/api/v1/registry-prices', tag: 'Market', summary: 'Get official registry transaction prices' },
  { method: 'post', path: '/api/v1/price-alerts', tag: 'Price Alerts', summary: 'Create price alert subscription', requestSchema: { $ref: '#/components/schemas/PriceAlert' } },
  { method: 'get', path: '/api/v1/price-alerts', tag: 'Price Alerts', summary: 'List price alert subscriptions' },
  { method: 'delete', path: '/api/v1/price-alerts', tag: 'Price Alerts', summary: 'Delete price alert subscription' },

  // Projects
  { method: 'get', path: '/api/v1/projects', tag: 'Projects', summary: 'Search and filter real estate projects' },
  { method: 'get', path: '/api/v1/projects/{slug}', tag: 'Projects', summary: 'Get full project detail by slug', responseSchema: { $ref: '#/components/schemas/Project' } },
  { method: 'get', path: '/api/v1/projects/{slug}/overview', tag: 'Projects', summary: 'Get project overview summary' },
  { method: 'get', path: '/api/v1/projects/{slug}/documents', tag: 'Projects', summary: 'Get project downloadable brochures and floor plans' },
  { method: 'get', path: '/api/v1/projects/{slug}/cost-sheet', tag: 'Projects', summary: 'Get pricing breakdown and cost sheet' },
  { method: 'get', path: '/api/v1/projects/{slug}/payment-plan', tag: 'Projects', summary: 'Get payment plan schedule' },
  { method: 'get', path: '/api/v1/projects/{slug}/investment', tag: 'Projects', summary: 'Get investment analysis and projected ROI' },

  // Saved Properties
  { method: 'get', path: '/api/v1/saved', tag: 'Saved', summary: 'List saved properties for active user' },
  { method: 'post', path: '/api/v1/saved', tag: 'Saved', summary: 'Save property to user favorites', requestSchema: { $ref: '#/components/schemas/SavedProperty' } },
  { method: 'delete', path: '/api/v1/saved/{id}', tag: 'Saved', summary: 'Remove property from saved list' },
  { method: 'get', path: '/api/v1/saved/{id}/check', tag: 'Saved', summary: 'Check if project is saved by user' },

  // Share & Transcribe
  { method: 'get', path: '/api/v1/share/{id}', tag: 'Utilities', summary: 'Get shared shortlist or property details' },
  { method: 'post', path: '/api/v1/transcribe', tag: 'Utilities', summary: 'Transcribe audio voice message for chat' },
];

// 4. Construct Swagger OpenAPI Object
const existingSwagger = fs.existsSync(swaggerPath)
  ? JSON.parse(fs.readFileSync(swaggerPath, 'utf8').replace(/^\uFEFF/, ''))
  : {};

const swaggerOutput: any = {
  openapi: '3.1.0',
  info: existingSwagger.info || {
    title: 'RealtyPals Backend API',
    description: 'AI-powered real estate advisor backend API. Provides complete single-source-of-truth endpoints for chat, property discovery, lead management, analytics, and admin operations.',
    version: '1.0.0',
    contact: {
      name: 'RealtyPals Team',
      email: 'team@realtypals.com',
    },
    license: {
      name: 'Private',
    },
  },
  servers: existingSwagger.servers || [
    { url: 'http://localhost:3001', description: 'Local development server' },
    { url: 'https://api.realtypals.com', description: 'Production server' },
  ],
  tags: existingSwagger.tags || [
    { name: 'Chat', description: 'Conversational AI advisor endpoints' },
    { name: 'Projects', description: 'Property and project information' },
    { name: 'Builders', description: 'Builder and company information' },
    { name: 'Leads', description: 'Lead capture and management' },
    { name: 'Analytics', description: 'Engagement and event tracking' },
    { name: 'Admin', description: 'Admin dashboard authentication & stats' },
    { name: 'Admin Projects', description: 'Admin project management & metadata' },
    { name: 'Admin Builders', description: 'Admin builder management' },
    { name: 'Admin Intelligence', description: 'Admin AI intelligence auditing' },
    { name: 'Admin Analytics', description: 'Admin quality and traffic analytics' },
    { name: 'Admin Entities', description: 'Admin sub-entity management (units, amenities, images)' },
    { name: 'Builder Tools', description: 'Builder registration and applications' },
    { name: 'Location', description: 'AQI and commute location utilities' },
    { name: 'Market', description: 'Market comparison & registry price data' },
    { name: 'Price Alerts', description: 'Price alert subscriptions' },
    { name: 'Saved', description: 'User saved properties & shortlists' },
    { name: 'Documents', description: 'Document search & RAG endpoints' },
    { name: 'Intelligence', description: 'Project intelligence profiles' },
    { name: 'Sessions', description: 'User & guest chat sessions' },
    { name: 'Utilities', description: 'Health checks and voice transcriptions' },
  ],
  paths: {},
  components: {
    schemas: componentSchemas,
    responses: existingSwagger.components?.responses || {
      BadRequest: { description: 'Invalid request parameters', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
      Unauthorized: { description: 'Authentication required or invalid token', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
      NotFound: { description: 'Resource not found', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
      TooManyRequests: { description: 'Rate limit exceeded', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
      InternalError: { description: 'Internal server error', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
    },
    securitySchemes: existingSwagger.components?.securitySchemes || {
      BearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT', description: 'Supabase JWT token in Authorization header' },
      AdminSession: { type: 'apiKey', in: 'header', name: 'Authorization', description: 'Bearer token from /admin/auth endpoint' },
      WebhookSecret: { type: 'apiKey', in: 'header', name: 'X-Webhook-Secret', description: 'Webhook secret header for lead webhooks' },
    },
  },
};

// Build Paths
routes.forEach(r => {
  const normPath = r.path.endsWith('/') && r.path.length > 7 ? r.path.slice(0, -1) : r.path;

  if (!swaggerOutput.paths[normPath]) {
    swaggerOutput.paths[normPath] = {};
  }

  const op: any = {
    tags: [r.tag],
    summary: r.summary,
    description: r.description || `${r.method.toUpperCase()} endpoint for ${normPath}`,
    responses: {
      '200': {
        description: 'Successful operation',
        content: {
          'application/json': {
            schema: r.responseSchema || { type: 'object', additionalProperties: true },
          },
        },
      },
      '400': { $ref: '#/components/responses/BadRequest' },
      '401': { $ref: '#/components/responses/Unauthorized' },
      '500': { $ref: '#/components/responses/InternalError' },
    },
  };

  if (r.security) {
    op.security = r.security;
  }

  // Extract path params
  const paramMatches = normPath.match(/\{([a-zA-Z0-9_]+)\}/g);
  if (paramMatches || r.params) {
    op.parameters = r.params || paramMatches?.map(p => ({
      name: p.replace(/\{|\}/g, ''),
      in: 'path',
      required: true,
      schema: { type: 'string' },
    }));
  }

  // Request Body for state mutation methods
  if (['post', 'put', 'patch'].includes(r.method)) {
    op.requestBody = {
      required: true,
      content: {
        'application/json': {
          schema: r.requestSchema || { type: 'object', additionalProperties: true },
        },
      },
    };
  }

  swaggerOutput.paths[normPath][r.method] = op;
});

// 5. Save swagger.json
fs.writeFileSync(swaggerPath, JSON.stringify(swaggerOutput, null, 2), 'utf8');
console.log(`Swagger generation completed!`);
console.log(`- Saved to: ${swaggerPath}`);
console.log(`- Path templates: ${Object.keys(swaggerOutput.paths).length}`);
console.log(`- Component Schemas: ${Object.keys(swaggerOutput.components.schemas).length}`);
