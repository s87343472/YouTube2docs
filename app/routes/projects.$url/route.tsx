import { Container, Select, Skeleton, Stack, Title } from '@mantine/core'
import { Suspense } from 'react'
import { Await } from 'react-router'
import * as R from 'remeda'
import orpc from '../api.$/orpc'
import { type Route } from './+types/route'

export const clientLoader = async ({ params }: Route.ClientLoaderArgs) => {
	const info = orpc.video.subtitles({ url: params.url })

	return { info }
}

const ProjectPage = ({ loaderData }: Route.ComponentProps) => {
	return (
		<Container className="w-full">
			<Suspense fallback={<Skeleton className="h-32 w-full" />}>
				<Await resolve={loaderData.info}>
					{(info) => (
						<Stack>
							<Title>{info.title}</Title>
							<Select
								label="Select subtitle format"
								data={R.pipe(
									info.subtitles,
									R.values(),
									R.flatMap(R.identity()),
									R.groupByProp('name'),
									R.mapValues((values) => values.map(({ ext }) => ext)),
									R.entries(),
									R.map(([group, items]) => ({ group, items })),
								)}
							/>
						</Stack>
					)}
				</Await>
			</Suspense>
		</Container>
	)
}

export default ProjectPage
