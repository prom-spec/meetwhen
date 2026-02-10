import {
  Body,
  Button,
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

interface BookingRescheduleProps {
  recipientName: string
  otherPartyName: string
  eventTitle: string
  oldStartTime: string
  oldEndTime: string
  newStartTime: string
  newEndTime: string
  timezone: string
  rescheduledBy: "host" | "guest"
  isHost: boolean
  bookingUrl: string
  meetingUrl?: string | null
  location?: string | null
}

export default function BookingReschedule({
  recipientName,
  otherPartyName,
  eventTitle,
  oldStartTime,
  oldEndTime,
  newStartTime,
  newEndTime,
  timezone,
  rescheduledBy,
  isHost,
  bookingUrl,
  meetingUrl,
  location,
}: BookingRescheduleProps) {
  const reschedulerDescription = rescheduledBy === "host" 
    ? (isHost ? "You" : otherPartyName)
    : (isHost ? otherPartyName : "You")

  return (
    <Html>
      <Head />
      <Preview>Your meeting has been rescheduled</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>Meeting Rescheduled 📅</Heading>
          
          <Text style={text}>Hi {recipientName},</Text>
          
          <Text style={text}>
            {reschedulerDescription} {reschedulerDescription === "You" ? "have" : "has"} rescheduled the following meeting:
          </Text>

          <Section style={eventBox}>
            <Text style={eventTitleStyle}>{eventTitle}</Text>
            
            <Text style={labelText}>Previous time (cancelled):</Text>
            <Text style={oldTimeText}>
              ❌ {oldStartTime} - {oldEndTime}
            </Text>
            
            <Text style={labelText}>New time:</Text>
            <Text style={newTimeText}>
              ✅ {newStartTime} - {newEndTime}
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

          <Section style={buttonContainer}>
            <Button style={button} href={bookingUrl}>
              View Booking Details
            </Button>
          </Section>

          <Hr style={hr} />

          <Text style={footerText}>
            Need to make more changes?{" "}
            <Link href={bookingUrl} style={link}>Manage your booking</Link>
          </Text>

          <Text style={footerText}>
            — letsmeet.link
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

const eventTitleStyle = {
  color: "#1a1a1a",
  fontSize: "18px",
  fontWeight: "600",
  margin: "0 0 16px",
}

const labelText = {
  color: "#6b7280",
  fontSize: "12px",
  fontWeight: "600",
  textTransform: "uppercase" as const,
  letterSpacing: "0.05em",
  margin: "12px 0 4px",
}

const oldTimeText = {
  color: "#9ca3af",
  fontSize: "14px",
  lineHeight: "20px",
  margin: "0 0 8px",
  textDecoration: "line-through",
}

const newTimeText = {
  color: "#059669",
  fontSize: "14px",
  fontWeight: "600",
  lineHeight: "20px",
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

const buttonContainer = {
  textAlign: "center" as const,
  margin: "24px 0",
}

const button = {
  backgroundColor: "#3B82F6",
  borderRadius: "6px",
  color: "#ffffff",
  fontSize: "14px",
  fontWeight: "600",
  textDecoration: "none",
  textAlign: "center" as const,
  padding: "12px 24px",
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
