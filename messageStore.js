/* abstract */ class MessageStore {
  saveMessage(message) {}
  findMessagesForUser(roomId) {}
}

class InMemoryMessageStore extends MessageStore {
  constructor() {
    super();
    this.messages = [];
  }

  saveMessage(message) {
    this.messages.push(message);
  }

  findMessagesForUser(roomId) {
    return this.messages.filter(roomId);
  }
}

module.exports = {
  InMemoryMessageStore,
};
