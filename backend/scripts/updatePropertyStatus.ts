import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import Groq from 'groq-sdk';

const prisma = new PrismaClient();
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

async function run() {
  if (!process.env.GROQ_API_KEY) {
    console.error("Missing GROQ_API_KEY");
    process.exit(1);
  }

  const projects = await prisma.project.findMany({
    where: { status: 'under_construction' },
    include: { builder: true }
  });

  console.log(`Checking ${projects.length} under construction projects...`);

  for (const project of projects) {
    console.log(`Checking status for ${project.name} by ${project.builder.name}...`);
    
    const prompt = `Is the real estate project "${project.name}" by "${project.builder.name}" in Noida/Greater Noida completed and ready to move, or is it still under construction? Reply with exactly 'ready_to_move', 'under_construction', or 'unknown'. Do not include any other text.`;

    try {
      const response = await groq.chat.completions.create({
        messages: [{ role: 'user', content: prompt }],
        model: 'llama-3.3-70b-versatile',
        temperature: 0,
      });

      const ans = response.choices[0]?.message?.content?.trim().toLowerCase();
      
      if (ans === 'ready_to_move') {
        console.log(`✅ AI says ${project.name} is ready! Updating DB...`);
        await prisma.project.update({
          where: { id: project.id },
          data: { status: 'ready_to_move' }
        });
      } else {
        console.log(`⏳ Status: ${ans}`);
      }
    } catch (e) {
      console.error(`Error querying Groq for ${project.name}:`, e);
    }
    
    await new Promise(r => setTimeout(r, 1000));
  }
}

run()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
