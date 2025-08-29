import { os } from '@orpc/server'
import { execa } from 'execa'
import { z } from 'zod/v4'

const VideoInfoSchema = z.object({
	title: z.string(),
	duration: z.number(),
	thumbnail: z.url(),
})

const getVideoInfo = os
	.input(z.object({ url: z.string() }))
	.handler(async ({ input }) => {
		const { url } = input

		const output =
			await execa`yt-dlp -O "%(.{title,duration,thumbnail})#j" ${url}`

		return VideoInfoSchema.parse(JSON.parse(output.stdout))
	})

export default getVideoInfo
