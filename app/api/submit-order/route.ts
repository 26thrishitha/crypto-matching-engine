import { type NextRequest, NextResponse } from "next/server"
import { matchingEngine } from "@/lib/matching-engine"
import { broadcastUpdate } from "@/lib/websocket-server"

export async function POST(request: NextRequest) {
  try {
    const orderData = await request.json()

    // Submit order to matching engine
    const result = matchingEngine.submitOrder(orderData)

    if (result.status === "success") {
      // Broadcast updates (stored for polling)
      const orderBook = matchingEngine.getOrderBook(orderData.symbol)
      broadcastUpdate({
        type: "orderbook_update",
        data: orderBook,
      })

      // Broadcast trade executions if any
      if (result.trades && result.trades.length > 0) {
        result.trades.forEach((trade) => {
          broadcastUpdate({
            type: "trade_execution",
            data: trade,
          })
        })
      }

      // Broadcast stats update
      const stats = matchingEngine.getStats()
      broadcastUpdate({
        type: "stats_update",
        data: stats,
      })
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error("Order submission error:", error)
    return NextResponse.json(
      {
        status: "error",
        message: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 },
    )
  }
}
