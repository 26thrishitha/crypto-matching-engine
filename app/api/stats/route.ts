import { NextResponse } from "next/server"
import { matchingEngine } from "@/lib/matching-engine"

export async function GET() {
  try {
    const stats = matchingEngine.getStats()
    return NextResponse.json(stats)
  } catch (error) {
    console.error("Error fetching stats:", error)
    return NextResponse.json({ error: "Failed to fetch stats" }, { status: 500 })
  }
}
