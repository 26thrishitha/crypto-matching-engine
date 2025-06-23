import { type NextRequest, NextResponse } from "next/server"
import { matchingEngine } from "@/lib/matching-engine"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = Number.parseInt(searchParams.get("limit") || "50")

    const trades = matchingEngine.getRecentTrades(limit)

    return NextResponse.json(trades)
  } catch (error) {
    console.error("Error fetching trades:", error)
    return NextResponse.json({ error: "Failed to fetch trades" }, { status: 500 })
  }
}
