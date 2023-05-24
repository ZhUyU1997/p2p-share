import { useEffect, useState } from 'react'
import shortid from 'shortid'
import { PeerConnection } from './peer'
import Text2Image from './Text2Image'
import { GetServerID } from './util'
import { Space, Spin } from 'antd'
import VLayout from './VLayout'
import './App.css'

const ID = shortid.generate()
const ServerID = GetServerID()
if (!ServerID) {
    document.body.innerText = 'no ServerID'
    throw new Error('no ServerID')
}

function Loading() {
    return (
        <VLayout
            style={{
                width: '100vw',
                height: '100vh',
            }}
        >
            <Space>
                <Spin tip="正在连接服务器" size="large">
                    <div className="content" />
                </Spin>
            </Space>
        </VLayout>
    )
}
function App() {
    const [disable, setDisable] = useState(true)
    useEffect(() => {
        const connect = async () => {
            console.log('startPeerSession', ID)
            await PeerConnection.startPeerSession(ID)
            await PeerConnection.connectPeer(ServerID)
            setDisable(false)
        }
        connect()

        return () => {
            console.log('closePeerSession')
            PeerConnection.closePeerSession()
        }
    }, [])
    return disable ? <Loading></Loading> : <Text2Image ID={ID}></Text2Image>
}

export default App
