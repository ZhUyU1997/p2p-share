import React, { useEffect, useState } from 'react'
import ReactDOM from 'react-dom/client'

import { DataConnection, Peer } from 'peerjs'
import shortid from 'shortid'
import axios from 'axios'

// peer.on("connection", (conn) => {
//   console.log("");
//   conn.on("data", (data) => {
//     // Will print 'hi!'
//     console.log(data);
//   });
//   conn.on("open", () => {
//     conn.send("hello!");
//   });
// });

interface Text2ImageResponse {
    images: string
    parameters: Record<string, any>
    info: string
}

interface Text2ImageResponseError {
    detail: Array<{
        loc: [string, 0]
        msg: string
        type: string
    }>
}

const text2image = async (payload: any) => {
    const res = await axios.post<Text2ImageResponse | Text2ImageResponseError>(
        'http://127.0.0.1:7860/sdapi/v1/txt2img',
        payload
    )
    console.log(res.data)
    return res.data
}

// const ID = shortid.generate()
const ID = 'tMuplHkCS'
const peer = new Peer(ID)

function App() {
    const [status, setStatus] = useState('wait connect')

    useEffect(() => {
        const onConnect = (conn: DataConnection) => {
            setStatus('connected')
            console.log('connected', conn.peer)
            conn.on('data', async (data: any) => {
                // Will print 'hi!'
                console.log(conn.peer, data)
                const res = await text2image(data)
                console.log(conn.peer, 'text2image', res)

                if ('images' in res) conn.send({ images: res.images })
                else conn.send(res)
            })
            conn.on('open', () => {
                conn.send('open!')
            })
        }
        const onError = (e: Error) => {
            setStatus('error')
            console.log(e)
            location.reload()
        }
        peer.on('connection', onConnect)
        peer.on('error', onError)
        return () => {
            console.log('off')
            peer.off('connection', onConnect)
            peer.off('error', onError)
        }
    }, [])
    return (
        <div>
            <div style={{ fontSize: 30 }}> {status}</div>
            <div style={{ fontSize: 50 }}> {ID}</div>
        </div>
    )
}
ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
    <React.StrictMode>
        <App />
    </React.StrictMode>
)
