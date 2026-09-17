export class NetworkManager {
  constructor(game) {
    this.game = game;
    this.ws = null;
    this.connected = false;
    this.roomCode = null;
    this.playerRole = 'p1'; // 'p1' or 'p2'
    this.isHost = false;
  }

  connect(serverUrl) {
    return new Promise((resolve, reject) => {
      let url = serverUrl;
      if (!url) {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        url = `${protocol}//${window.location.host}`;
      }

      try {
        this.ws = new WebSocket(url);
      } catch (err) {
        reject(err);
        return;
      }

      this.ws.onopen = () => {
        this.connected = true;
        resolve();
      };

      this.ws.onerror = (err) => {
        console.error('WebSocket error:', err);
        reject(err);
      };

      this.ws.onclose = () => {
        this.connected = false;
        console.warn('WebSocket connection closed.');
      };

      this.ws.onmessage = (event) => {
        this.handleMessage(event.data);
      };
    });
  }

  createRoom(levelIndex = 0) {
    if (!this.connected) return;
    this.isHost = true;
    this.ws.send(JSON.stringify({
      type: 'CREATE_ROOM',
      levelIndex
    }));
  }

  joinRoom(code) {
    if (!this.connected) return;
    this.isHost = false;
    this.ws.send(JSON.stringify({
      type: 'JOIN_ROOM',
      roomCode: code
    }));
  }

  startGame(levelIndex = 0) {
    if (!this.connected || !this.isHost) return;
    this.ws.send(JSON.stringify({
      type: 'START_GAME',
      levelIndex
    }));
  }

  sendPlayerUpdate(state) {
    if (!this.connected) return;
    this.ws.send(JSON.stringify({
      type: 'PLAYER_UPDATE',
      state
    }));
  }

  sendObjectUpdate(objectId, objectState) {
    if (!this.connected) return;
    this.ws.send(JSON.stringify({
      type: 'OBJECT_UPDATE',
      objectId,
      objectState
    }));
  }

  sendLevelChange(levelIndex) {
    if (!this.connected || !this.isHost) return;
    this.ws.send(JSON.stringify({
      type: 'LEVEL_CHANGE',
      levelIndex
    }));
  }

  sendChatMessage(text) {
    if (!this.connected) return;
    this.ws.send(JSON.stringify({
      type: 'CHAT_MESSAGE',
      text
    }));
  }

  sendRespawn() {
    if (!this.connected) return;
    this.ws.send(JSON.stringify({
      type: 'RESPAWN'
    }));
  }

  handleMessage(raw) {
    try {
      const data = JSON.parse(raw);

      switch (data.type) {
        case 'ROOM_CREATED': {
          this.roomCode = data.roomCode;
          this.playerRole = data.playerRole;
          this.game.onRoomCreated(data.roomCode, data.localIp, data.port);
          break;
        }

        case 'ROOM_JOINED': {
          this.roomCode = data.roomCode;
          this.playerRole = data.playerRole;
          this.game.onRoomJoined(data.roomCode, data.levelIndex);
          break;
        }

        case 'PLAYER_JOINED': {
          this.game.onRemotePlayerConnected(data.playerRole);
          break;
        }

        case 'GAME_STARTED': {
          this.game.onGameStarted(data.levelIndex);
          break;
        }

        case 'REMOTE_PLAYER_UPDATE': {
          this.game.onRemotePlayerUpdate(data.playerRole, data.state);
          break;
        }

        case 'REMOTE_OBJECT_UPDATE': {
          this.game.onRemoteObjectUpdate(data.objectId, data.objectState);
          break;
        }

        case 'LEVEL_CHANGE': {
          this.game.loadLevel(data.levelIndex);
          break;
        }

        case 'CHAT_MESSAGE': {
          this.game.onReceiveChatMessage(data.sender, data.text);
          break;
        }

        case 'RESPAWN': {
          this.game.respawnAtCheckpoint();
          break;
        }

        case 'PLAYER_DISCONNECTED': {
          this.game.onRemotePlayerDisconnected();
          break;
        }

        case 'ERROR': {
          this.game.onNetworkError(data.message);
          break;
        }
      }
    } catch (err) {
      console.error('Error handling WS message:', err);
    }
  }
}
