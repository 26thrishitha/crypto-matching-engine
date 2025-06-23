// Performance test script to validate >1000 orders/sec requirement
async function performanceTest() {
  console.log("Starting Performance Test...\n")

  const orderCount = 2000
  const orders = []

  // Generate test orders
  for (let i = 0; i < orderCount; i++) {
    const side = Math.random() > 0.5 ? "buy" : "sell"
    const basePrice = 50000
    const priceVariation = (Math.random() - 0.5) * 200 // ±$100 variation
    const price = basePrice + priceVariation

    orders.push({
      symbol: "BTC-USDT",
      order_type: "limit",
      side: side,
      quantity: Math.random() * 2 + 0.1, // 0.1 to 2.1
      price: Math.round(price * 100) / 100, // Round to 2 decimals
      order_id: `perf_test_${i}`,
    })
  }

  console.log(`Generated ${orderCount} test orders`)

  // Submit orders and measure performance
  const startTime = Date.now()
  let successCount = 0
  let errorCount = 0

  const promises = orders.map(async (order, index) => {
    try {
      const response = await fetch("http://localhost:3000/api/submit-order", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(order),
      })

      const result = await response.json()
      if (result.status === "success") {
        successCount++
      } else {
        errorCount++
      }

      // Log progress every 100 orders
      if ((index + 1) % 100 === 0) {
        console.log(`Processed ${index + 1}/${orderCount} orders`)
      }
    } catch (error) {
      errorCount++
      console.error(`Error with order ${index}:`, error.message)
    }
  })

  // Wait for all orders to complete
  await Promise.all(promises)

  const endTime = Date.now()
  const totalTime = (endTime - startTime) / 1000 // Convert to seconds
  const ordersPerSecond = orderCount / totalTime

  console.log("\n=== Performance Test Results ===")
  console.log(`Total Orders: ${orderCount}`)
  console.log(`Successful: ${successCount}`)
  console.log(`Errors: ${errorCount}`)
  console.log(`Total Time: ${totalTime.toFixed(2)} seconds`)
  console.log(`Orders/Second: ${ordersPerSecond.toFixed(2)}`)
  console.log(`Target: >1000 orders/sec`)
  console.log(`Result: ${ordersPerSecond > 1000 ? "✅ PASSED" : "❌ FAILED"}`)

  // Get final stats
  try {
    const statsResponse = await fetch("http://localhost:3000/api/stats")
    const stats = await statsResponse.json()

    console.log("\n=== Engine Statistics ===")
    console.log("Total Orders Processed:", stats.total_orders)
    console.log("Total Trades Executed:", stats.total_trades)
    console.log("24h Volume:", `$${stats.volume_24h.toLocaleString()}`)
    console.log("Current Orders/Second:", stats.orders_per_second.toFixed(2))
  } catch (error) {
    console.error("Error fetching final stats:", error.message)
  }
}

// Run the performance test
performanceTest().catch(console.error)
