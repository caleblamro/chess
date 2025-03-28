'use strict';

const axios = require('axios');
const Webhook = require('../models/Webhook');

async function notifyGameUpdate(game, eventType) {
  try {
    // Find all webhooks that match the event and game criteria
    const webhooks = await Webhook.find({
      events: eventType,
      $or: [
        { gameId: { $exists: false } },
        { gameId: null },
        { gameId: game.gameId }
      ]
    });

    if (webhooks.length === 0) {
      return;
    }

    // Prepare the payload
    const payload = {
      eventType,
      timestamp: new Date(),
      game: {
        id: game.gameId,
        status: game.status,
        fen: game.fen,
        lastMove: game.moves.length > 0 ? game.moves[game.moves.length - 1] : null
      }
    };

    // Send notifications to all matching webhooks
    const notificationPromises = webhooks.map(webhook => {
      return axios.post(webhook.url, payload)
        .catch(error => {
          console.error(`Failed to notify webhook ${webhook.webhookId}:`, error.message);
        });
    });

    // Wait for all notifications to be sent
    await Promise.allSettled(notificationPromises);
  } catch (error) {
    console.error('Error notifying webhooks:', error);
  }
}

module.exports = {
  notifyGameUpdate
};