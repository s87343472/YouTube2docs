import { Container, Image, Skeleton, Stack, Text, Title } from '@mantine/core'
import { Suspense } from 'react'
import { Await } from 'react-router'
import orpc from '../api.$/orpc'
import { type Route } from './+types/route'

export const clientLoader = async ({ params }: Route.ClientLoaderArgs) => {
	const info = orpc.video.info({ url: params.url })

	const audio = orpc.video.audio({ url: params.url })

	return { info, audio }
}

const ProjectPage = ({ loaderData }: Route.ComponentProps) => {
	return (
		<Container className="w-full">
			<Stack>
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
				<Suspense fallback={<Skeleton className="h-32 w-full" />}>
					<Await resolve={loaderData.audio}>
						{(audio) => <Text>{audio.text}</Text>}
					</Await>
				</Suspense>
			</Stack>
		</Container>
	)
}

export default ProjectPage
