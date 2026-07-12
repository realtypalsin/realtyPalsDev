const fs = require('fs');

let adminFile = fs.readFileSync('backend/src/routes/admin.ts', 'utf-8');

const propertiesRoute = `
router.get('/analytics/properties', async (req: Request, res: Response): Promise<void> => {
  try {
    const events = await prisma.propertyEvent.findMany({
      include: {
        project: { select: { name: true } }
      }
    })

    const propertiesMap = new Map<string, any>()
    for (const ev of events) {
      if (!ev.project_id || !ev.project) continue
      if (!propertiesMap.has(ev.project_id)) {
        propertiesMap.set(ev.project_id, {
          projectId: ev.project_id,
          projectName: ev.project.name,
          views: 0,
          saves: 0,
          comparisons: 0,
          shares: 0,
          whatsappInquiries: 0
        })
      }
      const data = propertiesMap.get(ev.project_id)
      if (ev.action === 'view') data.views++
      if (ev.action === 'save') data.saves++
      if (ev.action === 'compare') data.comparisons++
      if (ev.action === 'share') data.shares++
      if (ev.action === 'whatsapp') data.whatsappInquiries++
    }

    const properties = Array.from(propertiesMap.values()).sort((a, b) => (b.views + b.saves) - (a.views + a.saves))

    res.json({ properties })
  } catch (err) {
    console.error('[analytics/properties]', err)
    res.status(500).json({ error: 'Internal error' })
  }
})

export default router
`;

adminFile = adminFile.replace('export default router', propertiesRoute);

fs.writeFileSync('backend/src/routes/admin.ts', adminFile);
