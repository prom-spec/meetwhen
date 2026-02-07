import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import { PrismaNeon } from '@prisma/adapter-neon'
import crypto from 'crypto'

const connectionString = process.env.DATABASE_URL
if (!connectionString) {
  throw new Error('DATABASE_URL environment variable is not set')
}

const adapter = new PrismaNeon({ connectionString })
const prisma = new PrismaClient({ adapter })

async function main() {
  // Create or get test user
  let user = await prisma.user.findUnique({
    where: { email: 'test@example.com' }
  })
  
  if (!user) {
    user = await prisma.user.create({
      data: {
        id: 'test-user-id',
        email: 'test@example.com',
        name: 'Test User',
        username: 'testuser',
        timezone: 'America/New_York'
      }
    })
    console.log('Created test user:', user.id)
    
    // Create some event types
    await prisma.eventType.createMany({
      data: [
        { id: 'et1', userId: user.id, title: '30 Minute Meeting', slug: '30-min', duration: 30 },
        { id: 'et2', userId: user.id, title: 'Quick Chat', slug: 'quick-chat', duration: 15 },
        { id: 'et3', userId: user.id, title: 'Extended Session', slug: 'extended', duration: 60, isActive: false },
      ]
    })
    console.log('Created event types')
    
    // Create some availability
    await prisma.availability.createMany({
      data: [
        { userId: user.id, dayOfWeek: 1, startTime: '09:00', endTime: '17:00' },
        { userId: user.id, dayOfWeek: 2, startTime: '09:00', endTime: '17:00' },
        { userId: user.id, dayOfWeek: 3, startTime: '09:00', endTime: '17:00' },
        { userId: user.id, dayOfWeek: 4, startTime: '09:00', endTime: '17:00' },
        { userId: user.id, dayOfWeek: 5, startTime: '09:00', endTime: '17:00' },
      ]
    })
    console.log('Created availability')
  } else {
    console.log('Test user already exists:', user.id)
  }
  
  // Create a session for this user (expires in 1 day)
  const sessionToken = crypto.randomBytes(32).toString('hex')
  const session = await prisma.session.create({
    data: {
      sessionToken,
      userId: user.id,
      expires: new Date(Date.now() + 24 * 60 * 60 * 1000)
    }
  })
  console.log('Created session token:', sessionToken)
  
  // Now test the chat API directly
  console.log('\n--- Testing Chat API ---')
  
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID
  const aiToken = process.env.CLOUDFLARE_AI_TOKEN
  
  if (!accountId || !aiToken) {
    console.error('Missing CLOUDFLARE_ACCOUNT_ID or CLOUDFLARE_AI_TOKEN')
    return
  }
  
  const SYSTEM_PROMPT = `You are MeetWhen assistant. ONLY help with: scheduling meetings, managing availability, understanding bookings.
For ANY other topic, respond: "I can only help with MeetWhen scheduling features."

You have access to these functions:
- get_event_types: List all event types
- get_bookings: Get upcoming bookings

When the user asks to perform an action, use the appropriate function. Always be helpful and concise.`

  const functions = [
    {
      name: "get_event_types",
      description: "List all event types configured by the user",
      parameters: { type: "object", properties: {}, required: [] },
    },
    {
      name: "get_bookings",
      description: "Get upcoming bookings",
      parameters: { type: "object", properties: {}, required: [] },
    },
  ]

  const messages = [
    { role: "system", content: SYSTEM_PROMPT },
    { role: "user", content: "What event types do I have?" }
  ]

  const response = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/@cf/meta/llama-3-8b-instruct`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${aiToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messages,
        tools: functions.map((f) => ({
          type: "function",
          function: { name: f.name, description: f.description, parameters: f.parameters },
        })),
      }),
    }
  )

  const data = await response.json()
  console.log('Response status:', response.status)
  console.log('Response data:', JSON.stringify(data, null, 2))
  
  if (data.result?.tool_calls) {
    console.log('\nAI wants to call function:', data.result.tool_calls[0].function.name)
    
    // Execute the function
    const eventTypes = await prisma.eventType.findMany({
      where: { userId: user.id },
      select: { id: true, title: true, slug: true, duration: true, isActive: true },
    })
    console.log('Event types found:', JSON.stringify(eventTypes, null, 2))
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
