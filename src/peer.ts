import Peer, { DataConnection } from "peerjs";
import { message } from "antd";

let peer: Peer | undefined;
const connectionMap: Map<string, DataConnection> = new Map<
  string,
  DataConnection
>();

export const PeerConnection = {
  getPeer: () => peer,
  startPeerSession: (ID: string) =>
    new Promise<string>((resolve, reject) => {
      try {
        peer = new Peer(ID);
        peer
          .on("open", (id) => {
            console.log("My ID: " + id);
            resolve(id);
          })
          .on("error", (err) => {
            console.log(err);
            message.error(err.message);
          });
      } catch (err) {
        console.log(err);
        reject(err);
      }
    }),
  closePeerSession: () =>
    new Promise<void>((resolve, reject) => {
      try {
        if (peer) {
          peer.destroy();
          peer = undefined;
        }
        resolve();
      } catch (err) {
        console.log(err);
        reject(err);
      }
    }),
  connectPeer: (id: string) =>
    new Promise<void>((resolve, reject) => {
      if (!peer) {
        reject(new Error("Peer doesn't start yet"));
        return;
      }
      if (connectionMap.has(id)) {
        reject(new Error("Connection existed"));
        return;
      }
      try {
        const conn = peer.connect(id, { reliable: true });
        if (!conn) {
          reject(new Error("Connection can't be established"));
        } else {
          conn
            .on("open", function () {
              console.log("Connect to: " + id);
              message.success("Connect to: " + id);

              connectionMap.set(id, conn);
              resolve();
            })
            .on("error", function (err) {
              console.log(err);
              reject(err);
            });
        }
      } catch (err) {
        reject(err);
      }
    }),
  onIncomingConnection: (callback: (conn: DataConnection) => void) => {
    peer?.on("connection", function (conn) {
      console.log("Incoming connection: " + conn.peer);
      connectionMap.set(conn.peer, conn);
      callback(conn);
    });
  },
  onConnectionDisconnected: (id: string, callback: () => void) => {
    if (!peer) {
      throw new Error("Peer doesn't start yet");
    }
    if (!connectionMap.has(id)) {
      throw new Error("Connection didn't exist");
    }
    const conn = connectionMap.get(id);
    if (conn) {
      conn.on("close", function () {
        console.log("Connection closed: " + id);
        connectionMap.delete(id);
        callback();
      });
    }
  },
  sendConnection: (id: string, data: any): Promise<void> =>
    new Promise((resolve, reject) => {
      if (!connectionMap.has(id)) {
        reject(new Error("Connection didn't exist"));
      }
      try {
        const conn = connectionMap.get(id);
        if (conn) {
          conn.send(data);
        }
      } catch (err) {
        reject(err);
      }
      resolve();
    }),

  onConnectionReceiveData: <T>(id: string, callback: (f: T) => void) => {
    if (!peer) {
      throw new Error("Peer doesn't start yet");
    }
    if (!connectionMap.has(id)) {
      throw new Error("Connection didn't exist");
    }
    const conn = connectionMap.get(id);
    if (conn) {
      const onData = (receivedData: T) => {
        console.log("Receiving data from " + id);
        callback(receivedData);
      };
      conn.on("data", onData as any);
      return () => {
        conn.off("data", onData as any);
      };
    }
    return () => {};
  },
  onConnectionOnceReceiveData: <T>(id: string, callback: (f: T) => void) => {
    if (!peer) {
      throw new Error("Peer doesn't start yet");
    }
    if (!connectionMap.has(id)) {
      throw new Error("Connection didn't exist");
    }
    const conn = connectionMap.get(id);
    if (conn) {
      const onData = (receivedData: T) => {
        console.log("Receiving data from " + id);
        callback(receivedData);
      };
      conn.once("data", onData as any);
    }
  },
};
