const express = require('express');
const { eq } = require('drizzle-orm');
const { buses, users } = require('./schema');

const router = express.Router();

// WebSocket connection handling
router.ws('/ws', (ws, req) => {
  if (!req.session.userId) {
    ws.close();
    return;
  }

  // Store connection info
  const data = {
    userId: req.session.userId,
    role: req.session.role
  };

  // Add to active connections
  global.connections.push({
    ws,
    role: data.role,
    userId: data.userId
  });

  // Send initial data based on role
  if (data.role === 'passenger') {
    const activeBuses = db.query.buses.findMany({
      where: eq(buses.status, 'active'),
      with: {
        driver: {
          columns: {
            name: true
          }
        },
        route: {
          columns: {
            name: true,
            stops: true
          }
        }
      }
    });

    ws.send(JSON.stringify({
      type: 'busLocations',
      data: activeBuses
    }));
  } else if (data.role === 'driver') {
    const driverBus = db.query.buses.findFirst({
      where: eq(buses.driverId, data.userId)
    });

    if (driverBus) {
      ws.send(JSON.stringify({
        type: 'assignedBus',
        data: driverBus
      }));
    }
  }

  // Handle incoming messages
  ws.on('message', async (msg) => {
    try {
      const data = JSON.parse(msg);

      if (data.type === 'location') {
        // Update bus location
        await db.update(buses)
          .set({
            latitude: data.latitude,
            longitude: data.longitude,
            lastUpdate: new Date()
          })
          .where(eq(buses.id, data.busId));

        // Broadcast to passengers
        global.connections
          .filter(conn => conn.role === 'passenger')
          .forEach(conn => {
            conn.ws.send(JSON.stringify({
              type: 'busLocation',
              data: {
                busId: data.busId,
                latitude: data.latitude,
                longitude: data.longitude
              }
            }));
          });
      }
    } catch (err) {
      console.error('WebSocket message error:', err);
    }
  });

  // Handle disconnection
  ws.on('close', () => {
    const index = global.connections.findIndex(
      conn => conn.ws === ws
    );
    if (index !== -1) {
      global.connections.splice(index, 1);
    }
  });
});

// API Routes

// Get user profile
router.get('/api/user', async (req, res) => {
  try {
    if (!req.session.userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const user = await db.query.users.findFirst({
      where: eq(users.id, req.session.userId)
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role
    });
  } catch (err) {
    console.error('Get user error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get analytics data
router.get('/api/analytics', async (req, res) => {
  try {
    if (!req.session.userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    if (req.session.role !== 'admin') {
      return res.status(403).json({ error: 'Not authorized' });
    }

    const analytics = await getAnalyticsData();
    res.json(analytics);
  } catch (err) {
    console.error('Get analytics error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Export router
module.exports = router;
