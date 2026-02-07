import 'dotenv/config'

// Test the chat API endpoint with a session cookie
const SESSION_TOKEN = '28372bf4b7c13635587764a4a46b140d42da901124988fef77d2f243ee215253'

async function testChatAPI() {
  console.log('Testing Chat API at http://localhost:3000/api/chat')
  
  const response = await fetch('http://localhost:3000/api/chat', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Cookie': `next-auth.session-token=${SESSION_TOKEN}`
    },
    body: JSON.stringify({
      messages: [
        { role: 'user', content: 'What event types do I have?' }
      ]
    })
  })
  
  console.log('Response status:', response.status)
  const data = await response.json()
  console.log('Response data:', JSON.stringify(data, null, 2))
  
  // Test another query
  console.log('\n--- Testing "Show my bookings" ---')
  const response2 = await fetch('http://localhost:3000/api/chat', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Cookie': `next-auth.session-token=${SESSION_TOKEN}`
    },
    body: JSON.stringify({
      messages: [
        { role: 'user', content: 'Show my upcoming bookings' }
      ]
    })
  })
  
  console.log('Response status:', response2.status)
  const data2 = await response2.json()
  console.log('Response data:', JSON.stringify(data2, null, 2))
}

testChatAPI().catch(console.error)
