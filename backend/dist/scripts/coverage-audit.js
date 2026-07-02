"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const db_1 = require("../lib/db");
const SECTORS = [
    'Sector 150', 'Sector 137', 'Sector 143', 'Sector 144',
    'Sector 128', 'Sector 129', 'Sector 107', 'Sector 106',
    'Sector 79', 'Sector 78', 'Sector 152'
];
async function main() {
    for (const sector of SECTORS) {
        const projects = await db_1.prisma.project.findMany({
            where: { sector: { contains: sector, mode: 'insensitive' } },
            include: {
                builder: { select: { name: true } },
                unit_types: { select: { price_min_cr: true, bhk: true } }
            },
            orderBy: { name: 'asc' }
        });
        console.log(`\n=== ${sector} (${projects.length} projects) ===`);
        for (const p of projects) {
            const prices = p.unit_types
                .filter((u) => u.price_min_cr != null)
                .map((u) => u.price_min_cr);
            const bhks = [...new Set(p.unit_types.map((u) => u.bhk))].sort().join('/');
            const minP = prices.length ? Math.min(...prices) : null;
            const maxP = prices.length ? Math.max(...prices) : null;
            const priceStr = minP != null ? `Rs${minP.toFixed(2)}-${maxP != null ? maxP.toFixed(2) : '?'}Cr` : 'price-na';
            console.log(`  ${p.name} | ${p.builder.name} | ${bhks}BHK | ${priceStr} | ${p.status} | rera:${p.rera_number ? 'yes' : 'no'} | img:${p.hero_image_url ? 'yes' : 'no'}`);
        }
    }
    const allProjects = await db_1.prisma.project.findMany({
        include: { builder: { select: { name: true } } }
    });
    console.log(`\n=== TOTAL DB ===`);
    console.log(`Total projects: ${allProjects.length}`);
    const builders = [...new Set(allProjects.map((p) => p.builder.name))];
    console.log(`Total builders (${builders.length}): ${builders.sort().join(', ')}`);
    await db_1.prisma.$disconnect();
}
main().catch(e => { console.error(e); process.exit(1); });
