import express from 'express';
import chatRouter from '../src/routes/chat';
import sessionsRouter from '../src/routes/sessions';
import projectsRouter from '../src/routes/projects';
import savedRouter from '../src/routes/saved';
import leadsRouter from '../src/routes/leads';
import adminRouter from '../src/routes/admin';
import buildersRouter from '../src/routes/builders';
import marketComparisonRouter from '../src/routes/marketComparison';
import priceAlertsRouter from '../src/routes/priceAlerts';
import aqiRouter from '../src/routes/aqi';
import commuteRouter from '../src/routes/commute';
import builderReputationRouter from '../src/routes/builderReputation';
import transcribeRouter from '../src/routes/transcribe';
import documentsRouter from '../src/routes/documents';
import registryPricesRouter from '../src/routes/registryPrices';
import builderRegistrationRouter from '../src/routes/builderRegistration';
import builderApplicationsRouter from '../src/routes/builderApplications';
import analyticsRouter from '../src/routes/analytics';

const app = express();
const routes: any[] = [];

const map = {
  chatRouter: '/api/v1/chat',
  sessionsRouter: '/api/v1/sessions',
  projectsRouter: '/api/v1/projects',
  savedRouter: '/api/v1/saved',
  leadsRouter: '/api/v1/leads',
  adminRouter: '/api/v1/admin',
  buildersRouter: '/api/v1/builders',
  marketComparisonRouter: '/api/v1/market-comparison',
  priceAlertsRouter: '/api/v1/price-alerts',
  aqiRouter: '/api/v1/aqi',
  commuteRouter: '/api/v1/commute',
  builderReputationRouter: '/api/v1/builder-reputation',
  transcribeRouter: '/api/v1/transcribe',
  documentsRouter: '/api/v1/documents',
  registryPricesRouter: '/api/v1/registry-prices',
  builderRegistrationRouter: '/api/v1/builder-registration',
  builderApplicationsRouter: '/api/v1/builder-applications',
  analyticsRouter: '/api/v1/analytics',
};

function extract(router: any, basePath: string) {
  router.stack.forEach((layer: any) => {
    if (layer.route) {
      const methods = Object.keys(layer.route.methods).join(', ').toUpperCase();
      routes.push({ method: methods, path: basePath + layer.route.path });
    } else if (layer.name === 'router' && layer.handle.stack) {
      // nested
      const match = layer.regexp.source.match(/\^\/([a-zA-Z0-9_\-]+)\//);
      let nestedPath = basePath;
      if (match) nestedPath += '/' + match[1];
      extract(layer.handle, nestedPath);
    }
  });
}

extract(chatRouter, map.chatRouter);
extract(sessionsRouter, map.sessionsRouter);
extract(projectsRouter, map.projectsRouter);
extract(savedRouter, map.savedRouter);
extract(leadsRouter, map.leadsRouter);
extract(adminRouter, map.adminRouter);
extract(buildersRouter, map.buildersRouter);
extract(marketComparisonRouter, map.marketComparisonRouter);
extract(priceAlertsRouter, map.priceAlertsRouter);
extract(aqiRouter, map.aqiRouter);
extract(commuteRouter, map.commuteRouter);
extract(builderReputationRouter, map.builderReputationRouter);
extract(transcribeRouter, map.transcribeRouter);
extract(documentsRouter, map.documentsRouter);
extract(registryPricesRouter, map.registryPricesRouter);
extract(builderRegistrationRouter, map.builderRegistrationRouter);
extract(builderApplicationsRouter, map.builderApplicationsRouter);
extract(analyticsRouter, map.analyticsRouter);

routes.sort((a,b) => a.path.localeCompare(b.path));
routes.forEach(r => {
  console.log(r.method.padEnd(8) + r.path);
});
