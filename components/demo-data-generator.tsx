"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Play, Square, Zap } from "lucide-react"

interface DemoDataGeneratorProps {
  onOrderSubmitted?: () => void
}

export function DemoDataGenerator({ onOrderSubmitted }: DemoDataGeneratorProps) {
  const [isGenerating, setIsGenerating] = useState(false)
  const [generatedCount, setGeneratedCount] = useState(0)

  const generateRandomOrder = () => {
    const sides = ["buy", "sell"]
    const orderTypes = ["limit", "market", "ioc"]
    const basePrice = 50000

    const side = sides[Math.floor(Math.random() * sides.length)]
    const orderType = orderTypes[Math.floor(Math.random() * orderTypes.length)]
    const priceVariation = (Math.random() - 0.5) * 500 // ±$250 variation
    const price = basePrice + priceVariation
    const quantity = Math.random() * 2 + 0.1 // 0.1 to 2.1

    return {
      symbol: "BTC-USDT",
      order_type: orderType,
      side: side,
      quantity: Math.round(quantity * 10000) / 10000, // Round to 4 decimals
      price: orderType === "market" ? undefined : Math.round(price * 100) / 100,
      order_id: `demo_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    }
  }

  const submitRandomOrder = async () => {
    try {
      const order = generateRandomOrder()

      const response = await fetch("/api/submit-order", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(order),
      })

      const result = await response.json()

      if (result.status === "success") {
        setGeneratedCount((prev) => prev + 1)
        onOrderSubmitted?.()
      }
    } catch (error) {
      console.error("Error submitting demo order:", error)
    }
  }

  const startDemo = async () => {
    setIsGenerating(true)

    // Submit initial liquidity orders
    const liquidityOrders = [
      // Buy orders
      { symbol: "BTC-USDT", order_type: "limit", side: "buy", quantity: 1.0, price: 49900 },
      { symbol: "BTC-USDT", order_type: "limit", side: "buy", quantity: 2.0, price: 49950 },
      { symbol: "BTC-USDT", order_type: "limit", side: "buy", quantity: 0.5, price: 50000 },
      { symbol: "BTC-USDT", order_type: "limit", side: "buy", quantity: 1.5, price: 49850 },

      // Sell orders
      { symbol: "BTC-USDT", order_type: "limit", side: "sell", quantity: 1.5, price: 50100 },
      { symbol: "BTC-USDT", order_type: "limit", side: "sell", quantity: 1.0, price: 50050 },
      { symbol: "BTC-USDT", order_type: "limit", side: "sell", quantity: 2.0, price: 50150 },
      { symbol: "BTC-USDT", order_type: "limit", side: "sell", quantity: 0.8, price: 50200 },
    ]

    // Submit liquidity orders
    for (const order of liquidityOrders) {
      try {
        await fetch("/api/submit-order", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            ...order,
            order_id: `liquidity_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          }),
        })
        await new Promise((resolve) => setTimeout(resolve, 100))
      } catch (error) {
        console.error("Error submitting liquidity order:", error)
      }
    }

    onOrderSubmitted?.()
  }

  const startContinuousDemo = () => {
    if (isGenerating) return

    setIsGenerating(true)

    const interval = setInterval(() => {
      if (!isGenerating) {
        clearInterval(interval)
        return
      }

      submitRandomOrder()
    }, 1000) // Submit order every second

    // Stop after 30 seconds
    setTimeout(() => {
      setIsGenerating(false)
      clearInterval(interval)
    }, 30000)
  }

  const stopDemo = () => {
    setIsGenerating(false)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          Demo Data Generator
          <Badge variant="outline">{generatedCount} orders</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 gap-2">
          <Button onClick={startDemo} disabled={isGenerating} className="w-full">
            <Zap className="w-4 h-4 mr-2" />
            Initialize Order Book
          </Button>

          <Button onClick={startContinuousDemo} disabled={isGenerating} variant="outline" className="w-full">
            <Play className="w-4 h-4 mr-2" />
            Start Continuous Demo (30s)
          </Button>

          {isGenerating && (
            <Button onClick={stopDemo} variant="destructive" className="w-full">
              <Square className="w-4 h-4 mr-2" />
              Stop Demo
            </Button>
          )}
        </div>

        <div className="text-sm text-gray-600">
          <p>• Initialize: Adds liquidity to both sides of the order book</p>
          <p>• Continuous: Submits random orders every second for 30 seconds</p>
        </div>
      </CardContent>
    </Card>
  )
}
