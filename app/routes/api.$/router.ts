import { os } from '@orpc/server'
import { z } from 'zod/v4'
import { $, tempdir } from 'zx'

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

const tempDirPath = tempdir()

const getVideoAudio = os
	.input(z.object({ url: z.string() }))
	.handler(async ({ input }) => {
		const { url } = input

		const output =
			await $`yt-dlp -P ${tempDirPath} -x --audio-format mp3 -O filename ${url}`

		const filePath = output.stdout

		return { filePath }
	})

const router = {
	video: {
		info: getVideoInfo,
		audio: getVideoAudio,
	},
}

export default router
