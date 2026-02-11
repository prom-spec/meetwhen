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

interface PostMeetingFollowupProps {
  guestName: string
  hostName: string
}

export default function PostMeetingFollowup({
  guestName,
  hostName,
}: PostMeetingFollowupProps) {
  return (
    <Html>
      <Head />
      <Preview>Hope your meeting with {hostName} went well!</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>Hope it went great! 👋</Heading>

          <Text style={text}>Hi {guestName},</Text>

          <Text style={text}>
            Just wanted to say — hope your meeting with{" "}
            <strong>{hostName}</strong> went well!
          </Text>

          <Text style={text}>
            If you ever need to let people book time with you, letsmeet.link
            makes it ridiculously easy.
          </Text>

          <Section style={buttonContainer}>
            <Button
              style={button}
              href="https://letsmeet.link/?ref=post-meeting"
            >
              Create your free letsmeet.link →
            </Button>
          </Section>

          <Text style={subtextStyle}>
            No credit card. Takes 30 seconds.
          </Text>

          <Hr style={hr} />

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

const subtextStyle = {
  color: "#9ca3af",
  fontSize: "13px",
  lineHeight: "20px",
  margin: "0",
  textAlign: "center" as const,
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
