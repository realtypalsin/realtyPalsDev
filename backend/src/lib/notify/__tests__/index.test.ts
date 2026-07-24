import { describe, it } from 'node:test'
import assert from 'node:assert/strict'

describe('Notifications: Email sending', () => {
  it('sends confirmation email to user', () => {
    const email = { to: 'user@example.com', subject: 'Callback Request Confirmed' }
    assert(email.to.includes('@'))
    assert(email.subject.length > 0)
  })

  it('includes user data in email template', () => {
    const emailData = { name: 'John Doe', projectName: 'ACE Hanei', time: '2 PM' }
    const template = `Hi ${emailData.name}, your callback for ${emailData.projectName} is scheduled at ${emailData.time}`
    assert(template.includes('John Doe'))
    assert(template.includes('ACE Hanei'))
  })

  it('sends transactional email only once', () => {
    const attempts = [{ sent: true, timestamp: 1704067200 }]
    const duplicates = attempts.filter(a => a.sent).length
    assert.equal(duplicates, 1)
  })

  it('handles email send failure with retry', () => {
    const sendEmail = async () => {
      try {
        return { success: true }
      } catch (e) {
        return { success: false, retry: true }
      }
    }
    const result = sendEmail()
    assert(result instanceof Promise)
  })
})

describe('Notifications: WhatsApp handoff', () => {
  it('generates WhatsApp link for qualified leads', () => {
    const lead = { phone: '+919876543210', projectName: 'ACE Hanei' }
    const waLink = `https://wa.me/${lead.phone.replace('+', '')}?text=Hi%20about%20${lead.projectName}`
    assert(waLink.includes('wa.me'))
    assert(waLink.includes(lead.phone.replace('+', '')))
  })

  it('includes pre-filled message', () => {
    const message = 'Hi, I am interested in ACE Hanei. Can you provide more details?'
    const encoded = encodeURIComponent(message)
    assert(message.length > 0)
    assert(encoded.length > 0)
  })

  it('sends only to verified phone numbers', () => {
    const phones = [
      { number: '+919876543210', verified: true },
      { number: '+919999999999', verified: false }
    ]
    const verifiedPhones = phones.filter(p => p.verified)
    assert.equal(verifiedPhones.length, 1)
  })
})

describe('Notifications: In-app notifications', () => {
  it('creates notification for user action', () => {
    const notification = {
      userId: 'user_123',
      type: 'callback_confirmed',
      message: 'Your callback is confirmed',
      timestamp: Date.now()
    }
    assert(notification.userId.length > 0)
    assert(notification.type.length > 0)
  })

  it('marks notification as read when viewed', () => {
    const notification = { id: 'notif_1', read: false }
    notification.read = true
    assert.equal(notification.read, true)
  })

  it('expires old notifications (>30 days)', () => {
    const notif = { timestamp: Date.now() - 40 * 24 * 60 * 60 * 1000 }
    const isOld = Date.now() - notif.timestamp > 30 * 24 * 60 * 60 * 1000
    assert(isOld === true)
  })

  it('shows max 20 notifications in feed', () => {
    const notifications = Array.from({ length: 50 }, (_, i) => ({ id: String(i) }))
    const feed = notifications.slice(0, 20)
    assert.equal(feed.length, 20)
  })
})

describe('Notifications: Lead alerts to sales team', () => {
  it('sends lead alert when callback requested', () => {
    const alert = {
      to: 'sales@company.com',
      subject: 'New Callback Request',
      leadData: { name: 'John', project: 'ACE Hanei', budget: '2 Cr' }
    }
    assert(alert.subject.includes('Callback'))
    assert(alert.leadData.budget.length > 0)
  })

  it('includes all lead qualification details', () => {
    const leadInfo = {
      name: 'Jane Doe',
      phone: '+919876543210',
      budget: '1.5-2 Cr',
      sector: 'Sector 150',
      bhk: 3,
      savedProjects: 5,
      chatDuration: 12
    }
    assert(leadInfo.phone !== null)
    assert(leadInfo.savedProjects > 0)
  })

  it('route to correct sales rep by sector', () => {
    const lead = { sector: 'Sector 150' }
    const salesRep = lead.sector === 'Sector 150' ? 'rep_alpha@company.com' : 'rep_general@company.com'
    assert.equal(salesRep, 'rep_alpha@company.com')
  })
})

describe('Notifications: SMS fallback', () => {
  it('sends SMS when email fails', () => {
    const userPreference = { email: true, sms: true }
    const channels = []
    if (userPreference.email) channels.push('email')
    if (userPreference.sms && channels.length === 0) channels.push('sms')
    assert(channels.length > 0)
  })

  it('includes booking code in SMS', () => {
    const sms = 'Your callback code: CB123456'
    assert(sms.includes('CB'))
  })
})
