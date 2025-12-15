import SimplebarClient from '@/components/client-wrapper/SimplebarClient'
import Image from 'next/image'
import { Card, CardFooter, CardHeader, CardTitle, FormControl } from 'react-bootstrap'
import { LuMessageSquare } from 'react-icons/lu'
import { TbClock, TbSend2 } from 'react-icons/tb'
import { chatData } from '../data'
import { ChatMessageType } from '../types'
import Link from 'next/link'

const Chat = () => {
    return (
        <Card>
            <CardHeader>
                <CardTitle as='h4'>Chat</CardTitle>
            </CardHeader>
            <SimplebarClient className="card-body py-0" style={{ height: 380 }} id="chat-container" data-simplebar>
                {chatData.map((chat: ChatMessageType, index: number) => (
                    <div
                        key={index}
                        className={`d-flex align-items-start gap-2 my-3 chat-item ${chat.type === "outgoing"
                            ? "text-end justify-content-end"
                            : ""
                            }`}
                    >
                        {chat.type === "incoming" && (
                            <Image
                                src={chat.avatar}
                                className="avatar-md rounded-circle"
                                alt={chat.user}
                            />
                        )}

                        <div>
                            <div
                                className={`chat-message py-2 px-3 rounded ${chat.type === "outgoing"
                                    ? "bg-info-subtle"
                                    : "bg-warning-subtle"
                                    }`}
                            >
                                {chat.message}
                            </div>
                            <div className="text-muted fs-xs mt-1">
                                <TbClock /> {chat.time}
                            </div>
                        </div>

                        {chat.type === "outgoing" && (
                            <Image
                                src={chat.avatar}
                                className="avatar-md rounded-circle"
                                alt={chat.user}
                            />
                        )}
                    </div>
                ))}
            </SimplebarClient>
            <CardFooter className="bg-body-secondary border-top border-dashed border-bottom-0">
                <div className="d-flex gap-2">
                    <div className="app-search flex-grow-1">
                        <FormControl type="text" className="bg-light-subtle border-light" placeholder="Enter message..." />
                        <LuMessageSquare className="app-search-icon text-muted" />
                    </div>
                    <Link href="" className="btn btn-primary btn-icon"><TbSend2 className="fs-xl" /></Link>
                </div>
            </CardFooter>
        </Card>
    )
}

export default Chat