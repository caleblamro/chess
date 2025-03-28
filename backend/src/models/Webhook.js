'use strict';

const mongoose = require('mongoose');

const WebhookSchema = new mongoose.Schema({
  webhookId: {
    type: String,
    required: true,
    unique: true
  },
  url: {
    type: String,
    required: true
  },
  events: {
    type: [String],
    enum: ['game_created', 'player_joined', 'move_made', 'game_completed'],
    default: ['game_created', 'player_joined', 'move_made', 'game_completed']
  },
  gameId: {
    type: String,
    required: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Webhook', WebhookSchema);