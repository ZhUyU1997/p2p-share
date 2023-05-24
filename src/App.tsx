import { useEffect } from 'react'
import shortid from 'shortid'
import { PeerConnection } from './peer'
import Text2Image from './Text2Image'
import { GetServerID } from './util'

const ID = shortid.generate()
const ServerID = GetServerID()
if (!ServerID) {
    document.body.innerText = 'no ServerID'
    throw new Error('no ServerID')
}

function App() {
    useEffect(() => {
        const connect = async () => {
            console.log('startPeerSession', ID)
            await PeerConnection.startPeerSession(ID)
            await PeerConnection.connectPeer(ServerID)
        }
        connect()

        return () => {
            console.log('closePeerSession')
            PeerConnection.closePeerSession()
        }
    }, [])
    return <Text2Image ID={ID}></Text2Image>
}

export default App
