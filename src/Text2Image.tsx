import { useEffect, useState } from 'react'
import { atom, useAtom } from 'jotai'
import shortid from 'shortid'
import filetype from 'magic-bytes.js'
import { Button } from 'antd'
import { Input } from 'antd'
import VLayout from './VLayout'
import HLayout from './HLayout'
import { Image } from 'antd'
import { Typography } from 'antd'
import { Col, InputNumber, Row, Slider } from 'antd'
import { PeerConnection } from './peer'
import { GetServerID } from './util'
import { message } from 'antd'

const { Title } = Typography

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

const IntegerStep: React.FC<{
    defaultValue?: number
    range: [number, number]
    onChange?: (value: number) => void
}> = ({ defaultValue = 15, range, onChange }) => {
    const [inputValue, setInputValue] = useState(defaultValue)

    const _onChange = (newValue: number | null) => {
        if (newValue !== null) {
            onChange?.(newValue)
            setInputValue(newValue)
        }
    }

    return (
        <Row style={{ width: '100%', marginTop: 10, marginBottom: 10 }}>
            <Col span={10}>
                <Slider
                    min={range[0]}
                    max={range[1]}
                    onChange={_onChange}
                    value={typeof inputValue === 'number' ? inputValue : 0}
                />
            </Col>
            <Col span={2}>
                <InputNumber
                    min={1}
                    max={20}
                    style={{ margin: '0 16px' }}
                    value={inputValue}
                    onChange={_onChange}
                />
            </Col>
        </Row>
    )
}

export const Text2Image: React.FC<{
    ID: string
}> = ({ ID }) => {
    const [status, setStatus] = useState<'ready' | 'wait'>('ready')

    const [imageUrl, setImageUrl] = useState('')
    const [prompt, setPrompt] = useState(
        '1girl, (8k, RAW photo, best quality, masterpiece:1.2), (realistic, photo-realistic:1.37), solo,ultra-detailed'
    )
    const [negativePrompt, setNegativePrompt] = useState(
        'watermark, text, error, blurry, jpeg artifacts, cropped, worst quality, low quality, normal quality, jpeg artifacts, signature, watermark, username, artist name, (worst quality, low quality:1.4), ((bad anatomy)), watermark, signature, text, logo, contact, ((extra limbs)),badhandv4, nude, NSFW, nsfw'
    )

    const [steps, setSteps] = useState<number>(15)
    const [width, setWidth] = useState<number>(512)
    const [height, setHeight] = useState<number>(512)

    const onRequest = async (payload: any) => {
        return new Promise<string>((resolve, reject) => {
            const id = setTimeout(() => {
                reject('timeout')
            }, 30 * 1000)
            console.log('send', payload)
            PeerConnection.sendConnection(GetServerID(), payload)
            PeerConnection.onConnectionOnceReceiveData<Text2ImageResponse>(
                GetServerID(),
                (res) => {
                    console.log('response', res)
                    resolve(res.images[0])
                }
            )
        })
    }

    return (
        <VLayout
            style={{
                width: '100vw',
                height: '100vh',
                justifyContent: 'flex-start',
                // alignItems: "flex-start",
                padding: 10,
                boxSizing: 'border-box',
            }}
        >
            <VLayout
                style={{
                    width: '100%',
                    justifyContent: 'flex-start',
                    alignItems: 'flex-start',
                }}
            >
                <HLayout
                    style={{
                        marginRight: 10,
                        alignSelf: 'end',
                    }}
                >
                    <Title
                        level={4}
                        style={{
                            margin: 10,
                        }}
                    >
                        {ID}
                    </Title>

                    <Button
                        type="primary"
                        shape="round"
                        loading={status == 'wait'}
                        onClick={async () => {
                            setStatus('wait')
                            try {
                                const url = await onRequest({
                                    prompt,
                                    negative_prompt: negativePrompt,
                                    steps,
                                    width,
                                    height,
                                })
                                setStatus('ready')
                                setImageUrl(url)
                            } catch (error) {
                                console.log(error)
                                message.error('timeout')
                                setStatus('ready')
                            }
                        }}
                    >
                        生成
                    </Button>
                </HLayout>

                <Title level={4}>提示词</Title>
                <Input.TextArea
                    rows={4}
                    defaultValue={prompt}
                    onChange={(e) => {
                        setPrompt(e.target.value)
                    }}
                />
                <Title level={4}>负面提示词</Title>

                <Input.TextArea
                    rows={4}
                    defaultValue={negativePrompt}
                    onChange={(e) => {
                        setNegativePrompt(e.target.value)
                    }}
                />
                <Title level={4}>Step</Title>
                <IntegerStep
                    defaultValue={steps}
                    range={[10, 40]}
                    onChange={setSteps}
                />
                <Title level={4}>Width</Title>
                <IntegerStep
                    defaultValue={width}
                    range={[512, 1000]}
                    onChange={setWidth}
                />
                <Title level={4}>Height</Title>
                <IntegerStep
                    defaultValue={height}
                    range={[512, 1000]}
                    onChange={setHeight}
                />
            </VLayout>
            <Image
                width={400}
                src={imageUrl}
                style={{
                    backgroundColor: 'gray',
                    width: 400,
                    minHeight: 400,
                    objectFit: 'contain',
                }}
            />
        </VLayout>
    )
}

export default Text2Image
