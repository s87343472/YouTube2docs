import { Container, Image, Skeleton, Stack, Text, Title } from '@mantine/core'
import { Suspense } from 'react'
import { Await } from 'react-router'
import orpc from '../api.$/orpc'
import { type Route } from './+types/route'

export const clientLoader = async ({ params }: Route.ClientLoaderArgs) => {
	const info = orpc.video.info({ url: params.url })

	await orpc.video.audio({ url: params.url })

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
							<Image src={info.thumbnail} />
							<Text>duration:{info.duration}</Text>
						</Stack>
					)}
				</Await>
			</Suspense>
		</Container>
	)
}

export default ProjectPage
