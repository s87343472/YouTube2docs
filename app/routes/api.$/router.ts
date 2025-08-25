import { os } from '@orpc/server'
import { z } from 'zod/v4'
import { $ } from 'zx'

const SubtitleFormatSchema = z.object({
	ext: z.string(),
	url: z.url(),
	name: z.string(),
})

const SubtitlesSchema = z.record(z.string(), z.array(SubtitleFormatSchema))

const YouTubeJSONSchema = z.object({
	title: z.string(),
	subtitles: SubtitlesSchema,
})

const getSubtitles = os
	.input(z.object({ url: z.string() }))
	.handler(async ({ input }) => {
		const { url } = input

		const output = await $`yt-dlp -O "%(.{title,subtitles})#j" ${url}`

		return YouTubeJSONSchema.parse(output.json())
	})

const router = {
	video: {
		subtitles: getSubtitles,
	},
}

export default router
