// System-Design: Scalable WebSocket Chat Service
// Task:
// Build a chat service that supports 10,000+ concurrent WebSocket clients across multiple Node.js instances
// behind a load balancer, with robust routing, message broadcast, fault recovery, and state reconciliation.

// Solution Sketch:
// 1. Layer WebSocket servers behind load balancer (with sticky sessions) to ensure connections stick to one node.
// 2. Use Redis PUB/SUB (or NATS) to broadcast messages across nodes:
//    - Each node subscribes to room topics (e.g., “room:123”).
//    - Incoming messages are published to Redis; all nodes receive and forward to relevant clients.
// 3. Support horizontal scaling & failover:
//    - Multiple Node.js instances (via clustering/container scale).
//    - Sticky sessions or stateless auth (e.g. JWT + Redis session store).
//    - On node crash, clients reconnect, reload session, and catch up on missed messages.
//    - Persist chat history in a database for reconciliation.


// --- Kubernetes/Nginx LB Config Sketch ---
// sticky sessions via ip_hash:
// upstream chat_backend {
//   ip_hash;
//   server ws1:3000;
//   server ws2:3000;
// }
// proxy_pass ... with WebSocket headers