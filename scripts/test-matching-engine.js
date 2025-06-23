// Test script for the matching engine
const testOrders = [
  // Initial liquidity - buy orders
  { symbol: "BTC-USDT", order_type: "limit", side: "buy", quantity: 1.0, price: 49900, order_id: "buy_1" },
  { symbol: "BTC-USDT", order_type: "limit", side: "buy", quantity: 2.0, price: 49950, order_id: "buy_2" },
  { symbol: "BTC-USDT", order_type: "limit", side: "buy", quantity: 0.5, price: 50000, order_id: "buy_3" },

  // Initial liquidity - sell orders
  { symbol: "BTC-USDT", order_type: "limit", side: "sell", quantity: 1.5, price: 50100, order_id: "sell_1" },
  { symbol: "BTC-USDT", order_type: "limit", side: "sell", quantity: 1.0, price: 50050, order_id: "sell_2" },
  { symbol: "BTC-USDT", order_type: "limit", side: "sell", quantity: 2.0, price: 50150, order_id: "sell_3" },

  // Market orders to test execution
  { symbol: "BTC-USDT", order_type: "market", side: "buy", quantity: 0.8, order_id: "market_buy_1" },
  { symbol: "BTC-USDT", order_type: "market", side: "sell", quantity: 1.2, order_id: "market_sell_1" },

  // IOC order
  { symbol: "BTC-USDT", order_type: "ioc", side: "buy", quantity: 3.0, price: 50080, order_id: "ioc_1" },

  // FOK order that should fill
  { symbol: "BTC-USDT", order_type: "fok", side: "sell", quantity: 0.3, price: 49980, order_id: "fok_1" },

  // FOK order that should be cancelled
  { symbol: "BTC-USDT", order_type: "fok", side: "buy", quantity: 10.0, price: 50200, order_id: "fok_2" },
]

async function testMatchingEngine() {
  console.log("Testing Matching Engine...\n")

  for (let i = 0; i < testOrders.length; i++) {
    const order = testOrders[i]
    console.log(`\n--- Test ${i + 1}: ${order.order_type.toUpperCase()} ${order.side.toUpperCase()} ---`)
    console.log(`Order: ${order.quantity} ${order.symbol.split("-")[0]} @ ${order.price || "MARKET"}`)

    try {
      const response = await fetch("http://localhost:3000/api/submit-order", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(order),
      })

      const result = await response.json()
      console.log("Result:", result.status)

      if (result.trades && result.trades.length > 0) {
        console.log("Trades executed:")
        result.trades.forEach((trade) => {
          console.log(`  - ${trade.quantity} @ $${trade.price} (${trade.aggressor_side})`)
        })
      }

      // Get current order book
      const obResponse = await fetch("http://localhost:3000/api/orderbook?symbol=BTC-USDT&depth=5")
      const orderBook = await obResponse.json()

      console.log("\nCurrent Order Book:")
      console.log("Best Bid:", orderBook.bbo.best_bid ? `$${orderBook.bbo.best_bid}` : "None")
      console.log("Best Ask:", orderBook.bbo.best_ask ? `$${orderBook.bbo.best_ask}` : "None")
      console.log("Spread:", orderBook.bbo.spread ? `$${orderBook.bbo.spread.toFixed(2)}` : "None")
    } catch (error) {
      console.error("Error:", error.message)
    }

    // Small delay between orders
    await new Promise((resolve) => setTimeout(resolve, 100))
  }

  // Final stats
  try {
    const statsResponse = await fetch("http://localhost:3000/api/stats")
    const stats = await statsResponse.json()

    console.log("\n=== Final Statistics ===")
    console.log("Total Orders:", stats.total_orders)
    console.log("Total Trades:", stats.total_trades)
    console.log("24h Volume:", `$${stats.volume_24h.toLocaleString()}`)
    console.log("Orders/Second:", stats.orders_per_second.toFixed(2))
  } catch (error) {
    console.error("Error fetching stats:", error.message)
  }
}

// Run the test
testMatchingEngine().catch(console.error)
