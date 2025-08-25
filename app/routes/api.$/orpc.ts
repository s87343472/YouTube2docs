import { createORPCClient } from '@orpc/client'
import { RPCLink } from '@orpc/client/fetch'
import { type RouterClient } from '@orpc/server'
import type router from './router'

const link = new RPCLink({
	url: 'http://localhost:5173/api',
})

const orpc: RouterClient<typeof router> = createORPCClient(link)

export default orpc
