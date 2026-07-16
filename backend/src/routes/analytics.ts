import express, { Request, Response } from 'express'
import { prisma } from '../lib/db'
import { z } from 'zod'

const router = express.Router()

// POST /api/v1/analytics/engagement
const EngagementSchema = z.object({
  session_id: z.string(),
  event: z.string(),
  project_id: z.string().optional(),
  drop_off_stage: z.string().optional(),
  idle_seconds: z.number().optional(),
})

router.post('/engagement', async (req: Request, res: Response) => {
  try {
    const data = EngagementSchema.parse(req.body)
    
    // Check if the chat analytics record exists
    const chatAnalytics = await prisma.chatAnalytics.findFirst({
      where: { session_id: data.session_id }
    })

    if (!chatAnalytics) {
      // If no analytics record exists yet, we should create it
      await prisma.chatAnalytics.create({
        data: {
          session_id: data.session_id,
          chat_started_at: new Date(),
        }
      })
    }

    if (data.event === 'drop_off') {
      await prisma.chatAnalytics.updateMany({
        where: { session_id: data.session_id },
        data: {
          drop_off_at: new Date(),
          drop_off_stage: data.drop_off_stage || 'unknown',
          idle_seconds_before_drop_off: data.idle_seconds || 0,
        }
      })
      console.log(`[analytics] Drop-off recorded for session ${data.session_id} at stage ${data.drop_off_stage}`)
    } else if (data.event === 'first_engagement') {
      await prisma.chatAnalytics.updateMany({
        where: { session_id: data.session_id },
        data: { first_engagement_at: new Date() }
      })
      if (data.project_id) {
        // Also record a property event if project_id is provided
        await prisma.propertyEvent.create({
          data: {
            session_id: data.session_id,
            project_id: data.project_id,
            action: 'first_engagement',
          }
        })
      }
    }

    res.status(200).json({ success: true })
  } catch (err) {
    console.error('[analytics/engagement]', err)
    res.status(400).json({ error: 'Invalid payload' })
  }
})

// POST /api/v1/analytics/promotions
const PromotionsSchema = z.object({
  action: z.enum(['impression', 'click']),
  promotional_id: z.string(),
  session_id: z.string(),
  user_id: z.string().optional(),
  guest_token: z.string().optional(),
})

router.post('/promotions', async (req: Request, res: Response) => {
  try {
    const data = PromotionsSchema.parse(req.body)
    console.log(`[analytics] Promotion ${data.action} for ${data.promotional_id} in session ${data.session_id}`)
    res.status(200).json({ success: true })
  } catch (err) {
    console.error('[analytics/promotions]', err)
    res.status(400).json({ error: 'Invalid payload' })
  }
})

// POST /api/v1/analytics/property-event
const PropertyEventSchema = z.object({
  project_id: z.string(),
  action: z.string(),
  session_id: z.string().nullable().optional(),
  user_id: z.string().nullable().optional(),
  guest_token: z.string().nullable().optional(),
  metadata: z.record(z.any()).optional(),
})

router.post('/property-event', async (req: Request, res: Response) => {
  try {
    const data = PropertyEventSchema.parse(req.body)
    
    // We only log if we have a session_id to associate it with
    if (data.session_id) {
      await prisma.propertyEvent.create({
        data: {
          session_id: data.session_id,
          project_id: data.project_id,
          action: data.action,
          user_id: data.user_id || undefined,
          guest_token: data.guest_token || undefined,
        }
      })
    }
    
    res.status(200).json({ success: true })
  } catch (err) {
    console.error('[analytics/property-event]', err)
    res.status(400).json({ error: 'Invalid payload' })
  }
})

export default router
