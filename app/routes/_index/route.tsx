import { Button, Code, Container, Stack, TextInput } from '@mantine/core'
import { useFetcher } from 'react-router'

const HomePage = () => {
	const fetcher = useFetcher()

	return (
		<Container className="flex-1" size="xs">
			<fetcher.Form method="POST" action="/api">
				<Stack>
					{fetcher.data && (
						<Code block>{JSON.stringify(fetcher.data, null, 2)}</Code>
					)}
					<TextInput
						type="url"
						label="URL"
						name="url"
						placeholder="Enter URL"
						defaultValue="https://www.youtube.com/watch?v=Bry8a_7b9aM"
					/>
					<Button type="submit" loading={fetcher.state !== 'idle'}>
						Submit
					</Button>
				</Stack>
			</fetcher.Form>
		</Container>
	)
}

export default HomePage
