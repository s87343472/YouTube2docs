import { createVertex } from '@ai-sdk/google-vertex'
import { os } from '@orpc/server'
import { generateText } from 'ai'
import { EnvHttpProxyAgent, setGlobalDispatcher } from 'undici'
import { z } from 'zod/v4'
import { $, tempdir, fs } from 'zx'

if (import.meta.env.DEV) {
	const envHttpProxyAgent = new EnvHttpProxyAgent()

	setGlobalDispatcher(envHttpProxyAgent)
}

const vertex = createVertex({
	project: 'ai-manga-translator',
	location: 'us-east4',
})

const VideoInfoSchema = z.object({
	title: z.string(),
	duration: z.number(),
	thumbnail: z.url(),
})

const getVideoInfo = os
	.input(z.object({ url: z.string() }))
	.handler(async ({ input }) => {
		const { url } = input

		const output = await $`yt-dlp -O "%(.{title,duration,thumbnail})#j" ${url}`

		return VideoInfoSchema.parse(output.json())
	})

const getVideoAudio = os
	.input(z.object({ url: z.string() }))
	.handler(async ({ input }) => {
		const { url } = input

		const tempDirPath = tempdir()

		const output =
			await $`yt-dlp -x -P ${tempDirPath} --restrict-filenames --audio-format mp3 --print after_move:filepath ${url}`

		const filePath = output.valueOf()

		try {
			const { text } = await generateText({
				model: vertex('gemini-2.5-flash-lite'),
				messages: [
					{
						role: 'user',
						content: [
							{
								type: 'text',
								text: `You are an expert audio transcriptionist. Your task is to convert spoken audio content into accurate written text.

**Instructions:**
1. Listen carefully to the provided audio file
2. Transcribe all spoken words verbatim, including:
   - All dialogue and monologue
   - Speaker identification when multiple speakers are present
   - Filler words (um, uh, etc.) if requested
3. Format the transcription clearly with proper punctuation and paragraph breaks
4. Note any unclear or inaudible sections as [inaudible] or [unclear]

**Output Format:**
- Use standard punctuation and capitalization
- Separate different speakers with "Speaker 1:", "Speaker 2:", etc., or use actual names if known
- Include timestamps every 30 seconds in brackets [00:30], [01:00], etc.
- Place any background sounds or non-verbal audio in brackets [music playing], [door closes], etc.

**Additional Requirements:**
- Maintain the original meaning and tone
- Do not correct grammar unless specifically requested
- If technical terms or proper nouns are unclear, make your best approximation and mark with [?]
- Specify the total duration of the audio file

Please provide the audio file you would like transcribed, and specify any particular formatting preferences or special requirements for this transcription.`,
							},
							{
								type: 'file',
								data: fs.readFileSync(filePath),
								mediaType: 'audio/mpeg',
							},
						],
					},
				],
			})

			return {
				text,
			}
		} catch (error) {
			console.error({ error })
		} finally {
			await fs.remove(tempDirPath)
		}
	})

const router = {
	video: {
		info: getVideoInfo,
		audio: getVideoAudio,
	},
}

export default router
