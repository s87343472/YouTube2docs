import { vertex } from '@ai-sdk/google-vertex'
import { os } from '@orpc/server'
import { generateText } from 'ai'
import { z } from 'zod/v4'

const getVideoTranscriptWithGemini = os
	.input(z.object({ url: z.string() }))
	.handler(async ({ input }) => {
		const start = Date.now()

		const { url } = input

		const { text } = await generateText({
			model: vertex('gemini-2.5-flash-lite'),
			messages: [
				{
					role: 'user',
					content: [
						{
							type: 'text',
							text: 'Transcribe the following video.',
						},
						{
							type: 'file',
							data: url,
							mediaType: 'video/*',
						},
					],
				},
			],
		})

		return {
			text,
			end: Date.now() - start,
		}
	})

export default getVideoTranscriptWithGemini
