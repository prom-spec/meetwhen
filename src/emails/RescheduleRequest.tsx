import {
  Body,
  Button,
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

interface RescheduleRequestProps {
  guestName: string
  hostName: string
  eventTitle: string
  startTime: string
  endTime: string
  timezone: string
  rescheduleUrl: string
}

export default function RescheduleRequest({
  guestName,
  hostName,
  eventTitle,
  startTime,
  endTime,
  timezone,
  rescheduleUrl,
}: RescheduleRequestProps) {
  return (
    <Html>
      <Head />
      <Preview>{hostName} has requested to reschedule your meeting</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>Reschedule Requested</Heading>

          <Text style={text}>Hi {guestName},</Text>

          <Text style={text}>
            {hostName} has requested to reschedule the following meeting:
          </Text>

          <Section style={eventBox}>
            <Text style={eventTitleStyle}>{eventTitle}</Text>
            <Text style={eventDetails}>📅 {startTime} - {endTime}</Text>
            <Text style={eventDetails}>🌍 {timezone}</Text>
            <Text style={eventDetails}>👤 With {hostName}</Text>
          </Section>

          <Text style={text}>
            Please pick a new time that works for you:
          </Text>

          <Section style={{ textAlign: "center" as const, margin: "24px 0" }}>
            <Button style={button} href={rescheduleUrl}>
              Choose a New Time
            </Button>
          </Section>

          <Hr style={hr} />

          <Text style={footerText}>
            If you have any questions, reply directly to {hostName}.
          </Text>

          <Text style={footerText}>— LetsMeet</Text>
        </Container>
      </Body>
    </Html>
  )
}

const main = {
  backgroundColor: "#f6f9fc",
  fontFamily:
    '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
}

const container = {
  backgroundColor: "#ffffff",
  margin: "0 auto",
  padding: "40px 20px",
  borderRadius: "8px",
  maxWidth: "560px",
}

const h1 = {
  color: "#f59e0b",
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
  backgroundColor: "#fffbeb",
  border: "1px solid #fde68a",
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
  color: "#6b7280",
  fontSize: "14px",
  lineHeight: "20px",
  margin: "4px 0",
}

const button = {
  backgroundColor: "#3B82F6",
  borderRadius: "6px",
  color: "#fff",
  fontSize: "16px",
  fontWeight: "600",
  textDecoration: "none",
  textAlign: "center" as const,
  display: "inline-block",
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
