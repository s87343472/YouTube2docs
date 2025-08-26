import { Code, Container, Skeleton, Stack, Text } from '@mantine/core'
import { Suspense } from 'react'
import { Await } from 'react-router'
import orpc from '../api.$/orpc'
import { type Route } from './+types/route'

export const clientLoader = async ({ params }: Route.ClientLoaderArgs) => {
	const audio = orpc.video.audio({ url: params.url })

	return { audio }
}

const ProjectPage = ({ loaderData }: Route.ComponentProps) => {
	return (
		<Container className="w-full">
			<Stack>
				<Suspense fallback={<Skeleton className="h-32 w-full" />}>
					<Await resolve={loaderData.audio}>
						{(audio) => (
							<Stack>
								<Text>{audio.text}</Text>
								<Code block>{JSON.stringify(audio.result, null, 2)}</Code>
							</Stack>
						)}
					</Await>
				</Suspense>
			</Stack>
		</Container>
	)
}

export default ProjectPage
