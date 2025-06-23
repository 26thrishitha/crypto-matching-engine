// Simplified WebSocket manager for API compatibility
interface WebSocketMessage {
  type: string
  data: any
}

class WebSocketManager {
  private messageQueue: WebSocketMessage[] = []

  broadcast(message: WebSocketMessage) {
    // Store messages for potential future use
    this.messageQueue.push(message)

    // Keep only last 100 messages
    if (this.messageQueue.length > 100) {
      this.messageQueue = this.messageQueue.slice(-100)
    }

    console.log(`Broadcasting: ${message.type}`, message.data)
  }

  getRecentMessages(type?: string): WebSocketMessage[] {
    if (type) {
      return this.messageQueue.filter((msg) => msg.type === type)
    }
    return this.messageQueue
  }

  getClientCount(): number {
    return 0 // No real clients in this implementation
  }
}

export const wsManager = new WebSocketManager()

export function broadcastUpdate(message: WebSocketMessage) {
  wsManager.broadcast(message)
}
