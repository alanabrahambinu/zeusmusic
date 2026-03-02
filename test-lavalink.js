// test-lavalink.js
import WebSocket from 'ws';
import { config } from './config.js';

async function testLavalink() {
  console.log("🔍 Testing Lavalink connections...\n");

  // Test primary node
  console.log(`Testing primary node: ${config.lavalink.host}:${config.lavalink.port}`);
  await testNode(config.lavalink);

  // Test fallback nodes
  for (const [index, node] of config.lavalink.fallback.entries()) {
    console.log(`\nTesting fallback node ${index + 1}: ${node.host}:${node.port}`);
    await testNode(node);
  }
}

function testNode(node) {
  return new Promise((resolve) => {
    const wsUrl = node.secure 
      ? `wss://${node.host}:${node.port}/v4/websocket`
      : `ws://${node.host}:${node.port}/v4/websocket`;

    console.log(`Connecting to: ${wsUrl}`);

    const ws = new WebSocket(wsUrl);
    const timeout = setTimeout(() => {
      console.log(`❌ Timeout - ${node.host} is not responding`);
      ws.terminate();
      resolve(false);
    }, 5000);

    ws.on('open', () => {
      console.log(`✅ WebSocket connected to ${node.host}`);
      
      ws.send(JSON.stringify({
        op: 'identify',
        guildId: 'test',
        token: node.password,
        userId: 'test-bot'
      }));
    });

    ws.on('message', (data) => {
      try {
        const msg = JSON.parse(data);
        if (msg.op === 'ready') {
          console.log(`✅ Lavalink ready on ${node.host}!`);
          console.log(`   Session ID: ${msg.sessionId}`);
          clearTimeout(timeout);
          ws.close();
          resolve(true);
        }
      } catch (e) {
        console.log(`📩 Received: ${data}`);
      }
    });

    ws.on('error', (err) => {
      console.log(`❌ Connection error: ${err.message}`);
      clearTimeout(timeout);
      resolve(false);
    });

    ws.on('close', () => {
      clearTimeout(timeout);
    });
  });
}

testLavalink().then(() => {
  console.log("\n✅ Test complete!");
  process.exit(0);
});
