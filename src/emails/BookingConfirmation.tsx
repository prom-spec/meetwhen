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

interface BookingConfirmationProps {
  guestName: string
  hostName: string
  eventTitle: string
  startTime: string
  endTime: string
  timezone: string
  meetingUrl?: string | null
  location?: string | null
  bookingUrl?: string | null
  recurrenceInfo?: string | null
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
  bookingUrl,
  recurrenceInfo,
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
            {location && !meetingUrl && (
              <Text style={eventDetails}>
                📍 {location}
              </Text>
            )}
            {recurrenceInfo && (
              <Text style={eventDetails}>
                🔁 {recurrenceInfo}
              </Text>
            )}
          </Section>

          {meetingUrl && (
            <Section style={meetingBox}>
              <Text style={meetingTitle}>🎥 Join Your Meeting</Text>
              <Link href={meetingUrl} style={meetingLink}>
                {meetingUrl.startsWith("tel:") ? meetingUrl.replace("tel:", "📞 ") : meetingUrl}
              </Link>
              <Text style={meetingNote}>
                Click the link above to join at the scheduled time
              </Text>
            </Section>
          )}

          {bookingUrl && (
            <Section style={buttonContainer}>
              <Button style={button} href={bookingUrl}>
                Manage Booking
              </Button>
            </Section>
          )}

          <Hr style={hr} />

          <Text style={footerText}>
            Need to make changes?{" "}
            {bookingUrl ? (
              <Link href={bookingUrl} style={link}>Reschedule or cancel your booking</Link>
            ) : (
              <>Contact {hostName} directly to reschedule or cancel.</>
            )}
          </Text>

          <Text style={footerText}>
            — letsmeet.link
          </Text>

          <Hr style={hr} />

          <Text style={psText}>
            P.S. Loved how easy that was? Get your own booking link — free.
          </Text>
          <Section style={buttonContainer}>
            <Button style={subtleButton} href="https://letsmeet.link/?ref=guest-email">
              Create my letsmeet.link →
            </Button>
          </Section>
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

const meetingBox = {
  backgroundColor: "#ecfdf5",
  border: "1px solid #10b981",
  borderRadius: "8px",
  padding: "20px",
  margin: "24px 0",
  textAlign: "center" as const,
}

const meetingTitle = {
  color: "#065f46",
  fontSize: "16px",
  fontWeight: "600",
  margin: "0 0 12px",
}

const meetingLink = {
  color: "#059669",
  fontSize: "14px",
  fontWeight: "500",
  textDecoration: "none",
  wordBreak: "break-all" as const,
}

const meetingNote = {
  color: "#6b7280",
  fontSize: "12px",
  margin: "12px 0 0",
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

const psText = {
  color: "#9ca3af",
  fontSize: "13px",
  lineHeight: "20px",
  margin: "0 0 12px",
  textAlign: "center" as const,
}

const subtleButton = {
  backgroundColor: "#e5e7eb",
  borderRadius: "6px",
  color: "#374151",
  fontSize: "13px",
  fontWeight: "500",
  textDecoration: "none",
  textAlign: "center" as const,
  padding: "10px 20px",
}
