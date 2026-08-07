import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { createDirectChatHandler } from './chat-endpoint-handler'

describe('chat endpoint handler', () => {
  it('should wrap chat route handler', async () => {
    // Mock chat route that returns a simple response
    const mockChatRoute = async () => {
      return new Response(
        JSON.stringify({
          response: 'Found 3 properties in Sector 150',
          projectIds: [1, 2, 3],
        }),
        {
          headers: { 'Content-Type': 'application/json' },
        },
      )
    }

    const handler = await createDirectChatHandler(mockChatRoute)
    const result = await handler('Show 3BHK in Sector 150')

    assert(result.includes('3 properties') || result.includes('Sector 150'))
  })

  it('should parse SSE streaming responses', async () => {
    const sseResponse = `data: {"type":"content_block_start","content_block":{"type":"text"}}
data: {"type":"content_block_delta","delta":{"type":"text_delta","text":"Found "}}
data: {"type":"content_block_delta","delta":{"type":"text_delta","text":"3 properties"}}
data: {"type":"message_stop"}
`

    const mockChatRoute = async () => {
      return new Response(sseResponse, {
        headers: { 'Content-Type': 'text/event-stream' },
      })
    }

    const handler = await createDirectChatHandler(mockChatRoute)
    const result = await handler('Show properties')

    assert(result.includes('Found') && result.includes('3 properties'))
  })

  it('should handle errors gracefully', async () => {
    const mockChatRoute = async () => {
      throw new Error('Handler failed')
    }

    const handler = await createDirectChatHandler(mockChatRoute)

    try {
      await handler('Test query')
      assert.fail('Should have thrown')
    } catch (err) {
      assert(err instanceof Error)
      assert(err.message.includes('Handler failed') || err.message.includes('failed'))
    }
  })

  it('should handle JSON response format', async () => {
    const mockChatRoute = async () => {
      return new Response(
        JSON.stringify({
          content: 'Godrej Palm Retreat and Oberoi Realty are top choices.',
        }),
        {
          headers: { 'Content-Type': 'application/json' },
        },
      )
    }

    const handler = await createDirectChatHandler(mockChatRoute)
    const result = await handler('Compare builders')

    assert(result.length > 0)
  })
})
