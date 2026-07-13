const fs = require('fs');

let indexTs = fs.readFileSync('backend/src/index.ts', 'utf-8');

if (!indexTs.includes("import builderApplicationsRouter from './routes/builderApplications'")) {
  indexTs = indexTs.replace(
    "import builderRegistrationRouter from './routes/builderRegistration'",
    "import builderRegistrationRouter from './routes/builderRegistration'\nimport builderApplicationsRouter from './routes/builderApplications'"
  );
  
  indexTs = indexTs.replace(
    "app.use('/api/v1/builder-registration', builderRegistrationRouter)",
    "app.use('/api/v1/builder-registration', builderRegistrationRouter)\napp.use('/api/v1/builder-applications', builderApplicationsRouter)"
  );
  
  fs.writeFileSync('backend/src/index.ts', indexTs);
}
