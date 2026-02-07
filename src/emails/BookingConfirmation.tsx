import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Section,
  Text,
  Hr,
} from "@react-email/components"
import * as React from "react"

interface BookingConfirmationProps {
  guestName: string
  hostName: string
  eventTitle: string
  startTime: string
  endTime: string
  timezone: string
  meetingUrl?: string | null
  location?: string | null
}

export default function BookingConfirmation({
  guestName,
  hostName,
  eventTitle,
  startTime,
  endTime,
  timezone,
  meetingUrl,
  location,
}: BookingConfirmationProps) {
  return (
    <Html>
      <Head />
      <Preview>Your booking with {hostName} is confirmed</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>Booking Confirmed! ✓</Heading>
          
          <Text style={text}>Hi {guestName},</Text>
          
          <Text style={text}>
            Your meeting with <strong>{hostName}</strong> has been confirmed.
          </Text>

          <Section style={eventBox}>
            <Text style={eventTitleStyle}>{eventTitle}</Text>
            <Text style={eventDetails}>
              📅 {startTime} - {endTime}
            </Text>
            <Text style={eventDetails}>
              🌍 {timezone}
            </Text>
            {location && (
              <Text style={eventDetails}>
                📍 {location}
              </Text>
            )}
            {meetingUrl && (
              <Text style={eventDetails}>
                🔗 <Link href={meetingUrl} style={link}>Join Meeting</Link>
              </Text>
            )}
          </Section>

          <Hr style={hr} />

          <Text style={footerText}>
            Need to make changes? Contact {hostName} directly to reschedule or cancel.
          </Text>

          <Text style={footerText}>
            — MeetWhen
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

const main = {
  backgroundColor: "#f6f9fc",
  fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
}

const container = {
  backgroundColor: "#ffffff",
  margin: "0 auto",
  padding: "40px 20px",
  borderRadius: "8px",
  maxWidth: "560px",
}

const h1 = {
  color: "#1a1a1a",
  fontSize: "24px",
  fontWeight: "600",
  lineHeight: "40px",
  margin: "0 0 20px",
}

const text = {
  color: "#484848",
  fontSize: "16px",
  lineHeight: "24px",
  margin: "0 0 16px",
}

const eventBox = {
  backgroundColor: "#f9fafb",
  border: "1px solid #e5e7eb",
  borderRadius: "8px",
  padding: "20px",
  margin: "24px 0",
}

const eventTitle = {
  color: "#1a1a1a",
  fontSize: "18px",
  fontWeight: "600",
  margin: "0 0 12px",
}

const eventDetails = {
  color: "#484848",
  fontSize: "14px",
  lineHeight: "20px",
  margin: "4px 0",
}

const link = {
  color: "#3B82F6",
  textDecoration: "none",
}

const hr = {
  borderColor: "#e5e7eb",
  margin: "24px 0",
}

const footerText = {
  color: "#6b7280",
  fontSize: "14px",
  lineHeight: "20px",
  margin: "0 0 8px",
}
