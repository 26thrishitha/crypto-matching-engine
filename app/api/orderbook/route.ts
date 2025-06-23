import { type NextRequest, NextResponse } from "next/server"
import { matchingEngine } from "@/lib/matching-engine"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const symbol = searchParams.get("symbol") || "BTC-USDT"
    const depth = Number.parseInt(searchParams.get("depth") || "10")

    const orderBook = matchingEngine.getOrderBook(symbol, depth)

    return NextResponse.json(orderBook)
  } catch (error) {
    console.error("Error fetching order book:", error)
    return NextResponse.json({ error: "Failed to fetch order book" }, { status: 500 })
  }
}
