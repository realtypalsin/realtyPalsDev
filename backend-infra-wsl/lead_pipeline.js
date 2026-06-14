const { registerWorker, TriggerAction } = require('iii-sdk');

// Connect the worker directly to the running engine
const iii = registerWorker('ws://127.0.0.1:49134');

async function startLeadPipeline() {
    console.log("[RealtyPals] Connected to III Engine.");

    // --- 1. THE QUEUE CONSUMER (Heavy Lifting) ---
    // Pass the function name directly as a string: 'leads.process_inquiry'
    iii.registerFunction('leads.process_inquiry', async (input) => {
        const { name, propertyOfInterest } = input;

        console.log(`[Queue] AI Analyzing lead: ${name} for ${propertyOfInterest}...`);

        // Simulate AI thinking time
        await new Promise(resolve => setTimeout(resolve, 2000));

        console.log(`[Queue] Lead processed successfully!`);

        return { status: "processed", lead: name };
    });

    iii.registerTrigger({
        type: 'queue',
        function_id: 'leads.process_inquiry',
        config: {
            topic: 'lead-processing'
        }
    });

    // --- 2. THE HTTP TRIGGER (The API Endpoint) ---
    // Pass the function name directly as a string: 'leads.receive_webhook'
    iii.registerFunction('leads.receive_webhook', async (req) => {
        const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;

        console.log(`[HTTP] New inquiry received from ${body?.name || 'Anonymous'}`);

        await iii.trigger({
            function_id: 'leads.process_inquiry',
            payload: body,
            action: TriggerAction.Enqueue({ queue: 'lead-processing' })
        });

        return {
            status_code: 200,
            headers: { "Content-Type": "application/json" },
            body: { message: "Lead received! AI processing started." }
        };
    });

    iii.registerTrigger({
        type: 'http',
        function_id: 'leads.receive_webhook',
        config: {
            api_path: '/api/leads/new',
            http_method: 'POST'
        }
    });

    console.log("[RealtyPals] Lead Pipeline is Online. Listening on /api/leads/new");
}

startLeadPipeline();