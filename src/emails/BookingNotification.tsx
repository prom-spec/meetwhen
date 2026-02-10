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
  Button,
} from "@react-email/components"
import * as React from "react"

interface BookingNotificationProps {
  hostName: string
  guestName: string
  guestEmail: string
  eventTitle: string
  startTime: string
  endTime: string
  timezone: string
  dashboardUrl: string
  meetingUrl?: string | null
}

export default function BookingNotification({
  hostName,
  guestName,
  guestEmail,
  eventTitle,
  startTime,
  endTime,
  timezone,
  dashboardUrl,
  meetingUrl,
}: BookingNotificationProps) {
  return (
    <Html>
      <Head />
      <Preview>New booking: {guestName} booked {eventTitle}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>New Booking! 🎉</Heading>
          
          <Text style={text}>Hi {hostName},</Text>
          
          <Text style={text}>
            <strong>{guestName}</strong> has booked a meeting with you.
          </Text>

          <Section style={eventBox}>
            <Text style={eventTitleStyle}>{eventTitle}</Text>
            <Text style={eventDetails}>
              👤 {guestName}
            </Text>
            <Text style={eventDetails}>
              ✉️ <Link href={`mailto:${guestEmail}`} style={link}>{guestEmail}</Link>
            </Text>
            <Text style={eventDetails}>
              📅 {startTime} - {endTime}
            </Text>
            <Text style={eventDetails}>
              🌍 {timezone}
            </Text>
            {meetingUrl && (
              <Text style={eventDetails}>
                🔗 <Link href={meetingUrl} style={link}>
                  {meetingUrl.startsWith("tel:") ? meetingUrl.replace("tel:", "") : "Join Meeting"}
                </Link>
              </Text>
            )}
          </Section>

          <Section style={buttonContainer}>
            <Button style={button} href={dashboardUrl}>
              View in Dashboard
            </Button>
          </Section>

          <Hr style={hr} />

          <Text style={footerText}>
            This booking has been automatically confirmed and added to your calendar.
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
  color: "#fff",
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
