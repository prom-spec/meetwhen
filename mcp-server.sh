#!/bin/bash
# MeetWhen MCP Server launcher
# Loads DATABASE_URL from .env and sets MCP_USER_ID

cd "$(dirname "$0")"

# Load DATABASE_URL from .env (handle quotes)
export DATABASE_URL=$(grep "^DATABASE_URL=" .env | cut -d'"' -f2)
export MCP_USER_ID="cmlctpkaa00070llf6kij2xc2"

exec npx tsx src/mcp/server.ts
