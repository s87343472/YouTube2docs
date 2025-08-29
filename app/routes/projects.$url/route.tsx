import { Code, Container, Skeleton, Stack, Text } from '@mantine/core'
import { Suspense } from 'react'
import { Await } from 'react-router'
import orpc from '../api.$/orpc'
import { type Route } from './+types/route'

export const clientLoader = async ({ params }: Route.ClientLoaderArgs) => {
	const transcript = orpc.video.transcript({ url: params.url })

	return { transcript }
}

const ProjectPage = ({ loaderData }: Route.ComponentProps) => {
	return (
		<Container className="w-full">
			<Stack>
				<Suspense fallback={<Skeleton className="h-32 w-full" />}>
					<Await resolve={loaderData.transcript}>
						{(transcript) => (
							<Stack>
								<Text>{transcript.text}</Text>
								<Code block>{JSON.stringify(transcript.result, null, 2)}</Code>
							</Stack>
						)}
					</Await>
				</Suspense>
			</Stack>
		</Container>
	)
}

export default ProjectPage
