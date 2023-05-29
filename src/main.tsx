import shortid from 'shortid'
import { Workbox, WorkboxLifecycleWaitingEvent } from 'workbox-window'
import { GetServerID } from './util'
import { PeerConnection } from './peer'
import {
    ServiceWorkerRequestMessage,
    ServiceWorkerToWebRTCRequestMessage,
    WebRTCResponseMessage,
    WebRTCToServiceWorkerResponseMessage,
} from './message'

const ID = shortid.generate()
const ServerID = GetServerID()

const button = document.createElement('button')
button.innerText = 'init'
document.body.appendChild(button)

function GetBindUrl(href: string, ID: string) {
    const url = new URL(href)
    url.pathname = '/p2p-share/webrtc/bind'
    url.searchParams.set('ClientID', ID)
    return url
}

async function CreateIFrame() {
    console.log('create iframe')
    const iframe = document.createElement('iframe')

    const url = new URL(window.location.href)
    url.pathname = '/p2p-share/webrtc/p2p-share/test.html'
    url.searchParams.set('ClientID', ID)
    iframe.src = url.href
    document.body.appendChild(iframe)

    console.log('iframe', url.href)
}

const orderMapping: Record<number, (data: any) => void> = {}

async function CreateWebRTC(wb: Workbox) {
    await PeerConnection.startPeerSession(ID)
    await PeerConnection.connectPeer(ServerID)
    // await wb.messageSW({ type: 'CREATE_WEBRTC', id: ID })
    const messageChannel = new MessageChannel()
    navigator.serviceWorker.controller?.postMessage(
        {
            type: 'CREATE_WEBRTC',
            clientID: ID,
            serverID: ServerID,
        },
        [messageChannel.port2]
    )

    const postMessageToServiceWorker = (
        message: any,
        options?: StructuredSerializeOptions
    ) => {
        navigator.serviceWorker.controller?.postMessage(message, options)
    }

    //Listen to messages
    messageChannel.port1.onmessage = (event) => {
        console.log('sendConnection', event.data)
        const serviceWorkerMessage = event.data as ServiceWorkerRequestMessage

        const message =
            ServiceWorkerToWebRTCRequestMessage(serviceWorkerMessage)
        PeerConnection.sendConnection(ServerID, message)
        console.log(message)
        orderMapping[message.order] = (data: any) => {
            const webRTCResponseMessage = data as WebRTCResponseMessage
            const serviceWorkerResponseMessage =
                WebRTCToServiceWorkerResponseMessage(webRTCResponseMessage)
            const body = serviceWorkerResponseMessage.response.body
            postMessageToServiceWorker(
                {
                    type: 'RESPONSE',
                    payload: serviceWorkerResponseMessage,
                },
                {
                    transfer: body && typeof body !== 'string' ? [body] : [],
                }
            )
        }
        // Process message
    }

    PeerConnection.onConnectionReceiveData(ServerID, (data: any) => {
        console.log('onConnectionReceiveData', data)
        orderMapping[data.order]?.(data)
    })
    const url = GetBindUrl(window.location.href, ID)

    console.log(url.href)
    const res = await fetch(url.href)
    const text = await res.text()
    console.log('Bind result:', text)

    CreateIFrame()
}

if ('serviceWorker' in navigator) {
    const wb = new Workbox('/p2p-share/sw.js', {
        scope: '/p2p-share/',
    })
    let registration

    const showSkipWaitingPrompt = async (
        event: WorkboxLifecycleWaitingEvent
    ) => {
        // Assuming the user accepted the update, set up a listener
        // that will reload the page as soon as the previously waiting
        // service worker has taken control.
        wb.addEventListener('controlling', () => {
            // At this point, reloading will ensure that the current
            // tab is loaded under the control of the new service worker.
            // Depending on your web app, you may want to auto-save or
            // persist transient state before triggering the reload.
            window.location.reload()
        })

        // When `event.wasWaitingBeforeRegister` is true, a previously
        // updated service worker is still waiting.
        // You may want to customize the UI prompt accordingly.

        // This code assumes your app has a promptForUpdate() method,
        // which returns true if the user wants to update.
        // Implementing this is app-specific; some examples are:
        // https://open-ui.org/components/alert.research or
        // https://open-ui.org/components/toast.research
        button.innerText = 'update'
        button.addEventListener('click', () => {
            wb.messageSkipWaiting()
        })
    }

    // Add an event listener to detect when the registered
    // service worker has installed but is waiting to activate.
    wb.addEventListener('waiting', (event) => {
        showSkipWaitingPrompt(event)
    })

    wb.register()

    CreateWebRTC(wb)
}
