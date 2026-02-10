import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text,
  Hr,
} from "@react-email/components"
import * as React from "react"

interface BookingCancellationProps {
  recipientName: string
  otherPartyName: string
  eventTitle: string
  startTime: string
  endTime: string
  timezone: string
  cancelledBy: "host" | "guest"
  isHost: boolean
}

export default function BookingCancellation({
  recipientName,
  otherPartyName,
  eventTitle,
  startTime,
  endTime,
  timezone,
  cancelledBy,
  isHost,
}: BookingCancellationProps) {
  const cancellerDescription = cancelledBy === "host" 
    ? (isHost ? "You" : otherPartyName)
    : (isHost ? otherPartyName : "You")

  return (
    <Html>
      <Head />
      <Preview>Your meeting has been cancelled</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>Meeting Cancelled</Heading>
          
          <Text style={text}>Hi {recipientName},</Text>
          
          <Text style={text}>
            {cancellerDescription} {cancellerDescription === "You" ? "have" : "has"} cancelled the following meeting:
          </Text>

          <Section style={eventBox}>
            <Text style={eventTitleStyle}>{eventTitle}</Text>
            <Text style={eventDetails}>
              📅 {startTime} - {endTime}
            </Text>
            <Text style={eventDetails}>
              🌍 {timezone}
            </Text>
            <Text style={eventDetails}>
              👤 {isHost ? `With ${otherPartyName}` : `With ${otherPartyName}`}
            </Text>
          </Section>

          <Section style={cancelledBox}>
            <Text style={cancelledText}>❌ This meeting has been cancelled</Text>
          </Section>

          <Hr style={hr} />

          <Text style={footerText}>
            {isHost 
              ? "The attendee has been notified of this cancellation."
              : "If you'd like to book a new time, please visit the host's booking page."
            }
          </Text>

          <Text style={footerText}>
            — LetsMeet
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
  color: "#dc2626",
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
  backgroundColor: "#fef2f2",
  border: "1px solid #fecaca",
  borderRadius: "8px",
  padding: "20px",
  margin: "24px 0",
}

const eventTitleStyle = {
  color: "#1a1a1a",
  fontSize: "18px",
  fontWeight: "600",
  margin: "0 0 12px",
  textDecoration: "line-through",
}

const eventDetails = {
  color: "#6b7280",
  fontSize: "14px",
  lineHeight: "20px",
  margin: "4px 0",
}

const cancelledBox = {
  backgroundColor: "#fef2f2",
  borderRadius: "8px",
  padding: "12px 16px",
  margin: "0 0 24px",
  textAlign: "center" as const,
}

const cancelledText = {
  color: "#dc2626",
  fontSize: "14px",
  fontWeight: "600",
  margin: "0",
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
