const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const session = await prisma.chatSession.findUnique({
        where: { id: "978352f7-c387-41b6-8bf6-15b4e6d0449e" }
    });
    console.log("Session exists in DB?", session !== null);
    
    // Create a valid session manually, then test updating it with a fake ID
    const newSession = await prisma.chatSession.create({
        data: {
            id: "12345678-1234-1234-1234-123456789012",
            guest_token: "test-guest-token-123",
            title: "Test Session",
            chat_phase: "COLD",
            message_count: 0
        }
    });
    console.log("Created valid session");
    
    try {
        await prisma.chatSession.update({
            where: { id: "978352f7-c387-41b6-8bf6-15b4e6d0449e" },
            data: { message_count: 1 }
        });
    } catch(e) {
        console.log("Expected Prisma Error on missing ID update:", e.message);
    }
}
main().catch(console.error).finally(() => prisma.$disconnect());
