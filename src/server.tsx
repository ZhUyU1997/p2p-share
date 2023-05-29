import React, { useEffect, useState } from 'react'
import ReactDOM from 'react-dom/client'
import { DataConnection, Peer } from 'peerjs'
import shortid from 'shortid'
import axios from 'axios'
import { Base64ToBlob, BlobToBase64, CompressImage } from './util'
import {
    ResponseToWebRTCRequestMessage,
    WebRTCRequestMessage,
    WebRTCRequestMessageToFetchRequest,
} from './message'

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
    images: string[]
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
                const message = data as WebRTCRequestMessage
                // Will print 'hi!'
                console.log(conn.peer, message.order, data)
                const u = new URL(message.request.url)

                // if(u.pathname == "/test.html")
                // {
                //     const response = new Response("hello", {
                //         headers: {
                //             "Content-Type" : "text/html"
                //         }
                //     })
                //     console.log(response)

                //     // const res = await response.text()
                //     // console.log(response, res)
                //     const webRTCResponse = await ResponseToWebRTCRequestMessage(
                //         message.order,
                //         response
                //     )
                //     console.log("webRTCResponse", webRTCResponse)
                //     conn.send(webRTCResponse)
                //     return
                // }

                if (!u.pathname.startsWith('/sdapi')) {
                    const request = WebRTCRequestMessageToFetchRequest(
                        message,
                        (url) => {
                            const u = new URL(url)
                            u.protocol = location.protocol
                            u.host = location.host
                            return u.href
                        }
                    )
                    const response = await fetch(request)
                    console.log(response)

                    // const res = await response.text()
                    // console.log(response, res)
                    const webRTCResponse = await ResponseToWebRTCRequestMessage(
                        message.order,
                        response
                    )
                    conn.send(webRTCResponse)
                    return
                }
                const request = WebRTCRequestMessageToFetchRequest(
                    message,
                    (url) => {
                        const u = new URL(url)
                        //http://127.0.0.1:7860/sdapi/v1/txt2img
                        u.protocol = 'http'
                        u.host = '127.0.0.1:7860'
                        return u.href
                    }
                )
                const response = await fetch(request)
                console.log(response)

                // const res = await response.text()
                // console.log(response, res)
                const webRTCResponse = await ResponseToWebRTCRequestMessage(
                    message.order,
                    response
                )
                conn.send(webRTCResponse)

                // const res = await text2image({})
                // console.log(conn.peer, 'text2image', res)

                // if ('images' in res) {
                //     const images = await Promise.all(
                //         res.images.map(async (i) => {
                //             const blob = await Base64ToBlob(i)
                //             const image = await CompressImage(blob)
                //             return await BlobToBase64(image)
                //         })
                //     )
                //     conn.send({ images })
                // } else conn.send(res)
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
        console.log('on')

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
