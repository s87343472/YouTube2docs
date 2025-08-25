import { RPCHandler } from '@orpc/server/fetch'
import { data } from 'react-router'
import { type Route } from './+types/route'
import router from './router'

const handler = new RPCHandler(router)

export const loader = async ({ request }: Route.LoaderArgs) => {
	const { response } = await handler.handle(request, {
		prefix: '/api',
	})

	return response ?? data('Not Found', { status: 404 })
}

export const action = loader
